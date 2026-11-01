const INSURNEX_PROJECT_ID = 'insurnex-8a9df';

export const INEX_LEAD_SYNC_COLLECTIONS = Object.freeze([
  'leads',
  'leadActivities',
  'tasks',
  'notifications',
]);

function fail(code, status = 400) {
  const error = new Error(code);
  error.code = code;
  error.status = status;
  throw error;
}

function textInput(value, max, fallback = '') {
  if (typeof value !== 'string' && typeof value !== 'number') return fallback;
  return String(value).trim().slice(0, max) || fallback;
}

function encodeFirestoreValue(value) {
  if (value === null || value === undefined) return { nullValue: null };
  if (value === true || value === false) return { booleanValue: value };
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return { nullValue: null };
    return Number.isInteger(value)
      ? { integerValue: String(value) }
      : { doubleValue: value };
  }
  if (typeof value === 'string') return { stringValue: value };
  if (value instanceof Date) return { timestampValue: value.toISOString() };
  if (Array.isArray(value)) {
    return { arrayValue: { values: value.map(encodeFirestoreValue) } };
  }
  if (typeof value === 'object') {
    const fields = {};
    for (const [key, nested] of Object.entries(value)) {
      fields[key] = encodeFirestoreValue(nested);
    }
    return { mapValue: { fields } };
  }
  return { nullValue: null };
}

function createOnlyWrite(collection, id, data, projectId) {
  const fields = Object.fromEntries(
    Object.entries(data).map(([key, value]) => [key, encodeFirestoreValue(value)]),
  );
  return {
    update: {
      name: `projects/${projectId}/databases/(default)/documents/${collection}/${id}`,
      fields,
    },
    currentDocument: { exists: false },
  };
}

