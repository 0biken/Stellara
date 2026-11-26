# MVP implementation record

Release decisions: free family beta, in-app summaries, Paystack disabled until
commercial approval, fixed staff roles, limited audited support access. Real
practice-test blueprints require academic approval of the official 2027 format.

## Work remaining

- Staff roles and operations portal: the 19 November record reports 38 pgTAP checks,
  five permission tests and live staff endpoint tests passing locally. Hosted access requires
  MFA. Enrollment/challenge UI and a separate demo browser journey exist; hosted
  live MFA, role assignment/deactivation and forbidden-route browser acceptance remain.
- Content studio: drafts, import, independent review, publishing and takedowns.
- Offline packs: authenticated build/get endpoints, private signed-byte storage,
  expiry cleanup and pinned-key client verification/cache implemented. Seven pack
  verification and budget tests pass. Offline practice UI and sync integration remain.
- Jobs: Postgres adapter, daily closure, due reviews, stats and retention.
- Practice tests: authoritative timer, pause evidence, resumes and finalization.
- Parent reports and monthly in-app summaries.
- Data request fulfillment with private exports and restricted deletion worker.
- Paystack remains disabled and unimplemented for the free beta; commercial
  pricing, billing and paid-conversion targets require later approval and rebaseline.
- Content production: named authors, independent reviewers and academic approval.
- Staging and beta acceptance gates.

## Staff frontend progress — 19 November 2026

Implemented a shared `/admin` workspace with role-aware navigation, explicit
access errors, MFA enrollment/challenge UI, sign-out and role rechecks on auth
changes or window focus. Typed adapters preserve live endpoint error codes and
never infer staff roles from guardian or user metadata.

The content library, review and publishing lists, record previews, team,
limited support, audit and account-security routes exist. Library filters and
pagination survive reload through URL parameters. In staff demo mode, content
records use an explicitly labelled in-memory adapter; the live content adapter
reports unavailable (`apps/web/lib/admin/content.ts`). Editors, review decisions,
publication actions, imports and curriculum screens are still pending.

Existing administration actions retain their live adapter. Enable a separate
staff preview with `NEXT_PUBLIC_ADMIN_DEMO=true` and restart/rebuild the app;
never use it to evaluate live staff authorization. There is no visible role
switcher and no fallback from a live error to demo data. Demo mode uses synthetic
metadata only and resets on reload. The first demo milestone has 29 focused
auth, permission, adapter, session and library tests. Production build, typecheck,
focused lint and client canary checks passed. Four source/bundle boundary tests
pass, including a guard against importing staff modules from family or child code.
The production Chromium journey passes pagination, URL search/reload, Daylight
and Starlight axe checks, 390px layout and limited-support empty state. Desktop
and mobile screenshots were reviewed. At that point WebKit and live MFA acceptance
were pending; the 24 November review below supersedes the demo WebKit status.
One QR-image lint warning remains; there are no lint errors in the new staff code.

Browser checks: `pnpm exec playwright test -c apps/web/e2e/admin.config.mjs`
expects a web production build made with `NEXT_PUBLIC_ADMIN_DEMO=true`. It serves
that build at port 3100 and checks filters, pagination, reload, theme contrast,
mobile overflow and the limited-support empty state. Do not run this against
the ordinary live build. Screenshots are written to ignored web test artifacts.

Existing local evidence: migrations and synthetic seed, 30 pgTAP assertions,
live family HTTP journey, browser journey, Webpack build and client audit passed.
This evidence predates the new staff work and must be repeated for new migrations.

## Reconciliation review — 24 November 2026

Independently reviewed the pending staff/backend milestone and reconciled
`TASKLIST.md` against source and recorded evidence. This is a development checkpoint,
not hosted or beta acceptance. The review fixed three concrete issues:

- Drop the legacy data-request kind constraint before converting `delete` rows
  to `deletion`; the upgrade regression executes the actual migration with old data.
- Normalize staff target UUIDs before the self-role guard, mutation and audit.
  Uppercase UUIDs can no longer bypass the self-demotion/deactivation refusal.
- Limit request uniqueness/deduplication to pending/ready requests. Expired ready
  exports become completed history under the child lock, allowing a fresh export.
  Runtime receives only the additional status-column update permission.

Verification for this checkpoint:

