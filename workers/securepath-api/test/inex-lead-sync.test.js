import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assertINexCreateOnlyWrites,
  buildINexLeadSyncWrites,
  INEX_LEAD_SYNC_COLLECTIONS,
} from '../src/inex-lead-sync.js';

const fixedNow = new Date('2026-11-01T12:00:00.000Z');
const input = {
  sourceUid: 'source_user_123',
  receiverUid: 'fDGjCCaVCGXbPoH18sMI7DRbpQI2',
  receiverName: 'iNex Leads',
  organizationId: 'org_insurnex_test',
  leadId: 'sp_test_lead_123456',
  activityId: 'sp_test_lead_123456_created',
  taskId: 'sp_test_lead_123456_followup',
  notificationId: 'sp_test_lead_123456_assigned',
  now: fixedNow,
  dueDate: '2026-11-01',
  client: {
    crmLeadSyncConsent: true,
    crmLeadSyncConsentAt: '2026-11-01T10:00:00.000Z',
    crmLeadSyncConsentNoticeVersion: '2026-10-17',
    fullName: 'Test Client',
    email: 'TEST@example.com',
    phone: '+201000000000',
    clientType: 'corporate',
    businessName: 'Example Company',
  },
};

function collectionOf(write) {
  const prefix = 'projects/insurnex-8a9df/databases/(default)/documents/';
  return write.update.name.slice(prefix.length).split('/')[0];
}

function field(write, key) {
  return write.update.fields[key];
}

function stringField(write, key) {
  return field(write, key)?.stringValue;
}

test('creates one tenant-scoped lead, activity, follow-up task and notification', () => {
  const built = buildINexLeadSyncWrites(input);
  assert.equal(built.writes.length, 4);
  assert.deepEqual(
    built.writes.map(collectionOf),
    ['leads', 'leadActivities', 'tasks', 'notifications'],
  );
  assert.equal(built.leadAndActivityWrites.length, 2);
  assert.equal(built.followUpWrites.length, 2);
  assert.equal(stringField(built.writes[0], 'organizationId'), input.organizationId);
  assert.equal(stringField(built.writes[0], 'sourceSystem'), 'iNex-App');
  assert.equal(stringField(built.writes[0], 'sourceExternalId'), input.sourceUid);
  assert.equal(stringField(built.writes[0], 'email'), 'test@example.com');
  assert.equal(field(built.writes[0], 'consentToContact')?.booleanValue, true);
  assert.equal(stringField(built.writes[2], 'relatedType'), 'lead');
  assert.equal(stringField(built.writes[2], 'relatedId'), input.leadId);
  assert.equal(stringField(built.writes[2], 'assignedTo'), input.receiverUid);
  assert.equal(stringField(built.writes[2], 'dueDate'), input.dueDate);
  assert.equal(stringField(built.writes[3], 'userId'), input.receiverUid);
  assert.equal(stringField(built.writes[3], 'leadId'), input.leadId);
  assert.equal(stringField(built.writes[3], 'taskId'), input.taskId);
  assert.equal(stringField(built.writes[3], 'type'), 'lead_created');
  assert.equal(field(built.writes[3], 'read')?.booleanValue, false);
});

test('does not include unrelated sensitive signup fields in the InsurNex lead', () => {
  const client = {
    ...input.client,
    nationalId: 'SHOULD_NOT_BE_SENT',
    dateOfBirth: '1990-01-01',
    medicalHistory: 'SHOULD_NOT_BE_SENT',
    uploadedDocuments: ['SHOULD_NOT_BE_SENT'],
  };
  const built = buildINexLeadSyncWrites({ ...input, client });
  const leadFields = Object.keys(built.writes[0].update.fields);
  assert.equal(leadFields.includes('nationalId'), false);
  assert.equal(leadFields.includes('dateOfBirth'), false);
  assert.equal(leadFields.includes('medicalHistory'), false);
  assert.equal(leadFields.includes('uploadedDocuments'), false);
});

test('requires explicit consent and recorded consent evidence', () => {
  assert.throws(
    () => buildINexLeadSyncWrites({ ...input, client: { ...input.client, crmLeadSyncConsent: false } }),
    (error) => error.code === 'CONSENT_NOT_GRANTED',
  );
  assert.throws(
    () => buildINexLeadSyncWrites({ ...input, client: { ...input.client, crmLeadSyncConsentAt: '' } }),
    (error) => error.code === 'CONSENT_EVIDENCE_INCOMPLETE',
  );
  assert.throws(
    () => buildINexLeadSyncWrites({ ...input, client: { ...input.client, crmLeadSyncConsentNoticeVersion: '' } }),
    (error) => error.code === 'CONSENT_EVIDENCE_INCOMPLETE',
  );
});

test('rejects invalid contact and tenant configuration', () => {
  assert.throws(
    () => buildINexLeadSyncWrites({ ...input, client: { ...input.client, email: 'not-an-email' } }),
    (error) => error.code === 'LEAD_CONTACT_DETAILS_INCOMPLETE',
  );
  assert.throws(
    () => buildINexLeadSyncWrites({ ...input, client: { ...input.client, phone: '' } }),
    (error) => error.code === 'LEAD_CONTACT_DETAILS_INCOMPLETE',
  );
  assert.throws(
    () => buildINexLeadSyncWrites({ ...input, organizationId: 'other-org' }),
    (error) => error.code === 'INVALID_ORGANIZATION_ID',
  );
  assert.throws(
    () => buildINexLeadSyncWrites({ ...input, receiverUid: '' }),
    (error) => error.code === 'INVALID_RECEIVER_UID',
  );
});

test('enforces create-only writes and a strict destination collection allowlist', () => {
  const built = buildINexLeadSyncWrites(input);
  assert.equal(assertINexCreateOnlyWrites(built.writes), true);
  assert.deepEqual(INEX_LEAD_SYNC_COLLECTIONS, [
    'leads', 'leadActivities', 'tasks', 'notifications',
  ]);
  assert.throws(
    () => assertINexCreateOnlyWrites([{ ...built.writes[0], currentDocument: undefined }]),
    (error) => error.code === 'INEX_WRITE_MUST_BE_CREATE_ONLY',
  );
  const wrongCollection = {
    ...built.writes[0],
    update: {
      ...built.writes[0].update,
      name: 'projects/insurnex-8a9df/databases/(default)/documents/users/attacker',
    },
  };
  assert.throws(
    () => assertINexCreateOnlyWrites([wrongCollection]),
    (error) => error.code === 'INEX_WRITE_COLLECTION_NOT_ALLOWED',
  );
  const wrongProject = {
    ...built.writes[0],
    update: {
      ...built.writes[0].update,
      name: 'projects/another-project/databases/(default)/documents/leads/test',
    },
  };
  assert.throws(
    () => assertINexCreateOnlyWrites([wrongProject]),
    (error) => error.code === 'INEX_WRITE_OUTSIDE_TARGET_PROJECT',
  );
});
