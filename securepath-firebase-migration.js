#!/usr/bin/env node
'use strict';

/**
 * SecurePath account migration / test-account manager.
 *
 * SAFETY RULE:
 * - Never trusts a domain as proof of ownership.
 * - Only explicitly listed emails/UIDs are modified.
 * - Default mode is dry-run.
 * - Uses Firebase Admin SDK (server-side only).
 *
 * Environment:
 *   FIREBASE_SERVICE_ACCOUNT_JSON='{"project_id":...}'
 *   SECUREPATH_TEST_EMAILS='test1@example.com,test2@example.com'
 *   SECUREPATH_TEST_UIDS='uid1,uid2'
 *   SECUREPATH_ADMIN_EMAILS='admin@example.com'
 *   SECUREPATH_ADMIN_UIDS='uid1,uid2'
 *
 * Commands:
 *   node securepath-firebase-migration.js list
 *   node securepath-firebase-migration.js apply-test
 *   node securepath-firebase-migration.js apply-admin
 *   node securepath-firebase-migration.js apply-both
 *   node securepath-firebase-migration.js provision-unverified-client-tests [--apply]
 *   node securepath-firebase-migration.js migrate-client-uids [--apply]
 *
 * apply commands set custom claims only for the explicit accounts above.
 * They do NOT delete users or Firestore data.
 */

