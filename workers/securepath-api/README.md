# SecurePath Free Backend

Cloudflare Worker backend for SecurePath. It replaces Firebase Cloud Functions so the Firebase project can remain on the Spark/free plan.

## Cloudinary configuration

Configure these in the Cloudflare Worker **Production** environment:

**Variables** (non-secret):
- `CLOUDINARY_CLOUD_NAME`: the Cloudinary cloud name. For the currently selected SecurePath account, the console shows `securepath`.
- `CLOUDINARY_API_KEY`: the active API key from that same Cloudinary account.

**Secret**:
- `CLOUDINARY_API_SECRET`: the API Secret paired with `CLOUDINARY_API_KEY`.

Do not put the API Secret in source control, commit history, screenshots, or chat. If a secret has been shared outside the secret manager, rotate the API key pair and use the replacement.

## iNex-App → InsurNex lead synchronization (Firebase Spark-compatible)

The iNex registration flow calls the authenticated Cloudflare Worker endpoint after a client session is established. The Worker validates the Firebase ID token issued by the iNex source project (`path-1a672`), reads the source profile server-side, and transfers only the contact fields required to create a sales lead. No Firebase Cloud Functions are deployed or called, and Firebase is not upgraded to Blaze.

The synchronization is consent-gated. The source profile must contain `crmLeadSyncConsent === true`, a captured `crmLeadSyncConsentAt` timestamp, and a `crmLeadSyncConsentNoticeVersion`. Existing accounts without all three values are skipped; this Worker does not infer consent from the existence of an account. Passwords, ID tokens, national IDs, dates of birth, medical information, policy lists, and uploaded files are not included in the lead payload.

### Receiving workspace configuration

Configure these values in the Cloudflare Worker environment, not in Git or in the browser:

- `INSURNEX_RECEIVER_UID` — requested target UID: `fDGjCCaVCGXbPoH18sMI7DRbpQI2`.
- `INSURNEX_ORGANIZATION_ID` — exact verified document ID of the receiving organization in InsurNex `organizations`.
- `INSURNEX_RECEIVER_NAME` — optional display name; defaults to `iNex Leads`.
- `INSURNEX_SERVICE_ACCOUNT_JSON` — Cloudflare Worker Secret for the dedicated InsurNex service account.

The requested receiving email is `leads@insurnex.com`. The UID/email/organization must be checked in the live Firebase project before setting these variables: repository access does not prove that the account is currently active, belongs to the configured organization, or has an allowed receiving role. The receiver should be an active owner, admin, broker, or sales member who is authorized to receive leads. Do not substitute the legacy SecurePath receiver identity.

### Least-privilege target access

Create a dedicated service account in Google Cloud project `insurnex-8a9df` for the Worker. Do not use a project Owner/Editor identity or a human user's password. Prefer a project-level custom IAM role with `datastore.entities.create` and only the database/project metadata permissions required by the Firestore REST API (such as `datastore.databases.get`, `datastore.databases.getMetadata`, and `resourcemanager.projects.get` if required). Do not add `datastore.entities.get`, `datastore.entities.list`, `datastore.entities.update`, or `datastore.entities.delete`.

Firestore REST calls authorized with a service-account OAuth token use Google Cloud IAM rather than the end-user Firestore Security Rules. For that reason, the Worker also enforces a source-code allowlist: the integration can issue create-only writes only to `leads`, `leadActivities`, `tasks`, and `notifications` in project `insurnex-8a9df`. It rejects read/update/delete writes and any other collection. Keep the service-account role and this code-level guard aligned.

### Created records and retry behavior

For a consented registration, a single atomic Firestore commit creates:
1. `leads/sp_<hash>` — the lead, marked `sourceSystem: iNex-App`, with the consent timestamp/version and a stable source UID reference.
2. `leadActivities/<lead-id>_created` — the source event.
3. `tasks/<lead-id>_followup` — an open, high-priority follow-up task assigned to the receiving user and linked to the lead.
4. `notifications/<lead-id>_assigned` — an in-app notification addressed to the receiving user and linked to the lead/task.

