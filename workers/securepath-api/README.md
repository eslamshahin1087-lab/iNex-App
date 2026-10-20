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

## InsurNex lead synchronization (Firebase Spark-compatible)

The SecurePath-to-InsurNex lead sync writes directly to the InsurNex Firestore REST API through this Worker. It does not deploy or call Firebase Cloud Functions, Secret Manager, or require upgrading Firebase to Blaze.

Configure the receiving destination in the Cloudflare Worker settings (not in Git):

- `INSURNEX_RECEIVER_UID` — the Firebase Authentication UID of `securepath@nex.com`.
- `INSURNEX_ORGANIZATION_ID` — the exact document ID of that receiver's organization in the InsurNex `organizations` collection.
- `INSURNEX_RECEIVER_NAME` — optional display name; defaults to `secure path leads`.

Create a dedicated service account in Google Cloud project `insurnex-8a9df` for this Worker. Avoid using a project Owner/Editor account or the receiver's password. Prefer a project-level custom IAM role with `datastore.entities.create` and only the database/project metadata permissions required by the Firestore API (such as `datastore.databases.get`, `datastore.databases.getMetadata`, and `resourcemanager.projects.get` if required). Do not add `datastore.entities.get`, `datastore.entities.list`, `datastore.entities.update`, or `datastore.entities.delete`; this Worker does not need to read or modify existing InsurNex records. Assign that role to the dedicated service account, create a JSON key, and store the entire JSON as the Cloudflare Worker Secret `INSURNEX_SERVICE_ACCOUNT_JSON`.

The Worker creates deterministic `leads/sp_<hash>` and `leadActivities/<lead-id>_created` documents in a single atomic commit with create-only preconditions. Repeated calls return an idempotent success rather than creating duplicate leads. The Worker still reads the SecurePath client profile itself and sends contact details only when `crmLeadSyncConsent === true`.

Treat the service-account JSON key as a credential: do not commit it, paste it into chat, or include it in screenshots. The receiving service account should not be given broad data-read permissions.

## Optional HR medical-consumption AI report

The HR Hub can request an Arabic or English management report from Gemini 2.5 Flash. The original Excel/PDF file is parsed and analyzed in the browser; the Worker sends only validated aggregate metrics and anonymized category totals to Gemini. It does not send company IDs, source filenames, employee names, national IDs, or claim rows. Department names are replaced with codes, and category breakdowns are omitted when any group has fewer than five identifiable people.

To enable the optional feature:

1. Create a Gemini API key in Google AI Studio.
2. From this directory, set it as a Cloudflare Worker secret: `npx wrangler secret put GEMINI_API_KEY`.
3. Deploy the Worker: `npx wrangler deploy`.

Never put the key in browser code or commit it. HR users must explicitly consent in the HR Hub before sending a report. Review the Gemini API terms for unpaid/free usage before enabling this feature; free-tier prompts may be used to improve Google products. The existing in-browser analysis and exports continue to work if the AI key is not configured or its free quota is reached.

## Endpoints

- `POST /v1/points` — insurance/habit/manual-driving/GPS point issuance.
- `POST /v1/redeem` — atomic point redemption + lead creation.
- `POST /v1/cloudinary/sign` — server-owned Cloudinary upload parameters and per-user folder/public ID.
- `POST /v1/document/verified` — admin-only verified-document point issuance.
- `POST /v1/hr/medical-analysis` — company-owner-only AI narrative from a de-identified aggregate report (requires `GEMINI_API_KEY`).
- `POST /v1/client/appointment` — client appointment creation.
- `POST /v1/client/complaint` — client complaint creation + notification + lead.
- `POST /v1/client/renewal` — client renewal request after policy ownership validation.
- `POST /v1/client/advice` — client advice request.
- `POST /v1/client/lead` — validated lead creation for allowed sources.

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

After deployment, copy the Worker URL into `js/securepath-backend.js` as `SECUREPATH_API_URL`.

The Workers Free plan currently has daily request and CPU limits, so this backend is intended for a moderate early-stage workload.


## Client write ownership

Sensitive client writes are server-owned. The browser submits a small validated payload plus an idempotency key; the Worker sets the authenticated client ID, timestamps, initial status, and related notification/lead records. Firestore rules therefore no longer expose direct client creation for appointments, complaints, renewals, messages, and leads.

## Cloudinary

Upload signatures are generated only after Firebase ID-token authentication. The Worker assigns the user's Cloudinary folder and a server-generated public ID so the browser cannot choose another user's storage path.
