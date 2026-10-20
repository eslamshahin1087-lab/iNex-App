import { isApprovedCloudinaryDocumentUrl } from './document-utils.js';

export async function handleDocumentVerifiedReward(env, uid, data, claims, deps) {
  const { isAdminUser, getDoc, todayKey, maxDocsPerDay, documentPoints, makeCreateWrite, issuePoints } = deps;
  if (!(await isAdminUser(env, uid, claims))) throw new Error('Admin access required');
  const docId = String(data?.docId || '');
  const doc = await getDoc(env, 'documents', docId);
  if (!doc || !doc.clientId) throw new Error('Document not found');
  const status = String(doc.verificationStatus || doc.reviewStatus || '').toLowerCase();
  if (!['verified', 'approved'].includes(status)) throw new Error('Document is not verified');

  const url = String(doc.downloadURL || doc.fileUrl || '');
  const dataUrl = String(doc.dataUrl || '');
  const isCloudinaryDocument = doc.storageMode === 'cloudinary'
    && isApprovedCloudinaryDocumentUrl(url, env.CLOUDINARY_CLOUD_NAME);
  // Older admin uploads used Firestore data URLs. They remain eligible only
  // after an authenticated admin has marked the document approved/verified.
  const isLegacyAdminDocument = doc.storageMode === 'firestore-dataUrl'
    && /^data:(application\/pdf|image\/(jpeg|png|webp));base64,/i.test(dataUrl);
  if (!isCloudinaryDocument && !isLegacyAdminDocument) throw new Error('Document storage is not approved');

  const client = await getDoc(env, 'clients', doc.clientId);
  if (!client) throw new Error('Client not found');

  const today = todayKey();
  const flags = { ...(client.pointsFlags || {}) };
  const awardedIds = Array.isArray(flags.docUploadAwardedIds) ? flags.docUploadAwardedIds : [];
  if (awardedIds.includes(docId)) return { ok: true, points: 0, reason: 'already_awarded' };
  const claimDigest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(docId));
  const claimId = Array.from(new Uint8Array(claimDigest)).map(value => value.toString(16).padStart(2, '0')).join('');
  if (await getDoc(env, 'documentRewardClaims', claimId)) return { ok: true, points: 0, reason: 'already_awarded' };
  const count = flags.docUploadAwardDate === today ? Number(flags.docUploadAwardCount || 0) : 0;
  if (count >= maxDocsPerDay) return { ok: true, points: 0, reason: 'daily_cap' };

  flags.docUploadAwardDate = today;
  flags.docUploadAwardCount = count + 1;
  flags.docUploadAwardedIds = awardedIds.slice(-49).concat(docId);

  try {
    return await issuePoints(env, doc.clientId, client, documentPoints, 'insurance_habit',
      'اعتماد مستند تأميني', 'Verified insurance document',
      { pointsFlags: flags }, [makeCreateWrite('documentRewardClaims', claimId, {
        clientId: doc.clientId,
        documentId: docId,
        points: documentPoints,
        createdAt: new Date().toISOString()
      })]);
  } catch (error) {
    // Two admin retries can race. The create-only claim is committed atomically
    // with the points; observing it means the competing request already won.
    if (await getDoc(env, 'documentRewardClaims', claimId)) {
      return { ok: true, points: 0, reason: 'already_awarded' };
    }
    throw error;
  }
}
