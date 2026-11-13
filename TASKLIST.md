# Stellara for Kids: task list to completion

Built on 12 Nov 2026 from `docs/md/00–15` and the knowledge graph in `graphify-out/` (407 nodes, 24 communities). Housekeeping refreshed on 13 Nov, including document 16; the graph now has 581 nodes and 51 communities.
"Done" means **M6, the pilot gate is passed** (mid-May 2027). Phase 2 and 3 are listed at the end, but only as gated follow-ons.

**Where things stand now (13 Nov 2026):** the specs, brand kit, tokens script, static and animated avatars, and docs build exist. The project is connected to `0biken/Stellara`, with a generated-docs CI check. No application code exists yet: no `apps/`, `packages/` or `supabase/` folders.

Legend: **[Owner]** · ⟶ depends on · 📄 spec reference · ✅ exit check

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
- [ ] **1.5 Set price hypotheses and pilot terms (Q2):** test 2–3 price points, and decide whether pilot pricing is free or discounted. **[Founder]** 📄 13 §1
- [ ] **1.6 Choose the parental verification method (Q3)** that satisfies NDPA s.31(2). The candidates are school confirmation and a signed school form. **[Lawyer]** 📄 07 §3
- [ ] **1.7 Choose the Supabase region and transfer basis (Q5, ADR-007).** Measure latency from Lagos and Abuja in week 1 and record the result in the decision log. **[DPO + Eng]** 📄 04 §8
- [ ] **1.8 Choose the messaging provider (Q6):** WhatsApp Business API plus SMS fallback. **[Eng]** 📄 04 §1
- [ ] **1.9 Accept or reject the proposed ADRs:** ADR-004 (child JWT), ADR-005 (first-party analytics) and ADR-006 (KaTeX at publish). **[Eng]** 📄 04 §13
- [ ] **1.10 Commission the final Auntie Stella illustration (Q7).** **[Design]**
- ✅ M0: scope, prices and stack confirmed; lawyer and DPO engaged; trademark search ordered.

### 1B. Rules frozen (M1 · 30 Nov)
- [ ] **1.11 Scaffold the monorepo:** pnpm and Turborepo, `apps/web`, `packages/{rules,ui,content-schema,i18n}`, and `supabase/{migrations,functions,seed,tests}`. Add ESLint, Prettier and TypeScript strict. **[Eng]** 📄 04 §3, 09 §10
- [ ] **1.12 Build `packages/rules`** as pure TypeScript with no I/O. **[Eng]** 📄 02
  - [ ] the scored-response predicate (§2)
  - [ ] mastery levels 0–5, moving down, and the placement and low-confidence caps (§3)
  - [ ] spaced review scheduling, including exam-date compression (§4)
  - [ ] the practice-test timer, grace period, resumes and `suspect_timing` flag (§5.2)
  - [ ] Stardust events, the daily 200 cap and level names (§6)
  - [ ] days in a row, clouds, Rest Mode, repair and outage excuse (§7)
  - [ ] parent report block selection (§8) and placement strand results (§9)
  - [ ] the `rules_version` constant
- [ ] **1.13 Add fixtures** M-01…M-14, S-01…S-03 and X-01 in `packages/rules/fixtures/*.json`, plus property tests. **[Eng/QA]** 📄 02 §10
- ✅ M1: all fixtures pass, branch coverage is at least 90%, and product has signed off.

### 1C. Content schema frozen (by 30 Nov)
- [ ] **1.14 Write `packages/content-schema`** (Zod) for items, stimuli, lessons and cards, and blueprints. **[Eng + Academic]** 📄 03 §4
- [ ] **1.15 Draft the curriculum tree for the 5 papers and ~74 topics,** with prerequisites. **[Academic lead]** 📄 03 §2–3
- [ ] **1.16 Get IP assignment and originality warranties signed** by every author and reviewer. **[Founder]** 📄 03 §7
- [ ] **1.17 Get 2–3 quotes for authoring** (~3,000–6,000 hours). **[Founder]** 📄 03 §5

## Phase 2: Build the MVP (30 Nov 2026 – 29 Jan 2027)

### 2A. Platform: data, auth, consent, schools (30 Nov – 28 Dec) ⟶ 1.6, 1.7, 1.11
- [ ] **2.1 Write migrations for every table in 05 §2**, with `attempts` partitioned monthly. **[Eng]** 📄 05
- [ ] **2.2 Add the rule-encoding constraints:** the children consent trigger, `attempts` UPDATE/DELETE revoked, the item publish trigger, and the stardust daily check. **[Eng]** 📄 05 §4
- [ ] **2.3 Add RLS helpers and policies on every table.** Each policy gets a pgTAP allow test and a deny test. **[Eng]** 📄 05 §3, 10 §1
- [ ] **2.4 Set up Supabase Auth:** phone OTP (WhatsApp, then SMS) and email magic link, with OTP limits (FAM-01). Staff accounts get MFA. **[Eng]**
- [ ] **2.5 Build the functions `consent-start` and `consent-confirm`, `child-create`, `child-session`,** plus the picture PIN with argon2id hashing and lockout. **[Eng]** 📄 06, 04 §6
- [ ] **2.6 Build school onboarding:** SCH-01…03, invites, class codes and `class-join`. **[Eng]** 📄 01 §7.1
- [ ] **2.7 Set up rate limits** on `responses-submit`, `child-session` and OTP. **[Eng]** 📄 04 §11
- [ ] **2.8 Write the seed data:** a demo school and synthetic children. **[Eng]**

