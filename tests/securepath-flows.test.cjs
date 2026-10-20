'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'securepath-flows.js'), 'utf8');
const context = {};
context.globalThis = context;
vm.runInNewContext(source, context, { filename: 'securepath-flows.js' });
const flows = context.SecurePathFlows;

test('verified Cloudinary documents are checked against the configured cloud account', async () => {
  const { isApprovedCloudinaryDocumentUrl } = await import('../workers/securepath-api/src/document-utils.js');
  assert.equal(isApprovedCloudinaryDocumentUrl('https://res.cloudinary.com/securepath/raw/upload/doc.pdf', 'securepath'), true);
  assert.equal(isApprovedCloudinaryDocumentUrl('https://res.cloudinary.com/attacker/raw/upload/doc.pdf', 'securepath'), false);
  assert.equal(isApprovedCloudinaryDocumentUrl('https://example.com/doc.pdf', 'securepath'), false);
  assert.equal(isApprovedCloudinaryDocumentUrl('https://res.cloudinary.com/securepath/raw/upload/doc.pdf', ''), false);
});

async function makeDocumentRewardFixture(document, clientOverrides) {
  const { handleDocumentVerifiedReward } = await import('../workers/securepath-api/src/document-rewards.js');
  const state = {
    document,
    client: Object.assign({ insuraPoints: 0, insuraPointsLifetime: 0 }, clientOverrides || {}),
    claims: new Map(),
    issues: 0
  };
  const deps = {
    isAdminUser: async () => true,
    getDoc: async (_env, collection, id) => {
      if (collection === 'documents' && id === document.id) return state.document;
      if (collection === 'clients' && id === document.clientId) return state.client;
      if (collection === 'documentRewardClaims') return state.claims.get(id) || null;
      return null;
    },
    todayKey: () => '2026-10-20',
    maxDocsPerDay: 3,
    documentPoints: 10,
    makeCreateWrite: (collection, id, fields) => ({ collection, id, fields }),
    issuePoints: async (_env, clientId, client, points, category, descriptionAr, descriptionEn, changedFields, extraWrites) => {
      const claim = extraWrites[0];
      assert.equal(claim.collection, 'documentRewardClaims');
      if (state.claims.has(claim.id)) throw new Error('claim already exists');
      state.claims.set(claim.id, claim.fields);
      state.client = Object.assign({}, client, changedFields, {
        insuraPoints: Number(client.insuraPoints || 0) + points,
        insuraPointsLifetime: Number(client.insuraPointsLifetime || 0) + points
      });
      state.issues++;
      return { ok: true, points, category, descriptionAr, descriptionEn, clientId };
    }
  };
  return { state, deps, handleDocumentVerifiedReward };
}

test('admin approval awards document points once and a retry is idempotent', async () => {
  const fixture = await makeDocumentRewardFixture({
    id: 'doc-1', clientId: 'client-1', verificationStatus: 'approved', storageMode: 'cloudinary',
    downloadURL: 'https://res.cloudinary.com/securepath/raw/upload/doc.pdf'
  });
  const first = await fixture.handleDocumentVerifiedReward(
    { CLOUDINARY_CLOUD_NAME: 'securepath' }, 'admin-1', { docId: 'doc-1' }, { securepathAdmin: true }, fixture.deps
  );
  const retry = await fixture.handleDocumentVerifiedReward(
    { CLOUDINARY_CLOUD_NAME: 'securepath' }, 'admin-1', { docId: 'doc-1' }, { securepathAdmin: true }, fixture.deps
  );

  assert.equal(first.points, 10);
  assert.equal(retry.reason, 'already_awarded');
  assert.equal(fixture.state.issues, 1);
  assert.equal(fixture.state.client.insuraPoints, 10);
});

test('legacy admin PDF data URLs remain eligible after approval', async () => {
  const fixture = await makeDocumentRewardFixture({
    id: 'legacy-doc', clientId: 'client-1', verificationStatus: 'verified', storageMode: 'firestore-dataUrl',
    dataUrl: 'data:application/pdf;base64,JVBERi0x'
  });
  const result = await fixture.handleDocumentVerifiedReward(
    { CLOUDINARY_CLOUD_NAME: 'securepath' }, 'admin-1', { docId: 'legacy-doc' }, { securepathAdmin: true }, fixture.deps
  );
  assert.equal(result.points, 10);
});