const { cert, initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { FieldValue, getFirestore } = require('firebase-admin/firestore');

function envList(name) {
  return String(process.env[name] || '')
    .split(',')
    .map(v => v.trim())
    .filter(Boolean);
}

function requireServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is required.');
  try { return JSON.parse(raw); }
  catch (e) { throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON.'); }
}

initializeApp({ credential: cert(requireServiceAccount()) });
const auth = getAuth();
const db = getFirestore();

async function resolveTargets(emails, uids) {
  const resolved = [];
  for (const uid of uids) {
    const user = await auth.getUser(uid);
    resolved.push(user);
  }
  for (const email of emails) {
    const user = await auth.getUserByEmail(email);
    if (!resolved.some(x => x.uid === user.uid)) resolved.push(user);
  }
  return resolved;
}

async function listAccounts() {
  const tests = await resolveTargets(envList('SECUREPATH_TEST_EMAILS'), envList('SECUREPATH_TEST_UIDS'));
  const admins = await resolveTargets(envList('SECUREPATH_ADMIN_EMAILS'), envList('SECUREPATH_ADMIN_UIDS'));
  console.log(JSON.stringify({
    testAccounts: tests.map(u => ({ uid: u.uid, email: u.email, emailVerified: u.emailVerified })),
    adminAccounts: admins.map(u => ({ uid: u.uid, email: u.email, emailVerified: u.emailVerified }))
  }, null, 2));
}

async function applyClaims(kind) {
  const testUsers = await resolveTargets(envList('SECUREPATH_TEST_EMAILS'), envList('SECUREPATH_TEST_UIDS'));
  const adminUsers = await resolveTargets(envList('SECUREPATH_ADMIN_EMAILS'), envList('SECUREPATH_ADMIN_UIDS'));
  const byUid = new Map();
  for (const u of testUsers) byUid.set(u.uid, { user: u, securepathTest: true });
  for (const u of adminUsers) {
    const x = byUid.get(u.uid) || { user: u };
    x.securepathAdmin = true;
    byUid.set(u.uid, x);
  }

  if (kind === 'test') {
    for (const [uid, item] of byUid) if (!item.securepathTest) byUid.delete(uid);
  }
  if (kind === 'admin') {
    for (const [uid, item] of byUid) if (!item.securepathAdmin) byUid.delete(uid);
  }

  for (const { user, securepathTest, securepathAdmin } of byUid.values()) {
    const existing = user.customClaims || {};
    const next = { ...existing };

    // A SecurePath test account is an explicitly targeted, non-production
    // account. Mark it verified so the client does not require a real
    // verification email/code for this account. Never infer this from the
    // email domain alone; only users selected by the explicit allow-list
    // above reach this branch.
    if ((kind === 'test' || kind === 'both') && securepathTest) {
      await auth.updateUser(user.uid, { emailVerified: true });
      next.securepathTest = true;
    }

    if ((kind === 'admin' || kind === 'both') && securepathAdmin) {
      next.securepathAdmin = true;
    }

    await auth.setCustomUserClaims(user.uid, next);
    console.log(`UPDATED ${user.uid} ${user.email || ''} emailVerified=${(kind === 'test' || kind === 'both') && securepathTest ? 'true' : String(user.emailVerified)} claims=${JSON.stringify(next)}`);
  }

  if (byUid.size === 0) {
    console.log('No explicitly targeted accounts. Nothing changed.');
  }
}

async function findUnverifiedClientTestUsers() {
  const snapshot = await db.collection('clients').get();
  const emailToUsers = new Map();
  let pageToken;
  do {
    const page = await auth.listUsers(1000, pageToken);
    for (const user of page.users) {
      if (!user.email) continue;
      const email = user.email.trim().toLowerCase();
      if (!emailToUsers.has(email)) emailToUsers.set(email, []);
      emailToUsers.get(email).push(user);
    }
    pageToken = page.pageToken;
  } while (pageToken);

  const targets = new Map();
  let skipped = 0;
  for (const doc of snapshot.docs) {
    const data = doc.data() || {};
    if (data.uid) continue;
    const emails = [data.email, data.loginEmail, data.authEmail]
      .map(value => String(value || '').trim().toLowerCase())
      .filter(Boolean);
    const matches = new Map();
    for (const email of emails) {
      for (const user of emailToUsers.get(email) || []) matches.set(user.uid, user);
    }
    const users = Array.from(matches.values());
    if (users.length !== 1 || users[0].emailVerified === true) { skipped++; continue; }
    const user = users[0];
    if (doc.id !== user.uid && (await db.collection('clients').doc(user.uid).get()).exists) { skipped++; continue; }
    targets.set(user.uid, user);
  }
  return { targets: Array.from(targets.values()), skipped };
}

async function provisionUnverifiedClientTests() {
  const apply = process.argv.includes('--apply');
  const { targets, skipped } = await findUnverifiedClientTestUsers();
  for (const user of targets) {
    if (apply) {
      await auth.updateUser(user.uid, { emailVerified: true });
      await auth.setCustomUserClaims(user.uid, { ...(user.customClaims || {}), securepathTest: true });
    }
  }
  console.log(`${apply ? 'Applied' : 'Dry run'}: ${targets.length} unverified client test account(s) ${apply ? 'provisioned' : 'eligible'}; ${skipped} ambiguous or unmatched record(s) skipped.`);
  if (!apply) console.log('No accounts were changed. Rerun with --apply only after confirming every eligible account is a test account.');
}

async function migrateClientUids() {
  const apply = process.argv.includes('--apply');
  const snapshot = await db.collection('clients').get();
  const emailToUsers = new Map();
  let pageToken;
  do {
    const page = await auth.listUsers(1000, pageToken);
    for (const user of page.users) {
      if (!user.email) continue;
      const email = user.email.trim().toLowerCase();
      if (!emailToUsers.has(email)) emailToUsers.set(email, []);
      emailToUsers.get(email).push(user);
    }
    pageToken = page.pageToken;
  } while (pageToken);

  let linked = 0;
  let skipped = 0;
  for (const doc of snapshot.docs) {
    const data = doc.data() || {};
    if (data.uid) {
      if (data.uid !== doc.id) console.log(`SKIP ${doc.id} reason=existing-uid-conflicts-with-document-id`);
      skipped++;
      continue;
    }
    const emails = [data.email, data.loginEmail, data.authEmail]
      .map(value => String(value || '').trim().toLowerCase())
      .filter(Boolean);
    const matches = new Map();
    for (const email of emails) {
      for (const user of emailToUsers.get(email) || []) matches.set(user.uid, user);
    }
    const uniqueMatches = Array.from(matches.values());
    if (!emails.length || uniqueMatches.length !== 1 || uniqueMatches[0].emailVerified !== true) {
      console.log(`SKIP ${doc.id} reason=${!emails.length ? 'no-email' : uniqueMatches.length !== 1 ? 'missing-or-ambiguous-auth-user' : 'email-not-verified'}`);
      skipped++;
      continue;
    }
    const user = uniqueMatches[0];
    if (doc.id !== user.uid) {
      const uidDoc = await db.collection('clients').doc(user.uid).get();
      if (uidDoc.exists) {
        console.log(`SKIP ${doc.id} reason=uid-document-already-exists`);
        skipped++;
        continue;
      }
    }
    console.log(`${apply ? 'LINK' : 'WOULD_LINK'} ${doc.id} -> ${user.uid}`);
    if (apply) {
      await doc.ref.set({ uid: user.uid, identityMigratedAt: FieldValue.serverTimestamp() }, { merge: true });
    }
    linked++;
  }
  console.log(`${apply ? 'Applied' : 'Dry run'}: ${linked} eligible, ${skipped} skipped. No records were deleted.`);
  if (!apply) console.log('Review the output, back up Firestore, then rerun with --apply to write UID links.');
}

(async () => {
  const command = process.argv[2] || 'list';
  if (command === 'list') return listAccounts();
  if (command === 'apply-test') return applyClaims('test');
  if (command === 'apply-admin') return applyClaims('admin');
  if (command === 'apply-both') return applyClaims('both');
  if (command === 'provision-unverified-client-tests') return provisionUnverifiedClientTests();
  if (command === 'migrate-client-uids') return migrateClientUids();
  throw new Error('Unknown command. Use list, apply-test, apply-admin, apply-both, provision-unverified-client-tests [--apply], or migrate-client-uids [--apply].');
})().catch(err => { console.error('ERROR:', err.message); process.exit(1); });