The IDs are deterministic, so repeated session resumes do not create additional leads, activities, tasks, or notifications. When a lead/activity was created by the older integration version, a retry attempts to create only the missing task/notification; it never overwrites the existing lead or activity. Client matching or merging is not performed by this endpoint.

The legacy route `POST /v1/client/registration-lead` remains available for the current iNex client. The clearer alias `POST /v1/inex/registration-lead` is also supported. Both require an authenticated iNex Firebase ID token; no credential is embedded in the client bundle.

Store the service-account JSON only in the Cloudflare Worker Secret manager. Do not commit, paste, log, or screenshot it. The Worker environment variables/secrets are not changed by this repository change. Verify receiver identity, organization, IAM permissions, and a consented test registration before deploying a new Worker version.

## HR insurance-consumption AI analysis

The HR Hub reads the uploaded file and computes aggregate indicators in the browser. After a company owner enables AI reports once for the company, each new analysis is sent automatically to `POST /v1/hr/medical-analysis`; the Worker checks company ownership, validates the fields, and sends only aggregate figures to Gemini 2.5 Flash. The raw file, source filename, company ID, employee names, national IDs, and claim rows are not sent to Gemini. Service/month breakdowns are omitted unless every included group contains at least five identifiable members. Reports with fewer than five identifiable members stay local. Gemini output is an operational aid, not medical, legal, or coverage advice.

Configure `GEMINI_API_KEY` as a Cloudflare Worker secret (never in browser code or Git), then deploy the Worker while preserving dashboard variables with `npx wrangler deploy --keep-vars`. Company owners see the AI data-use notice before enabling this company-level setting. Google API terms and retention policies apply to submitted aggregates.

## Endpoints

- `POST /v1/points` — insurance/habit/manual-driving/GPS point issuance.
- `POST /v1/redeem` — atomic point redemption + lead creation.
- `POST /v1/cloudinary/sign` — server-owned Cloudinary upload parameters and per-user folder/public ID.
- `POST /v1/document/verified` — admin-only verified-document point issuance.
- `POST /v1/hr/medical-analysis` — company-owner-only AI report from a validated, de-identified aggregate (requires `GEMINI_API_KEY`).
- `POST /v1/client/appointment` — client appointment creation.
- `POST /v1/client/complaint` — client complaint creation + notification + lead.
- `POST /v1/client/renewal` — client renewal request after policy ownership validation.
- `POST /v1/client/advice` — client advice request.
- `POST /v1/client/lead` — validated lead creation for allowed sources.
- `POST /v1/inex/registration-lead` — consented iNex-App registration sync; the legacy `POST /v1/client/registration-lead` alias remains supported.

All requests require a Firebase Authentication ID token in the Authorization header.

The Worker verifies Firebase ID-token signatures, then uses a restricted Firebase service-account identity for Firestore REST writes. Firestore REST requests made with a service-account OAuth token use IAM rather than end-user Firestore Security Rules.

## Deploy

Install Wrangler, then from this directory:

```text
npx wrangler login
npx wrangler secret put FIREBASE_SERVICE_ACCOUNT_JSON
npx wrangler secret put CLOUDINARY_API_SECRET
npx wrangler secret put INSURNEX_SERVICE_ACCOUNT_JSON
npx wrangler deploy
```

After deployment, copy the Worker URL into `js/securepath-backend.js` as `SECUREPATH_API_URL`. Run `npm run check` and `npm test` inside this Worker directory before release.

The Workers Free plan currently has daily request and CPU limits, so this backend is intended for a moderate early-stage workload.


## Client write ownership

Sensitive client writes are server-owned. The browser submits a small validated payload plus an idempotency key; the Worker sets the authenticated client ID, timestamps, initial status, and related notification/lead records. Firestore rules therefore no longer expose direct client creation for appointments, complaints, renewals, messages, and leads.

## Cloudinary

Upload signatures are generated only after Firebase ID-token authentication. The Worker assigns the user's Cloudinary folder and a server-generated public ID so the browser cannot choose another user's storage path.