test('unapproved document URLs and the daily cap do not issue points', async () => {
  const invalid = await makeDocumentRewardFixture({
    id: 'doc-bad', clientId: 'client-1', verificationStatus: 'approved', storageMode: 'cloudinary',
    downloadURL: 'https://res.cloudinary.com/other-cloud/raw/upload/doc.pdf'
  });
  await assert.rejects(invalid.handleDocumentVerifiedReward(
    { CLOUDINARY_CLOUD_NAME: 'securepath' }, 'admin-1', { docId: 'doc-bad' }, { securepathAdmin: true }, invalid.deps
  ), /storage is not approved/);
  assert.equal(invalid.state.issues, 0);

  const capped = await makeDocumentRewardFixture({
    id: 'doc-cap', clientId: 'client-1', verificationStatus: 'approved', storageMode: 'cloudinary',
    downloadURL: 'https://res.cloudinary.com/securepath/raw/upload/doc.pdf'
  }, { pointsFlags: { docUploadAwardDate: '2026-10-20', docUploadAwardCount: 3 } });
  const result = await capped.handleDocumentVerifiedReward(
    { CLOUDINARY_CLOUD_NAME: 'securepath' }, 'admin-1', { docId: 'doc-cap' }, { securepathAdmin: true }, capped.deps
  );
  assert.equal(result.reason, 'daily_cap');
  assert.equal(capped.state.issues, 0);
});

test('document approval remains complete when the separate points request fails', async () => {
  const calls = [];
  const document = { verificationStatus: 'pending', pointsRewardStatus: 'pending' };
  const outcome = await flows.approveThenReward(
    async () => { calls.push('approve'); document.verificationStatus = 'approved'; },
    async () => { calls.push('reward'); throw new Error('Worker unavailable'); },
    async () => { calls.push('refresh'); assert.equal(document.verificationStatus, 'approved'); }
  );

  assert.deepEqual(calls, ['approve', 'reward', 'refresh']);
  assert.equal(outcome.approved, true);
  assert.equal(outcome.rewarded, false);
  assert.match(outcome.rewardError.message, /Worker unavailable/);
});

test('assessment points are requested only after the assessment save resolves', async () => {
  const calls = [];
  const outcome = await flows.saveThenReward(
    async () => { calls.push('save-start'); await Promise.resolve(); calls.push('save-done'); return { id: 'assessment-1' }; },
    async () => { calls.push('reward'); return { ok: true, points: 30 }; },
    async saved => { calls.push('render'); assert.equal(saved.id, 'assessment-1'); }
  );

  assert.deepEqual(calls, ['save-start', 'save-done', 'render', 'reward']);
  assert.equal(outcome.saved, true);
  assert.equal(outcome.rewarded, true);
});

test('a failed assessment reward is returned as pending without undoing the saved result', async () => {
  const outcome = await flows.saveThenReward(
    async () => 'saved',
    async () => { throw new Error('offline'); }
  );
  assert.equal(outcome.saved, true);
  assert.equal(outcome.rewarded, false);
  assert.equal(outcome.value, 'saved');
});

test('blocked redemption popup falls back to opening the form in the current tab', async () => {
  const calls = [];
  const outcome = await flows.redeemThenOpenForm(
    () => { calls.push('open-popup'); return null; },
    async () => { calls.push('redeem'); return { pointsUsed: 100, discountPercent: 1 }; },
    result => 'https://forms.example/discount?points=' + result.pointsUsed,
    async url => { calls.push('fallback'); calls.push(url); }
  );

  assert.deepEqual(calls, [
    'open-popup', 'redeem', 'fallback',
    'https://forms.example/discount?points=100'
  ]);
  assert.equal(outcome.popupOpened, false);
});

test('redemption popup is opened before the request and navigated after success', async () => {
  const calls = [];
  const popup = { closed: false, location: {}, close() { this.closed = true; } };
  const outcome = await flows.redeemThenOpenForm(
    () => { calls.push('open-popup'); return popup; },
    async () => { calls.push('redeem'); return { pointsUsed: 200 }; },
    result => 'https://forms.example/discount?points=' + result.pointsUsed,
    () => { throw new Error('fallback should not run'); }
  );
  assert.deepEqual(calls, ['open-popup', 'redeem']);
  assert.equal(popup.opener, null);
  assert.equal(popup.location.href, 'https://forms.example/discount?points=200');
  assert.equal(outcome.popupOpened, true);
});

test('failed redemption closes the reserved blank tab', async () => {
  const popup = { closed: false, close() { this.closed = true; } };
  await assert.rejects(
    flows.redeemThenOpenForm(() => popup, async () => { throw new Error('not enough points'); }, () => ''),
    /not enough points/
  );
  assert.equal(popup.closed, true);
});