### 2B. Design system and web shell (in parallel, from 30 Nov)
- [ ] **2.9 Set up `packages/ui` tokens** (light and dark) and wire them into Tailwind. `tokens.mjs` contrast runs in CI. **[Eng/Design]** 📄 08, 09 §8
- [ ] **2.10 Build the components from 08 §6 in Storybook,** with axe checks and light and dark snapshots. **[Eng]**
- [ ] **2.11 Build the theme bootstrap:** an inline no-flash script, `color-scheme` and `theme-color` metas, and the per-device Appearance setting. **[Eng]** 📄 09 §8
- [ ] **2.12 Set up `packages/i18n`** (ICU, en-NG, with yo/ha/ig catalogues that fall back to English). Add the forbidden-phrase lint and apply 16-ux-writing. **[Eng]** 📄 09 §6, 10 §4
- [ ] **2.13 Create the route groups** `(child) (family) (teach) (school) (studio) (ops) /basic`. **[Eng]** 📄 04 §4

### 2C. Learning runtime (7 Dec – 10 Jan) ⟶ 1.12, 2.1–2.5
- [ ] **2.14 Build `set-start`** for practice, review, topic assessment and placement sets. Payloads carry no keys. **[Eng]**
- [ ] **2.15 Build `responses-submit`:** batch processing that is idempotent on `client_id`, calls rules for scoring and mastery, and writes the ledger and activity days. Target p95 under 400 ms in Lagos. **[Eng]** 📄 04 §5
- [ ] **2.16 Build the child screens:** the sky home (KID-02), lesson cards, practice with the "checking" state, hints, and "Not quite" (KID-03). **[Eng]**
- [ ] **2.17 Build the placement check flow** (optional, resumable, strand-level only). **[Eng]** 📄 02 §9
- [ ] **2.18 Add the pg_cron jobs:** close the learning day, schedule due reviews, update item stats, and purge for retention. **[Eng]** 📄 04 §10
- ✅ **M2, walking skeleton (18 Dec):** school → teacher → class → parent consent → child → one practice set works end to end in staging.

### 2D. Offline packs and sync (28 Dec – 18 Jan) ⟶ 2.15
- [ ] **2.19 Set up the Serwist service worker** to precache the shell and cache media at runtime. **[Eng]**
- [ ] **2.20 Build the Dexie stores, partitioned per child, and the `lib/outbox`** (retry with backoff, clock offset, 72 h and 10 min clock-trust rule). **[Eng]** 📄 04 §7
- [ ] **2.21 Build `pack-build` and `lib/packs`:** signature check, 25 MB cap, LRU eviction, and a pack budget of 120 KB or less. Mark responses `key_on_device`. **[Eng]**
- [ ] **2.22 Pass every row of the interruption matrix in 10 §3.** **[QA]**

### 2E. Practice tests (4 Jan – 25 Jan) ⟶ 1.4
- [ ] **2.23 Load the `test_blueprints` config** with verified NCEE values. **[Academic + Eng]**
- [ ] **2.24 Build `test-start`, `test-resume` and `test-finish`:** a server timer, 15 min grace, 2 resumes within 20 min total pause, finalisation of abandoned tests, and `suspect_timing`. **[Eng]** 📄 02 §5.2, KID-04
- [ ] **2.25 Build the test UI:** an offset-synced timer, free navigation, and flags. It must handle 100 items on a 3 GB device without a tab reload. **[Eng]**

### 2F. Parents, teachers, schools (11 Jan – 1 Feb)
- [ ] **2.26 Build `report-weekly`** (Sunday 18:00) and the in-app report (FAM-04), with the Common Entrance coverage disclaimer. **[Eng]** 📄 02 §8
- [ ] **2.27 Build `messages-dispatch`:** a monthly WhatsApp/SMS summary, quiet hours, and the note from Auntie Stella. **[Eng]**
- [ ] **2.28 Build the data rights flow:** `data-export` (7 days), `data-delete` (30 days) and consent withdrawal in 2 taps (FAM-05/06). **[Eng]**
- [ ] **2.29 Build the teacher dashboard:** the class grid with shape-coded states, the needs-help list, and assigning sets (SCH-04/05). **[Eng]**
- [ ] **2.30 Build the school overview:** licence usage and Common Entrance coverage by class. **[Eng]**
- [ ] **2.31 Build Stardust, days in a row and clouds in the UI.** Use calm celebrations and no loss-framing copy (KID-06). **[Eng/Design]**

