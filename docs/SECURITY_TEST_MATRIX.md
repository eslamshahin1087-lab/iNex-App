# iNex Release Gates and Security Test Matrix

This is a test strategy for the repository's existing GitHub Pages + Firebase + Cloudflare Worker architecture. It does not deploy changes or alter production data.

## Security assertions to automate

| Area | Positive test | Negative test |
|---|---|---|
| Identity | Verified user can access own records | Unverified, expired, malformed, wrong-audience, or invalid-signature token is rejected |
| Client records | User reads/updates permitted profile fields | User cannot alter role, points, point flags, company ownership, or another user's profile |
| Tenant isolation | HR company owner accesses own company resources | Other tenant cannot query/read/write employees, documents, requests, medical analyses, or audit records |
| Platform Admin | Proper server-issued admin authorization accesses admin operation | Client-supplied role, direct navigation, or unrelated `admin/{uid}` record cannot grant trusted API privilege without the intended trusted check |
| Documents | Owner creates allowed metadata and downloads own file | Cross-user document read, arbitrary external URL, wrong Cloudinary account, oversized or disallowed file is rejected |
| Rewards | Eligible action creates one ledger entry and balance update | Replay, duplicate request, invalid ownership, cooldown, or daily cap does not mint points |
| Redemption | Available points can be redeemed once | Concurrent/duplicate redemption cannot produce negative balances or repeat discounts |
| HTTP/API | Allowed origin and method are accepted | Unapproved CORS origin, unsupported method, invalid JSON, missing required field, excessive body, and excessive request rate are rejected |
| PWA | Fresh install and updated shell work | Missing precache resource, stale script, and offline fallback do not leave user stranded |

## Manual smoke-test checklist

- [ ] Signup → verify email → sign in → sign out → password reset.
- [ ] Open the app from GitHub Pages root and from every deep link.
- [ ] Client sees only their own policies, claims, payments, documents, messages, appointments and complaints.
- [ ] Admin can manage records; normal user cannot invoke admin APIs directly.
- [ ] New company owner can create and manage own HR Hub data, but cannot access another company's records.
- [ ] Upload a valid PDF/image and reject disallowed file type/oversized upload.
- [ ] Simulate Worker timeout and retry; no duplicate reward or redemption.
- [ ] Update service worker while an existing tab is open; confirm user can recover without destructive stale state.
- [ ] Check Arabic RTL and English LTR at 360px, 390px, 768px and desktop sizes.
- [ ] Confirm the APK download link and published SHA-256 checksum match the release artifact.

## Suggested local validation

Use Node.js 20 as configured by the existing validation workflow:

```sh
npm test
node --check sw.js
node --check workers/securepath-api/src/index.js
node --check js/securepath-backend.js
```

Run the workflow's JSON parsing and inline-script validation steps as well. Run Firestore Rules tests against the Emulator or an isolated test project before proposing any rule change. Never use real customer/medical/policy records as test fixtures.
