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
- Parent reports and monthly summaries: built and scheduled on staging; database/HTTP tests and hosted acceptance remain.
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

## Parent reports — 27 November 2026

Weekly reports (FAM-04) and monthly in-app summaries are built end to end in
code. At this checkpoint nothing had run against a database.

- Rules: `buildWeeklyReport` was already in `packages/rules`. Added `monthWindow`,
  `buildMonthlySummary` and `longestPractisedRun`. A single practised day is not a
  run, so the celebration falls back to "practised on N days".
- Runtime: `reportWeekly` and `reportMonthly` in `packages/runtime/src/reports.ts`
  build one report per active child and period. They skip children added after the
  period and keep an existing report when re-run. "Assigned" topics are the child's
  school-year topics, since there are no classes. Active days this term come from
  the streak state.
- Database: `20261127090000_parent_reports.sql` adds `kind`, timestamp periods and
  a unique `(child_id, kind, period_end)`. It also grants the runtime role read
  access to approved blueprints. Reports are included in data exports and removed by
  the restricted deletion worker.
- Functions: `reports-list` and `report-open` serve only the primary guardian of a
  child with active consent. `report-weekly` and `report-monthly` accept only
  `STELLARA_JOB_SECRET` (32+ characters) as the bearer token.
- Web: `/family/reports/?id=<child>` with a link from the family page. Every
  sentence comes from an `en-NG` template chosen by the rule output. A test checks
  that no sentence contains predicted scores, readiness, rankings or comparisons.
  Preview mode shows labelled example reports.

Evidence: 78 rules, 75 runtime and 95 web tests passed; workspace typecheck,
lint (no errors), formatting, copy lint, Webpack build and client audit passed.
The screen was checked in the browser in preview mode: weekly and monthly views,
dark and light, 390px without overflow, no console errors.

Remaining: add pgTAP and live HTTP tests for the migration and routes, and accept
the flow in hosted staging. The migration and both job schedules are now on
staging (see the deployment record below). Coverage stays empty until the 2027
blueprints are approved.

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

## Hosted staging deployment — 27 November 2026

Target: the dedicated staging project `oshcdrfwkekbcgsffxho`
(`https://oshcdrfwkekbcgsffxho.supabase.co`), West US (Oregon), PostgreSQL 17.12.
It had no application tables, migrations or Edge Functions before this work.

Deployed with `supabase/scripts/deploy-staging.mjs` (Supabase CLI 2.95.0):

- All seven migrations, with versions matching the filenames and no SQL changes
  during rollout. `pg_cron` 1.6.4 and `pg_net` 0.20.4 are enabled.
- The synthetic seed only: 6 topics, 258 items with versions and answers, 6
  lessons and 30 lesson cards. No Auth users or children exist.
- All 24 Edge Functions, active, with `verify_jwt` as set in `config.toml` (13 on,
  11 off).
- The `stellara_login` database role: it may `SET ROLE stellara_runtime` and does
  not inherit it. Functions connect through the transaction pooler with TLS.
- Function secrets: `STELLARA_ENV=staging`, `STELLARA_WEB_ORIGINS`
  (`http://localhost:3000`), `STELLARA_STAGING_TEST_EMAILS` (one approved test
  account), `STELLARA_RUNTIME_DB_URL`, the PIN pepper, child JWT secret, job
  secret and pack key pair. Vault holds `stellara_project_url` and
  `stellara_job_secret`.
- Cron jobs, all active: attempt partitions (`15 1 * * *`), expired sessions
  (`25 1 * * *`), expired packs (`35 1 * * *`), weekly reports (`0 17 * * 0`) and
  monthly reports (`0 17 1 * *`), all UTC.

Checks run:

- Row-level security is on for every table in `public` and `stellara_private`.
- The weekly job command, run once by hand, returned HTTP 200 with
  `{"processed":0,"created":0}`. This covers Vault, `pg_net`, the job secret and
  the runtime database connection. The monthly job has not been run.
- `child-create`, `set-start` and `report-weekly` answered the local-origin
  preflight with 204 and refused missing and invalid tokens with 401. `set-start`
  refused a foreign origin with 403.
- Not checked: sign-in, consent, any family or practice flow, pack signing, the
  web app against staging, pgTAP and the live HTTP tests.

Advisors (no errors):

- Security, warning: `pg_net` is registered in the `public` schema. Its functions
  live in the `net` schema.
- Security, warning (2): `public.rls_auto_enable()` is `SECURITY DEFINER` and
  executable by `anon` and `authenticated`. It is not from this repository; it
  backs the project's `ensure_rls` event trigger.
- Security, info (13): row-level security with no policy on private tables that
  the runtime code does not query directly (attempt partitions and unused
  features). Access stays denied.
- Performance, info: 26 foreign keys without a covering index and 13 unused
  indexes, on a database with no family data.

Secrets: the generated values are in the git-ignored
`supabase/.env.staging.local` on the deploying machine. Back it up privately and
keep it with the script on any other machine: a run without it generates new
values, which invalidates stored child PINs, child sessions and signed packs.

Re-running (written to be repeatable with that file present, though a second run
has not been tried; `--test-emails` replaces the list):

```powershell
node supabase/scripts/deploy-staging.mjs
```

Dashboard work: enable the Google provider (and add Supabase's callback URL in
Google Cloud); set the site URL to `http://localhost:3000` and allow
`http://localhost:3000/auth/callback/`; confirm email sign-in and review Auth
email and rate limits. `apps/web/.env.local` (git-ignored) holds the staging URL
and publishable key. Pack download in the web app also needs
`NEXT_PUBLIC_PACK_PUBLIC_KEY`, copied from the public key in the secrets file. A
hosted web origin, once chosen, goes in `STELLARA_WEB_ORIGINS` and the redirect
list.

Before disabling the legacy API keys: guardian routes read
`SUPABASE_PUBLISHABLE_KEY` and fall back to `SUPABASE_ANON_KEY`. The project
provides only the latter and the plural `SUPABASE_PUBLISHABLE_KEYS`, so they
currently depend on the legacy key.