### 2G. Content studio and authoring (30 Nov – end Feb)
- [ ] **2.32 Build the studio:** author, review and publish workflow, versioning, publish checks, KaTeX at publish, and a readability check (CON-01…03). **[Eng]** 📄 03 §6
- [ ] **2.33 Author the item pool:** about 1,800–2,200 items, ~74 lessons, 5 placement checks and 3 test forms (from a reserved pool). Prioritise Maths and English in school-calendar order. **[Content team]**
- [ ] **2.34 Run 10% second-review sampling,** keeping the error rate below 1%. **[Academic lead]**
- ✅ **M3, content alpha (15 Jan):** at least 40% of the pool published and reviewed. M4 needs at least 70%.

### 2H. Quality, ops, analytics (continuous)
- [ ] **2.35 Set up the CI pipeline:** lint → Vitest → pgTAP → Playwright → Lighthouse CI and bundle budgets → preview → staging → tagged production. **[Eng]** 📄 11 §2
- [ ] **2.36 Cover the 10 key journeys in Playwright** on mobile Chromium and WebKit, in light and dark. **[QA]** 📄 10 §2
- [ ] **2.37 Set up the device lab:** an entry Android Go phone, the reference phone, a tablet, an iOS 16 phone and a lab PC. Test on entry devices from M2. **[QA]**
- [ ] **2.38 Set up monitoring:** Sentry with PII scrubbing, an uptime monitor, latency and sync-backlog alerts, and cost alerts. **[Eng]** 📄 11 §5
- [ ] **2.39 Add the first-party `events` catalogue** with hashed child IDs, plus the Metabase dashboards. **[Eng]** 📄 06 §7, 12 §4
- [ ] **2.40 Apply the security baseline:** CSP, `frame-ancestors 'none'`, Renovate, `pnpm audit`, secrets rotation and backup restore drills. **[Eng]** 📄 07 §6, 11 §3–4
- [ ] **2.41 Build the `/basic` server-rendered mode for Opera Mini** (lessons and untimed practice). **[Eng]**

## Phase 3: Pilot readiness (11 Jan – 29 Jan 2027)

- [ ] **3.1 Get the DPIA signed.** It must cover scoring, the guardian view, gamification, analytics, hosting and transfer, and messaging. **[DPO]** 📄 07 §1
- [ ] **3.2 Get a lawyer to approve** the consent notice, the non-affiliation line and all public wording. **[Lawyer]**
- [ ] **3.3 Sign processor DPAs** (Supabase, Vercel, messaging, Sentry, Paystack) and school DPAs. **[Legal]**
- [ ] **3.4 Finish the breach runbook** and set up the NDPC 72-hour notification path. **[DPO + Eng]** 📄 07 §7
- [ ] **3.5 Register the SMS sender ID** at least 3 weeks before the pilot. **[Eng]** 📄 11 §7
- [ ] **3.6 Prepare school materials:** a parent letter (plus local-language versions), a consent explainer, a teacher card and a poster. **[School success]** 📄 13 §2
- [ ] **3.7 Run the release checklist:** TalkBack, light and dark by eye, tokens contrast, a manual offline run, a clean forbidden-phrase lint, and release notes. **[QA]** 📄 10 §6
- ✅ **M4, pilot-ready (29 Jan):** all MVP stories accepted, DPIA signed, budgets green, TalkBack passed, and at least 70% of the item pool published.

## Phase 4: Pilot (1 Feb – ~3 May 2027)

- [ ] **4.1 Onboard the first 5 schools** using the 2-week playbook (DPA → admin → training → classes → parents at 70% or more → first class-mode session). **[School success]**
- ✅ **M5, pilot live (1 Feb).**
- [ ] **4.2 Scale to 5–10 schools,** and track the weekly KPIs on the pilot health dashboard. **[Founder]** 📄 12 §2
- [ ] **4.3 Finish authoring the full pool before the NCEE.** **[Content]**
- [ ] **4.4 Run the support SLAs and content error triage.** **[Ops]** 📄 13 §4
- [ ] **4.5 Measure the Opera Mini share** to decide whether to invest further in `/basic`. **[Eng]**
- [ ] **4.6 Get the external pen test booked** before any public launch. **[Eng]**

## Phase 5: Gate (mid-May 2027)

- [ ] **5.1 Evaluate the pilot gate.** All five must hold: weekly active pupils at 50% or more in 6 of 8 weeks; a gain on retention checks; renewal intent at 70% or more; no open privacy incident with the DPIA current; and 100% of items with verified answers. **[Founder]** 📄 12 §3
- [ ] **5.2 Optionally, with consent, collect NCEE outcomes** and publish the findings with the error band. **[Product]**
- ✅ **M6, gate passed: done for the MVP.**

## After the gate (only if M6 passes)
- **Phase 2, Intermediate (2027/28 Terms 1–2):** P1–6 Maths and English, Basic Science, a parent add-on through Paystack, and Yoruba, Hausa and Igbo strings.
- **Phase 3, Early years:** a design study with 3 schools, then teacher-led creche and KG activities.
- **Later:** a native Android wrapper, licensed past papers, and validated outcome reporting.

---

### Critical path
NCEE confirmation (1.4) → blueprints (2.23) → practice tests (2.24). In parallel: lawyer (1.6) → consent functions (2.5) → DPIA (3.1) → M4. Content authoring (2.33) is the longest single stream at about 90 days, so start it in week 2.