| Check | Result |
|---|---|
| Formatting | `pnpm format:check` passed; existing source formatting normalized and nested worktree copies excluded |
| Lint and source boundaries | `pnpm lint` passed, zero errors and 12 image warnings; six boundary/copy regression tests passed |
| Staff permissions | Seven unit tests passed, including both UUID regressions |
| Database | All 38 pgTAP assertions passed on the synthetic proof stack |
| Upgrade with existing data | Migration regression passed, including preserved deletion history and a new export after a completed request |
| Live HTTP | Both staff/family journeys passed with signed-pack coverage enabled, including completed/expired export renewal |
| Staff demo browser | Chromium and WebKit passed filters, pagination, reload, light/dark axe, 390px layout and limited-support empty state |
| Generated documentation | `pnpm docs:check` passed |
| Production build | Webpack demo and ordinary builds passed with client canary audits; the final local build has staff demo mode disabled |
| TypeScript | All ten tasks passed with `pnpm exec turbo run typecheck --concurrency=1` |
| Package unit suites | Six of seven suites passed in the reduced-concurrency run; the web suite encountered worker startup timeouts. Bounded fork/thread retries stalled and do not count as a pass |

The default Turbopack build failed while starting a CSS-processing child process
in this Windows sandbox. Webpack was used for production/browser verification;
the default build and full web unit command still need a clean run in a supported
execution environment. No test assertions failed before the worker startup errors.
Live staff MFA, hosted family acceptance and the complete offline interruption
matrix remain open.

The unreleased request migration was corrected in place. The proof database's
open-request index and status grant were brought into line for HTTP verification.
Other existing local stacks that already applied the earlier unreleased migration
need the same reviewed correction or a synthetic database rebuild. No hosted
database was changed. Docker was returned to its original stopped state afterward.

## Build verification — 25 November 2026

The full workspace test command passed. The web package ran all 82 tests across
17 files, with cached results for the other six package tasks. Turbopack still
exited during CSS worker startup on Windows outside the sandbox. The production
build now explicitly uses Webpack. Turbo receives `GITHUB_PAGES` as a build
input and caches the resulting `out/` directory. The Pages export included the
family and staff routes and used the `/Stellara` asset base path. The standard
`pnpm build` and `pnpm check:client` also passed.

GitHub reports only the `github-pages` environment for this repository. The
latest Pages run built its artifact and returned HTTP 404 when creating the
deployment. The dedicated staging project and frontend URL still need to be
identified before hosted family and staff acceptance.

## Question draft editor

The demo content library now lets authors, content leads, and super admins
create question drafts and reopen them in the same tab. Authors can edit their
own drafts. The editor supports single choice, multiple choice, numeric,
ordering, matching, and cloze questions. Each has a preview, hints,
explanations, and basic metadata. Cloze uses numbered blanks in the preview.
Incomplete drafts can be saved. The adapter checks answer references and
rejects stale writes while the editor keeps the current text. Drafts reset on
reload. Lesson editing and the live review and publication workflow are still
open.

## Staff bootstrap

Create the first staff account through Supabase Auth, then have a trusted database
operator insert its Auth UUID into `stellara_private.staff_members` with role
`super_admin`. No public bootstrap endpoint exists. Later assignments and
deactivation go through the Super Admin portal. Own-role changes are refused.
Roles are stored in the private database, never in editable user metadata.

The current portal exposes request counts, audit headers and reason-gated limited
child profile lookups. MFA enrollment/challenge UI is implemented in
`apps/web/components/admin/security-panel.tsx`; hosted acceptance remains.
The live content studio, job controls, release settings and full business
administration are not yet implemented.

## Pack configuration and verification

Set `STELLARA_PACK_PRIVATE_KEY` and `STELLARA_PACK_PUBLIC_KEY` on the backend,
and pin the matching `NEXT_PUBLIC_PACK_PUBLIC_KEY` in the web build. Keys use
Ed25519 PKCS8/SPKI PEM; literal `\n` is supported. Never publish the private key.
Pack retrieval requires a currently valid child session and active consent.
Creation records answer-key exposure before delivery, so downloaded questions
cannot later inflate mastery through an online submission.

The local HTTP suite optionally exercises signing and persistence with
`STELLARA_TEST_PACKS=1`. Set `STELLARA_TEST_DB_CONTAINER=supabase_db_stellara_proof`
for the isolated stack's synthetic staff bootstrap. Regular CI defaults to
`supabase_db_stellara`. Pack test keys belong only in ignored local config.
