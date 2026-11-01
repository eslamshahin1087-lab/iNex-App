# iNex-App → InsurNex lead sync deployment runbook

## Current architecture

- iNex client application: Firebase project `path-1a672`.
- Trusted backend: existing Cloudflare Worker `securepath-api`.
- Destination: InsurNex Firestore project `insurnex-8a9df`.
- Client call: `POST /v1/client/registration-lead` (kept for compatibility); `POST /v1/inex/registration-lead` is an equivalent alias.
- Authentication: iNex Firebase ID token, verified by the Worker against the iNex project.
- Data source: the authenticated user's profile is read by the Worker; no contact details are accepted from the browser body.

## Required Cloudflare environment

Non-secret Worker variables:
- `INSURNEX_RECEIVER_UID`
- `INSURNEX_ORGANIZATION_ID`
- `INSURNEX_RECEIVER_NAME` (optional)

Secret:
- `INSURNEX_SERVICE_ACCOUNT_JSON`

Requested destination identity:
- UID: `fDGjCCaVCGXbPoH18sMI7DRbpQI2`
- Email: `leads@insurnex.com`

Do not set these variables until an authorized operator has checked the UID/email match, active profile, organization ID, active membership, and receiving role in the live InsurNex Firebase project. These values are product-request values, not runtime verification evidence.

## Service account

Use a dedicated service account in Google Cloud project `insurnex-8a9df`. It should be allowed to create entities in the four target collections only:
- `leads`
- `leadActivities`
- `tasks`
- `notifications`

Prefer `datastore.entities.create` and only the additional project/database metadata permissions required by the Firestore REST API. Do not grant entity get/list/update/delete. Store the JSON key only as the Cloudflare Worker Secret `INSURNEX_SERVICE_ACCOUNT_JSON`. Never commit or paste this key into source code, issues, pull requests, or chat.

The Worker validates every request's destination project, collection and create-only precondition before calling Firestore REST. This is essential because service-account requests use IAM rather than end-user Firestore Security Rules.

## User consent and payload

A source profile is eligible only with:
- `crmLeadSyncConsent === true`
- `crmLeadSyncConsentAt`
- `crmLeadSyncConsentNoticeVersion`

The Worker transfers name, email, phone, client type, and business name when applicable. It also records consent provenance and a stable source UID reference. It does not transfer passwords, authentication tokens, national IDs, date of birth, medical data, policy lists or uploaded files.

Existing accounts without consent evidence are skipped. Do not backfill consent or transfer historical profiles based only on their existence.

## Resulting records

One atomic Firestore commit creates the lead, creation activity, follow-up task and in-app notification. Stable document IDs preserve idempotency across sign-in/session retries.

When a prior version already created the lead/activity pair, the Worker attempts to create only missing follow-up records. It never overwrites the lead or activity and never automatically matches or merges existing client profiles.

## Validation

From `workers/securepath-api`:
```sh
npm run check
npm test
```

The repository validation workflow also checks Worker syntax and executes these tests.

## Staging acceptance before deployment

1. Verify the receiving UID/email, organization, membership and role in the target Firebase project.
2. Confirm the service account can create the four allowed collections and cannot read/list/update/delete entities.
3. Configure the Worker variables and secret in Cloudflare's secret manager. Do not put values in Git.
4. Deploy the Worker only after the coordinated pull requests are reviewed and approved.
5. Use a synthetic iNex account with the current consent notice version.
6. Confirm first delivery creates exactly one lead, activity, task and notification.
7. Call the endpoint repeatedly or resume the session; verify no duplicate records.
8. Confirm no-consent and incomplete-consent accounts return skipped results and create no records.
9. Confirm the receiving user can see the new lead, task and notification only within the configured organization.
10. Keep logs free of raw phone/email, request payloads, service-account JSON, signatures or ID tokens.

No deployment, Cloudflare secret mutation, live Firestore write, or production acceptance is performed by this repository change.
