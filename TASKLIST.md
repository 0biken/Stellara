# Stellara for Kids: task list to completion

Built on 12 Nov 2026 from `docs/md/00–15` and the knowledge graph in `graphify-out/` (407 nodes, 24 communities). Phase 0 refreshed the graph on 13 Nov to 581 nodes and 51 communities; foundation sources and document 17 are included in the subsequent refresh.
"Done" means **M6, the beta gate is passed** (mid-May 2027). Phase 2 and 3 are listed at the end, but only as gated follow-ons.

## Current status — 24 November 2026

Engineering toward the MVP is approximately **50% complete**; overall readiness for a family beta is approximately **25–30%** when content, academic approval and release gates are included. These are scope estimates, not checkbox counts or acceptance results. M6 additionally requires evidence collected during the beta; it has not passed.

- **Implemented:** monorepo, learning rules, schemas, design system, landing page, family/child screens, local Supabase migrations and runtime adapters, consent/PIN management and response persistence.
- **Partly implemented:** offline storage/outbox and signed packs; staff roles, MFA screens and operations; job/data-rights logic. End-to-end offline practice, database-backed workers and hosted acceptance remain open.
- **Demo only:** staff content lists, record previews, and draft editors for all six question formats. The live content adapter reports unavailable.
- **Still open:** timed practice-test endpoints/UI, parent reports, monthly in-app summaries, approved launch content, monitoring, device acceptance and human approval gates.

**Current release scope:** family-only, free beta for 50–100 families, in-app summaries, Paystack disabled until commercial approval. Schools, classes, teacher dashboards and child AI chat are outside the MVP. External messaging and paid conversion targets must be revisited before a commercial release; they do not block this free beta merely because they appear in the original plan below.

The [implementation record](docs/mvp-implementation.md) separates local evidence, demo behavior and pending hosted verification. Product sign-off, curriculum approval, official 2027 exam mapping, contributor agreements and authoring quotes remain unconfirmed in the repository. See [foundation gates](docs/md/17-foundations-and-human-gates.md). Original dates below remain planning targets, not a newly validated schedule.

### Next tasks, in order