function parsedConsentDate(value) {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value !== 'string' || !value.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Builds the tenant-scoped Firestore writes for a consented iNex registration.
 * All IDs are supplied by the caller from a deterministic source UID hash.
 * This function never reads or merges an existing InsurNex record.
 */
export function buildINexLeadSyncWrites(input) {
  const {
    sourceUid,
    client,
    receiverUid,
    receiverName,
    organizationId,
    leadId,
    activityId,
    taskId,
    notificationId,
    now = new Date(),
    dueDate,
    projectId = INSURNEX_PROJECT_ID,
  } = input || {};

  if (projectId !== INSURNEX_PROJECT_ID) fail('INVALID_INSURNEX_PROJECT', 503);
  if (!client || client.crmLeadSyncConsent !== true) fail('CONSENT_NOT_GRANTED', 403);

  if (!/^[A-Za-z0-9_-]{1,128}$/.test(String(sourceUid || ''))) fail('INVALID_SOURCE_UID');
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(String(receiverUid || ''))) fail('INVALID_RECEIVER_UID', 503);
  if (!/^org_[A-Za-z0-9_-]{1,180}$/.test(String(organizationId || ''))) {
    fail('INVALID_ORGANIZATION_ID', 503);
  }
  for (const id of [leadId, activityId, taskId, notificationId]) {
    if (!/^[A-Za-z0-9_-]{1,150}$/.test(String(id || ''))) fail('INVALID_DOCUMENT_ID');
  }
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) fail('INVALID_TIMESTAMP');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dueDate || ''))) fail('INVALID_DUE_DATE');

  const consentCapturedAt = parsedConsentDate(client.crmLeadSyncConsentAt);
  const consentNoticeVersion = textInput(client.crmLeadSyncConsentNoticeVersion, 40);
  if (!consentCapturedAt || !consentNoticeVersion) {
    fail('CONSENT_EVIDENCE_INCOMPLETE', 422);
  }

  const name = textInput(client.fullName || client.name, 160);
  const email = textInput(client.email || client.loginEmail, 254).toLowerCase();
  const phone = textInput(client.phone, 40);
  if (!name || !/^\S+@\S+\.\S+$/.test(email) || !phone) {
    fail('LEAD_CONTACT_DETAILS_INCOMPLETE', 422);
  }

  const clientType = textInput(client.clientType, 40, 'individual') === 'corporate'
    ? 'corporate'
    : 'individual';
  const companyName = clientType === 'corporate'
    ? textInput(client.businessName, 180)
    : '';
  const assignedToName = textInput(receiverName, 160, 'iNex Leads');
  const leadPath = `/leads/${leadId}`;
  const followUpTitle = 'التواصل مع العميل الجديد - iNex';
  const followUpDescription =
    'مراجعة طلب العميل والتواصل معه بعد موافقته على مشاركة بيانات التواصل عبر تطبيق iNex.';

  const lead = {
    organizationId,
    name,
    companyName,
    phone,
    email,
    source: 'website',
    priority: 'medium',
    stage: 'new',
    insuranceType: 'Not specified',
    preferredInsurerId: '',
    preferredInsurerName: '',
    estimatedValue: 0,
    assignedTo: receiverUid,
    assignedToName,
    notes: 'تم استلام بيانات التواصل من تطبيق iNex بعد موافقة المستخدم على مشاركة البيانات.',
    lostReason: '',
    createdBy: receiverUid,
    sourceSystem: 'iNex-App',
    sourceExternalId: String(sourceUid),
    sourceSchemaVersion: 1,
    sourceEvent: 'registration',
    clientType,
    consentToContact: true,
    consentCapturedAt,
    consentNoticeVersion,
    lastActivityAt: now,
    createdAt: now,
    updatedAt: now,
  };

  const activity = {
    organizationId,
    leadId,
    type: 'created',
    message: 'تم استلام عميل محتمل من تطبيق iNex',
    createdBy: receiverUid,
    sourceSystem: 'iNex-App',
    createdAt: now,
  };

  const task = {
    organizationId,
    title: followUpTitle,
    description: followUpDescription,
    priority: 'high',
    status: 'open',
    dueDate,
    assignedTo: receiverUid,
    relatedType: 'lead',
    relatedId: leadId,
    createdBy: receiverUid,
    sourceSystem: 'iNex-App',
    createdAt: now,
    updatedAt: now,
  };

  const notification = {
    type: 'lead_created',
    priority: 'high',
    title: 'عميل محتمل جديد من iNex',
    titleEn: 'New lead received from iNex',
    body: `تم تسجيل عميل محتمل جديد: ${name}. أُنشئت مهمة للتواصل معه.`,
    bodyEn: 'A new iNex registration was received and a follow-up task was created.',
    organizationId,
    userId: receiverUid,
    leadId,
    taskId,
    link: leadPath,
    actionRequired: true,
    actionUrl: leadPath,
    actionLabel: 'فتح العميل المحتمل',
    read: false,
    readAt: null,
    channels: ['in_app'],
    metadata: {
      sourceSystem: 'iNex-App',
      sourceEvent: 'registration',
      sourceSchemaVersion: 1,
    },
    createdAt: now,
    expiresAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
  };

  const leadAndActivityWrites = [
    createOnlyWrite('leads', leadId, lead, projectId),
    createOnlyWrite('leadActivities', activityId, activity, projectId),
  ];
  const followUpWrites = [
    createOnlyWrite('tasks', taskId, task, projectId),
    createOnlyWrite('notifications', notificationId, notification, projectId),
  ];

  return {
    leadId,
    taskId,
    notificationId,
    leadAndActivityWrites,
    followUpWrites,
    writes: [...leadAndActivityWrites, ...followUpWrites],
  };
}

/**
 * Defense-in-depth for the service account's project-scoped create permission:
 * this Worker may only issue create-only writes to the four integration collections.
 */
export function assertINexCreateOnlyWrites(writes, projectId = INSURNEX_PROJECT_ID) {
  if (!Array.isArray(writes) || writes.length === 0 || writes.length > 10) {
    fail('INVALID_INEX_WRITE_BATCH', 500);
  }
  const allowed = new Set(INEX_LEAD_SYNC_COLLECTIONS);
  const prefix = `projects/${projectId}/databases/(default)/documents/`;

  for (const write of writes) {
    const name = write?.update?.name;
    if (typeof name !== 'string' || !name.startsWith(prefix)) {
      fail('INEX_WRITE_OUTSIDE_TARGET_PROJECT', 500);
    }
    const remainder = name.slice(prefix.length);
    const parts = remainder.split('/');
    if (parts.length !== 2 || !allowed.has(parts[0]) || !/^[A-Za-z0-9_-]{1,150}$/.test(parts[1])) {
      fail('INEX_WRITE_COLLECTION_NOT_ALLOWED', 500);
    }
    if (write.currentDocument?.exists !== false || write.delete || write.transform || write.updateMask) {
      fail('INEX_WRITE_MUST_BE_CREATE_ONLY', 500);
    }
  }
  return true;
}
