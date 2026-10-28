# iNex / InsurNex — Production Readiness Plan
**Review date:** 2026-10-28  
**Baseline:** `main` at `56e0fcf1ef83cdc969f5318aa28c4fca339c6546`  
**Working branch:** `codex/production-readiness-audit-20261028`

## Executive summary

This repository is a plain HTML/CSS/JavaScript PWA hosted on GitHub Pages, with Firebase Authentication/Firestore and a Cloudflare Worker used for trusted operations. It is not a Vite/React application. Keep existing functionality and hosting architecture while improving security verification, test coverage, deployment controls, and maintainability. Do not deploy infrastructure or merge to `main` as part of this plan.

The most recent repository Actions runs inspected on 2026-10-28 were successful on 2026-10-22:
- Validate Repository — success
- Deploy to GitHub Pages — success
- Push on main — success
These runs show that those workflows succeeded at that time, not that every current production behavior is correct.

## Workstreams and exit criteria

### P0 — Security and data isolation
1. Audit every `firestore.rules` match against all client reads/writes and Worker operations.
2. Verify tenant isolation for clients, corporate HR companies, employees, documents, requests, analyses, and audit events. Prove that a signed-in user cannot read or mutate another user's records.
3. Verify Platform Admin authorization server-side; hiding an admin page or checking a client-controlled Firestore document alone must not be treated as sufficient for trusted Worker operations.
4. Review token verification, issuer/audience/expiry/auth-time/email verification, CORS allowlist, request size, methods, error redaction, and per-identity rate limits in the Worker.
5. Review signed Cloudinary uploads: server-generated signatures, allowed folders/resource types, file size/type validation, upload ownership, URL host validation, and safe download handling.
6. Check the repo and deployment settings for accidental secrets; rotate any exposed credentials immediately if found.
**Exit criteria:** negative authorization tests pass for every sensitive collection and Worker endpoint; positive cases preserve intended user workflows; no secrets in tracked files.

### P0 — Automated verification / release gates
1. Run `npm test` from the repository root and capture the real output.
2. Add tests for Firestore security assumptions and Worker endpoint authorization, validation, CORS, malformed tokens, missing claims, rate limiting, request bounds, and cross-tenant access.
3. Add PWA checks: manifest assets exist, service-worker precache paths resolve, update behavior does not strand users on stale JS, and navigation works offline/online.
4. Require validation workflow success before changes are merged or published.
**Exit criteria:** test suite is deterministic, documented and repeatable; a failing security or smoke test blocks release.

### P1 — Product reliability
1. Verify signup, email verification, login/logout, password reset, session expiry and role transitions.
2. Test end-to-end policy lifecycle: quote request, uploaded document, renewal reminder, claim, appointment, complaint and message; confirm loading, empty, success, retry and error states.
3. Verify points are issued only by trusted, idempotent operations; include duplicate, retry, race and daily-cap tests.
4. Review form validation, double-submit prevention, optimistic UI rollback, and network failure behavior.
**Exit criteria:** each critical journey has a repeatable smoke test and documented expected behavior.

### P1 — UX / accessibility / visual consistency
1. Preserve the current INex brand assets and navy/gold theme; check contrast in light and dark modes.
2. Validate responsive layouts at 360px, 390px, 768px and desktop widths; prioritize HR Hub and admin data tables.
3. Verify Arabic RTL and English LTR across forms, dialogs, validation, dates, numbers and tables.
4. Add accessible names, keyboard focus, visible focus rings, semantic form labels, reduced-motion support, and appropriate touch target sizes.
5. Make loading/empty/error/success states consistent without altering product behavior.
**Exit criteria:** no critical overlapping or clipped UI on target widths; key flows work with keyboard; no broken brand asset references.

### P1 — PWA and delivery
1. Verify `manifest.json`, all icon dimensions/paths, `start_url`, `scope`, theme/background colors and standalone launch.
2. Review `sw.js` cache-version strategy, stale-cache cleanup, network fallback and safe update activation.
3. Verify GitHub Pages base paths for all links and assets; keep repo-specific paths correct.
4. Confirm APK/release links resolve and publish SHA-256 checksums for produced binaries.
**Exit criteria:** clean install and upgrade test passes on supported mobile browsers; no 404s on key assets and download links.

### P2 — Maintainability and performance
1. Avoid a large framework migration until the current behavior is covered by tests.
2. Gradually extract shared auth, API transport, validation, localization and UI utilities from large HTML files into versioned JS modules.
3. Add a small shared API client with standard timeout, cancellation, structured errors and retry policy for safe idempotent requests.
4. Measure startup time, JavaScript parse cost, payload size, Firestore read volume and Worker latency before optimizing.
5. Add structured, privacy-safe logging and error identifiers without logging health, identity or policy document contents.
**Exit criteria:** incremental refactors preserve behavior with regression coverage and provide measurable improvement.

## Proposed release sequence

- **Release A — Security baseline:** rules/Worker audit and negative authorization tests.
- **Release B — Critical journey regression:** auth, documents, quotes, renewals, HR Hub and admin tests.
- **Release C — PWA and responsive polish:** cache lifecycle, installation and UI/accessibility fixes.
- **Release D — Maintainability:** progressively extract modules only after regression coverage is in place.

## Operating rules

- Work only on the dedicated branch until reviewed.
- Do not change live Firebase rules, Worker production secrets/configuration, GitHub Pages settings, or Android releases from this task.
- Do not claim security/compliance certification from code review alone.
- Back up production data before any migration; make migrations dry-run by default and review the diff before applying.
- Keep the Spark/free-plan constraint in mind; do not introduce paid Firebase Cloud Functions as a requirement.
- The Platform Admin interface is a separate administration surface, and normal users retain the capabilities allowed by their plan. Enforce authorization in trusted data/API layers, not only in navigation.
- For insurance and HR/medical functionality, restrict access to the minimum required data and avoid using sensitive records for analytics or logs.

## Current review notes

- README documents GitHub Pages hosting and a Cloudflare Worker API model.
- `package.json` exposes `npm test` using Node's built-in test runner.
- The latest repository Actions runs available through GitHub at review time reported success on 2026-10-22.
- This document is a plan, not proof that tests were executed in this session or that production is fully secure.