- [x] Reconcile and independently review the staff/backend milestone; commit the checkpoint with verification evidence and remaining limits in [the implementation record](docs/mvp-implementation.md#reconciliation-review--24-november-2026).
- [x] Verify the web unit suite and production build. All 82 web tests passed, and the Webpack build, Pages export and client bundle audit passed on 25 November (2.35).
- [ ] Prove the family learning journey in hosted staging, including persistence, isolation and consent revocation (M2).
- [ ] Accept live staff MFA, assignment/deactivation and forbidden direct routes in browser tests.
- [ ] Finish item/lesson editors, independent review and publishing, then connect the studio to live persistence (2.32).
- [ ] Add curriculum coverage and validated bulk import; start authoring/review in parallel (2.33–2.34).
- [ ] Connect offline practice and outbox replay; pass the interruption matrix (2.19–2.22).
- [ ] Connect and operate database-backed jobs, private exports and restricted deletion (2.18, 2.28).
- [ ] Build authoritative practice tests after academic blueprint approval (2.23–2.25).
- [ ] Deliver parent reports and monthly in-app summaries (2.26–2.27).
- [ ] Finish monitoring, cross-browser/device/accessibility acceptance and beta gates (2H, Phase 3).

Legend: **[Owner]** · ⟶ depends on · 📄 spec reference. Checked tasks mean the stated implementation scope is complete; unchecked tasks can contain substantial partial work. Milestone criteria below are targets, not declarations that a gate passed.

---

## Phase 0: Housekeeping (this week, before 16 Nov)

- [x] **0.1 Put the project under version control.** Run `git init`, add a `.gitignore` covering `node_modules/`, `graphify-out/cache/` and `.env*`, make a first commit, and create a GitHub repo for CI. **[Eng]** Existing `0biken/Stellara` repository reused; initial history preserved.
- [x] **0.2 Fix the stale Auntie Stella preview.** Regenerated `docs/assets/auntie-stella/preview.html` from `avatar.mjs`; static and animated variants use the Sweet Garden palette and cocoa outlines. **[Design/Eng]** Automated checks pass; fresh visual gallery inspection was blocked by the browser's local-file policy.
- [x] **0.3 Rebuild the generated docs** after the 12 Nov edits (`node docs/tools/build.mjs` and `node docs/tools/brandkit.mjs`). `16-ux-writing.md` is listed in `00-index.md` and in the built HTML; repeated generation is stable. **[Eng]**
- [x] **0.4 Add a docs check to CI** that fails when `docs/html` or `brand-kit/*.html` is out of date with its source. **[Eng]** Push/PR workflow uses Node 22; checks also cover avatars, logos, combined docs, new outputs and obsolete pages.
- [x] **0.5 Refresh the graph** with `/graphify . --update`. Updated code and 19 changed document sources, including `16-ux-writing.md`; all edge endpoints resolve and the report and interactive graph are refreshed. **[Any]**

## Phase 1: Foundations (16 Nov – 4 Dec 2026)

### 1A. Decisions and legal (M0 · 4 Dec)
- [ ] **1.1 Engage a Nigerian data-protection and IP lawyer.** **[Founder]** 📄 07 §1
- [ ] **1.2 Appoint the DPO** (an external DPO is fine). **[Founder]** 📄 07 §1 (s.32)
- [ ] **1.3 Order a trademark search for "Stellara"** (Q4). If it conflicts, the identity can carry on through Auntie Stella and the constellation. **[Founder → agent]** 📄 14 §4
- [ ] **1.4 Confirm the 2027 NCEE details with NECO (Q1):** papers, item counts, durations, paper or CBT, and the date. Re-baseline the pilot dates if the date moves. **[Academic lead]** 📄 03 §1, 02 §5.1
- [ ] **1.5 Rebaseline commercial price hypotheses and trial terms (Q2)** before a paid release. The current family beta is free; the original 2–3 price-point and trial proposal is deferred commercial work. **[Founder]** 📄 13 §1
- [ ] **1.6 Choose the parental verification method (Q3)** that satisfies NDPA s.31(2). With no school to vouch for parents, the candidates are a small refundable card check (Paystack), a verified phone plus a signed declaration, or a light ID check that keeps only the result. Development uses the placeholder `declaration_v0`, never in production. **[Lawyer]** 📄 07 §3
- [ ] **1.7 Choose the Supabase region and transfer basis (Q5, ADR-007).** Measure latency from Lagos and Abuja in week 1 and record the result in the decision log. **[DPO + Eng]** 📄 04 §8
- [ ] **1.8 Deferred: choose an external messaging provider (Q6)** for a later release. The current beta uses in-app summaries; the original WhatsApp Business API/SMS fallback proposal needs a provider and scope rebaseline before implementation. **[Eng]** 📄 04 §1
- [ ] **1.9 Accept or reject the proposed ADRs:** ADR-004 (child JWT), ADR-005 (first-party analytics) and ADR-006 (KaTeX at publish). **[Eng]** 📄 04 §13
- [ ] **1.10 Commission the final Auntie Stella illustration (Q7).** **[Design]**
- **M0 target:** scope, prices and stack confirmed; lawyer and DPO engaged; trademark search ordered. Human approvals remain open; commercial pricing requires a later rebaseline for the free beta.

### 1B. Rules frozen (M1 · 30 Nov)
- [x] **1.11 Scaffold the monorepo:** pnpm and Turborepo, `apps/web`, `packages/{rules,ui,content-schema,i18n}`, and `supabase/{migrations,functions,seed,tests}`. ESLint, Prettier and TypeScript strict are configured. **[Eng]** 📄 04 §3, 09 §10
- [x] **1.12 Build `packages/rules`** as pure TypeScript with no I/O. **[Eng]** 📄 02
  - [x] the scored-response predicate (§2)
  - [x] mastery levels 0–5, moving down, strand-only placement and low-confidence caps (§3)
  - [x] spaced review scheduling, including exam-date compression (§4)
  - [x] the practice-test timer, grace period, resumes and `suspect_timing` flag (§5.2)
  - [x] Stardust events, the daily 200 cap and level names (§6)
  - [x] days in a row, clouds, Rest Mode, repair and outage excuse (§7)
  - [x] parent report block selection (§8) and placement strand results (§9)
  - [x] the `rules_version` constant (`v0.1.0`)
- [x] **1.13 Add fixtures** M-01…M-14, S-01…S-03 and X-01 in `packages/rules/fixtures/*.json`, plus seeded property and regression tests. **[Eng/QA]** 📄 02 §10
- M1 technical gate passes: all fixtures pass and rules branch coverage is 99.73%. **Product sign-off remains pending; M1 is not yet signed off.**

### 1C. Content schema frozen (by 30 Nov)
- [x] **1.14 Write `packages/content-schema`** (Zod) for items, stimuli, lessons and cards, and blueprints. Draft/publication validation and client-safe projections pass 35 tests. **[Eng + Academic]** 📄 03 §4
- [x] **1.15 Draft the curriculum tree for 5 learning areas and 74 topics,** with prerequisites and separate, unverified exam-paper mapping. **Draft prepared; academic approval remains pending.** **[Academic lead]** 📄 03 §2–3
- [ ] **1.16 Get IP assignment and originality warranties signed** by every author and reviewer. Preparation only: [onboarding/counsel brief and private tracker template](docs/authoring/onboarding-and-rights.md). No signatures obtained. **[Founder]** 📄 03 §7
- [ ] **1.17 Get 2–3 quotes for authoring** (~3,000–6,000 hours). Preparation only: [unsent quote brief and comparison template](docs/authoring/request-for-quote.md). No suppliers contacted or quotes received. **[Founder]** 📄 03 §5

## Phase 2: Build the MVP (30 Nov 2026 – 29 Jan 2027)

### 2A. Platform: data, auth, consent, children (30 Nov – 28 Dec) ⟶ 1.6, 1.7, 1.11
- [ ] **2.1 Complete and accept the database schema.** Family/learning tables, monthly `attempts` partitions, staff access and private packs are implemented in `supabase/migrations/`. Full spec reconciliation and hosted migration acceptance remain. **[Eng]** 📄 05
- [ ] **2.2 Accept the rule-encoding constraints.** Consent and item-publication triggers, append-only attempts and daily Stardust constraints exist in `supabase/migrations/20261119003949_family_learning.sql`; consent expiry is extended by the later data-request migration. Hosted acceptance remains. **[Eng]** 📄 05 §4
- [ ] **2.3 Complete RLS coverage and hosted isolation acceptance.** Policies and runtime grants exist in `supabase/migrations/`; allow/deny assertions are in `supabase/tests/*.sql`. Confirm coverage against every required table and role. **[Eng]** 📄 05 §3, 10 §1
- [ ] **2.4 Accept hosted Supabase Auth and staff MFA.** Google/email magic-link adapters exist in `apps/web/lib/auth/supabase.ts`; staff enrollment/challenge UI exists in `apps/web/components/admin/security-panel.tsx`, with hosted AAL2 enforcement in `supabase/functions/_shared/backend.js`. Provider configuration, limits and live browser acceptance remain; WhatsApp/SMS is deferred from the free beta. **[Eng]**
- [ ] **2.5 Accept the implemented consent and child functions in hosted staging.** `supabase/functions/_shared/backend.js` implements consent start/confirm, child creation/session, argon2id picture PINs, lockout and revocation. Local declaration verification is development/staging only; the approved production verification method and hosted journey remain open. **[Eng]** 📄 06, 04 §6
- ~~**2.6 Build school onboarding.**~~ **Dropped (17 Nov 2026):** Stellara is family-only.
- [ ] **2.7 Accept rate limits.** Database-backed PIN/device/guardian and learning endpoint limits exist in `supabase/functions/_shared/backend.js`. Auth-provider limits and hosted abuse/latency acceptance remain. **[Eng]** 📄 04 §11
- [ ] **2.8 Accept synthetic seed coverage.** Local sample curriculum/content seeding and isolated family creation are documented in `supabase/seed/README.md` and exercised by `supabase/tests/live-family.test.mjs`. These fixtures are not approved launch content or a hosted demo-family acceptance result. **[Eng]**

### 2B. Design system and web shell (in parallel, from 30 Nov)
- [x] **2.9 Set up `packages/ui` tokens** (light and dark) and wire them into Tailwind. `tokens.mjs` contrast runs in CI. **[Eng/Design]** 📄 08, 09 §8
- [x] **2.10 Build the components from 08 §6 in Storybook,** with axe checks and light and dark snapshots. **[Eng]** About 25 components; Playwright accessibility and visual specs run in CI. API documented in [18 · UI foundations](docs/md/18-ui-foundations.md).
- [x] **2.11 Build the theme bootstrap:** an inline no-flash script, `color-scheme` and `theme-color` metas, and the per-device Appearance setting. **[Eng]** 📄 09 §8 The `Appearance` component exists but is not yet mounted on the parent settings page.
- [x] **2.12 Set up `packages/i18n`** (ICU, en-NG, with yo/ha/ig catalogues that fall back to English). Add the forbidden-phrase lint and apply 16-ux-writing. **[Eng]** 📄 09 §6, 10 §4 Lint is `pnpm check:copy`; yo/ha/ig contain no real translations yet.
- [x] **2.13 Create the route groups** `(child) (family) (studio) (ops) /basic`. **[Eng]** 📄 04 §4 The groups are layout shells and `/basic` shows a heading only. `(teach)` and `(school)` were dropped (16 and 17 Nov).

### 2B+. Extra work completed (not in the original plan)
- [x] **Public landing page** with the scroll-scrubbed "How a star grows" section and theme toggle. **[Eng/Design]**
- [x] **Parent sign-in, connected through an auth adapter.** Google plus an email magic-link fallback (docs 01 FAM-01 and 04 §6 updated). `apps/web/lib/auth/` selects the live Supabase adapter when `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are configured; preview remains labelled. `/family` includes consent, child management and settings routes. Hosted acceptance remains under 2.4–2.5. **[Eng]**
- [x] **GitHub Pages static-export deploy workflow** for the web app. **[Eng]**

### 2C. Learning runtime (7 Dec – 10 Jan) ⟶ 1.12, 2.1–2.5
- [ ] **2.14 Accept `set-start` in hosted staging.** Practice, review, topic assessment and placement logic exists in `packages/runtime/src/set-start.ts`; `supabase/functions/_shared/backend.js` and `store.js` provide the transactional Postgres adapter and client-safe payloads. Hosted acceptance remains. **[Eng]**
- [ ] **2.15 Accept `responses-submit` persistence and latency.** `packages/runtime/src/responses-submit.ts` and the shared backend/store adapter implement transactional batches, idempotency, mastery, reviews, Stardust and activity days. `supabase/tests/live-family.test.mjs` covers persistence and duplicate submissions locally; hosted acceptance and p95 under 400 ms in Lagos remain. **[Eng]** 📄 04 §5
- [ ] **2.16 Accept the child learning journey.** Sky, lessons, practice feedback and hints exist in `apps/web/components/child/`, with preview and live adapters in `apps/web/lib/learning/`. Runtime endpoints are connected; hosted, device and interruption acceptance remain. **[Eng]**
- [ ] **2.17 Accept optional, resumable strand-level placement.** `apps/web/components/child/placement-screen.tsx` and `packages/runtime/src/placement.ts` implement the flow; live adapter wiring exists in `apps/web/lib/learning/supabase.ts`. Hosted/resume acceptance remains. **[Eng]** 📄 02 §9
- [ ] **2.18 Connect and operate the scheduled jobs.** Job logic, schedules and lock/checkpoint runner exist in `packages/runtime/src/jobs/`. Migrations schedule partition/session/pack cleanup; the Postgres adapter and scheduling for daily closure, due reviews, item statistics and retention remain. **[Eng]** 📄 04 §10
- **M2 target, walking skeleton (18 Dec):** parent sign-in → consent → child → one practice set works end to end. Local journey evidence exists; hosted staging acceptance remains open.

### 2D. Offline packs and sync (28 Dec – 18 Jan) ⟶ 2.15
- [ ] **2.19 Connect and accept the Serwist service worker.** Cache policies, build script and registration helper exist in `apps/web/app/sw.ts`, `apps/web/scripts/build-sw.mjs` and `apps/web/lib/offline/sw-register.ts`; the web build generates `public/sw.js`. Application registration, precache population and offline shell acceptance remain. **[Eng]**
- [ ] **2.20 Connect offline storage and replay to the learning UI.** Child-scoped Dexie stores, outbox leases/backoff and clock-trust helpers exist in `apps/web/lib/offline/{db,outbox,grants}.ts`; end-to-end offline practice/replay and interruption acceptance remain. **[Eng]** 📄 04 §7
- [ ] **2.21 Complete signed-pack consumption.** Authenticated `pack-build`/`pack-get`, private signed-byte persistence and expiry cleanup exist under `supabase/functions/` and `supabase/migrations/`; `apps/web/lib/offline/{verify-pack,packs}.ts` provides pinned-key verification, 120 KB pack budgets, LRU eviction and the 25 MB device budget. The live learning adapter downloads/verifies/caches packs, and the backend records answer-key exposure before delivery. Offline practice UI and sync integration remain. **[Eng]**
- [ ] **2.22 Pass every row of the interruption matrix in 10 §3.** **[QA]**

### 2E. Practice tests (4 Jan – 25 Jan) ⟶ 1.4
- [ ] **2.23 Load the `test_blueprints` config** with verified NCEE values. **[Academic + Eng]**
- [ ] **2.24 Build `test-start`, `test-resume` and `test-finish`:** a server timer, 15 min grace, 2 resumes within 20 min total pause, finalisation of abandoned tests, and `suspect_timing`. **[Eng]** 📄 02 §5.2, KID-04
- [ ] **2.25 Build the test UI:** an offset-synced timer, free navigation, and flags. It must handle 100 items on a 3 GB device without a tab reload. **[Eng]**

### 2F. Parents (11 Jan – 1 Feb)
- [ ] **2.26 Build `report-weekly`** (Sunday 18:00) and the in-app report (FAM-04), with the Common Entrance coverage disclaimer. **[Eng]** 📄 02 §8
- [ ] **2.27 Build monthly in-app summaries** with the note from Auntie Stella. WhatsApp/SMS dispatch is deferred from the current free-beta scope and needs a later commercial/provider rebaseline. **[Eng]**
- [ ] **2.28 Complete data-rights fulfillment.** Parent settings and `data-request-export`/`data-request-delete` endpoints persist requests with 7/30-day deadlines; deletion requests revoke child sessions, and consent withdrawal is connected (`apps/web/app/(family)/family/settings/`, `supabase/functions/_shared/backend.js`). Core export/deletion logic exists in `packages/runtime/src/data-rights.ts`; private export delivery, restricted database-backed deletion workers and end-to-end acceptance remain. **[Eng]**
- ~~**2.29 Build the teacher dashboard.**~~ **Dropped (16 Nov 2026):** there is no teacher role.
- ~~**2.30 Build the school overview.**~~ **Dropped (17 Nov 2026):** Stellara is family-only.
- [ ] **2.30a Deferred commercial work: parent subscriptions and Paystack.** The `subscriptions` table exists in `supabase/migrations/20261119003949_family_learning.sql`; billing is not implemented or enabled. The beta is free; trial/pricing/paid-conversion targets need later approval and rebaseline before commercial implementation. **[Eng]** ⟶ 1.5
- [ ] **2.31 Build Stardust, days in a row and clouds in the UI.** Use calm celebrations and no loss-framing copy (KID-06). **[Eng/Design]**

### 2G. Content studio and authoring (30 Nov – end Feb)
- [ ] **2.32 Complete the live content studio.** Staff roles, MFA enrollment/challenge screens and live team/support/audit operations exist in `apps/web/{components,lib}/admin/` and `supabase/functions/_shared/admin.js`. Hosted authorization/MFA acceptance remains. The demo supports creating, saving and previewing drafts for all six question formats. Lesson editing, independent review, live persistence, publication and takedown, import, curriculum, versioning integration, KaTeX and readability checks remain (CON-01…03). **[Eng]** 📄 03 §6
- [ ] **2.33 Author the item pool:** about 1,800–2,200 items, ~74 lessons, 5 placement checks and 3 test forms (from a reserved pool). Prioritise Maths and English in school-year order. AI may draft; a reviewer verifies every answer. **[Content team]**
- [ ] **2.34 Run 10% second-review sampling,** keeping the error rate below 1%. **[Academic lead]**
- **M3 target, content alpha (15 Jan):** at least 40% of the pool published and reviewed. M4 needs at least 70%; synthetic/demo content does not satisfy either gate.

### 2H. Quality, ops, analytics (continuous)
- [ ] **2.35 Complete the release pipeline.** `.github/workflows/docs-check.yml` configures formatting, lint, typecheck, unit tests, tokens, build/client checks and UI browser/visual checks; `supabase-check.yml` configures local migrations/pgTAP and family HTTP/Chromium integration; `deploy-pages.yml` deploys a static preview. Lighthouse/release budgets, hosted staging promotion and tagged production gates remain. Workflow configuration is not evidence of a fresh green run. **[Eng]** 📄 11 §2
- [ ] **2.36 Complete the 10 key browser journeys.** UI coverage exists under `packages/ui/`; live family coverage is in `supabase/browser/`. The separate demo-only staff journey in `apps/web/e2e/` passed Chromium and WebKit on 24 November, including light/dark accessibility and 390px overflow checks. Full mobile coverage, live MFA and role-route acceptance remain. **[QA]** 📄 10 §2
- [ ] **2.37 Set up the device lab:** an entry Android Go phone, the reference phone, a tablet, an iOS 16 phone and a shared family PC. Test on entry devices from M2. **[QA]**
- [ ] **2.38 Set up monitoring:** Sentry with PII scrubbing, an uptime monitor, latency and sync-backlog alerts, and cost alerts. **[Eng]** 📄 11 §5
- [ ] **2.39 Add the first-party `events` catalogue** with hashed child IDs, plus the Metabase dashboards. **[Eng]** 📄 06 §7, 12 §4
- [ ] **2.40 Apply the security baseline:** CSP, `frame-ancestors 'none'`, Renovate, `pnpm audit`, secrets rotation and backup restore drills. **[Eng]** 📄 07 §6, 11 §3–4
- [ ] **2.41 Build the `/basic` server-rendered mode for Opera Mini** (lessons and untimed practice). **[Eng]**

## Phase 3: Beta readiness (11 Jan – 29 Jan 2027)

- [ ] **3.1 Get the DPIA signed.** It must cover scoring, the guardian view, gamification, analytics, hosting and transfer, and messaging. **[DPO]** 📄 07 §1
- [ ] **3.2 Get a lawyer to approve** the consent notice, the non-affiliation line and all public wording. **[Lawyer]**
- [ ] **3.3 Sign DPAs for the processors actually enabled for the beta** (including hosting and monitoring). Messaging and Paystack agreements belong to their later activation gates. No signatures are recorded here. **[Legal]**
- [ ] **3.4 Finish the breach runbook** and set up the NDPC 72-hour notification path. **[DPO + Eng]** 📄 07 §7
- [ ] **3.5 Deferred: register an SMS sender ID** at least 3 weeks before an externally messaged pilot. SMS is outside the current in-app-only beta scope. **[Eng]** 📄 11 §7
- [ ] **3.6 Prepare family materials:** a one-page "How Stellara works" (local-language versions later), a consent explainer and a short demo video. **[Family success]** 📄 13 §2
- [ ] **3.7 Run the release checklist:** TalkBack, light and dark by eye, tokens contrast, a manual offline run, a clean forbidden-phrase lint, and release notes. **[QA]** 📄 10 §6
- **M4 target, beta-ready (29 Jan):** all MVP stories accepted, DPIA signed, budgets green, TalkBack passed, and at least 70% of the item pool published. This gate has not passed.

## Phase 4: Family beta (1 Feb – ~3 May 2027)

- [ ] **4.1 Recruit and onboard the first 20 families** through parent WhatsApp groups and referrals, with check-ins in weeks 2 and 6. **[Family success]** 📄 13 §2
- **M5 target, beta live (1 Feb):** onboard families after M4 acceptance; not yet live.
- [ ] **4.2 Grow to 50–100 families,** and track the weekly KPIs on the beta health dashboard. **[Founder]** 📄 12 §2
- [ ] **4.3 Finish authoring the full pool before the NCEE.** **[Content]**
- [ ] **4.4 Run the support SLAs and content error triage.** **[Ops]** 📄 13 §4
- [ ] **4.5 Measure the Opera Mini share** to decide whether to invest further in `/basic`. **[Eng]**
- [ ] **4.6 Get the external pen test booked** before any public launch. **[Eng]**

## Phase 5: Gate (mid-May 2027)

- [ ] **5.1 Evaluate the beta gate.** Original criteria: weekly active children at 50% or more in 6 of 8 weeks; a gain on retention checks; at least 30% of families paying after the free trial; no open privacy incident with the DPIA current; and 100% of items with verified answers. The paid-conversion criterion conflicts with the approved free-beta scope and requires a later explicit commercial rebaseline; no replacement criterion or gate approval is recorded here. **[Founder]** 📄 12 §3
- [ ] **5.2 Optionally, with consent, collect NCEE outcomes** and publish the findings with the error band. **[Product]**
- **M6 target, gate passed: done for the MVP.** Beta evidence and the scope/gate reconciliation above remain open; this gate has not passed.

## After the gate (only if M6 passes)
- **Phase 2, Intermediate (2027/28 Terms 1–2):** P1–6 Maths and English, Basic Science, sibling plans, and Yoruba, Hausa and Igbo strings.
- **Phase 3, Early years:** a design study with families, then parent-led creche and KG activities.
- **Later, gated:** live AI chat with Auntie Stella for children, only after a DPIA update, DPO sign-off, safety filters and a parent opt-in.
- **Later:** a native Android wrapper, licensed past papers, and validated outcome reporting.

---

### Critical path
NCEE confirmation (1.4) → blueprints (2.23) → practice tests (2.24). In parallel: lawyer (1.6) → consent functions (2.5) → DPIA (3.1) → M4. Content authoring (2.33) is the longest single stream at about 90 days, so start it in week 2.
