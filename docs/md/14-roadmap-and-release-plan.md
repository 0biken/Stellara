# 14 · Roadmap and release plan

Dates assume a start on **16 November 2026** and a 2027 NCEE in the second quarter of 2027. **Confirm the actual 2027 NCEE date with NECO**: the pilot timeline depends on it.

## 1. Phases

```mermaid
gantt
  title Stellara for Kids: plan (draft)
  dateFormat  YYYY-MM-DD
  section Foundations
  Decisions, lawyer, DPO, trademark search :a1, 2026-11-16, 21d
  Rules appendix + fixtures (02)          :a2, 2026-11-16, 14d
  Content schema frozen (03)              :a3, 2026-11-23, 7d
  section Build (MVP)
  Platform: auth, consent, schools        :b1, 2026-11-30, 28d
  Learning runtime, sets, mastery         :b2, 2026-12-07, 35d
  Offline packs + sync                    :b3, 2026-12-28, 21d
  Practice tests + timer                  :b4, 2027-01-04, 21d
  Parent report + messaging               :b5, 2027-01-11, 14d
  Teacher + school views                  :b6, 2027-01-11, 21d
  section Content
  Authoring + review (MVP pool)           :c1, 2026-11-30, 90d
  section Pilot
  DPIA signed, notices, sender ID         :p0, 2027-01-11, 14d
  Pilot in 5–10 schools                   :p1, 2027-02-01, 75d
  NCEE (date to confirm)                  :milestone, p2, 2027-04-24, 0d
  Pilot review + gate                     :p3, 2027-05-03, 14d
```

## 2. Milestones and exit criteria

| Milestone | Date (target) | Exit criteria |
|---|---|---|
| M0 Decisions | 4 Dec 2026 | Scope, price hypotheses, stack confirmed; lawyer and DPO engaged; trademark search ordered |
| M1 Rules frozen | 30 Nov 2026 | `packages/rules` passes all fixtures; product sign-off |
| M2 Walking skeleton | 18 Dec 2026 | School → teacher → class → parent consent → child → one practice set, end to end in staging |
| M3 Content alpha | 15 Jan 2027 | ≥ 40% of the MVP item pool published and reviewed |
| M4 Pilot-ready | 29 Jan 2027 | All MVP stories accepted; DPIA signed; budgets green; TalkBack pass; ≥ 70% of the item pool |
| M5 Pilot live | 1 Feb 2027 | First 5 schools onboarded |
| M6 Gate | mid-May 2027 | Pilot gate ([12 §3](12-analytics-and-metrics.md#3-pilot-gate-go--no-go-for-phase-2)) evaluated |

## 3. Phase 2 and 3 (after the gate)

| Phase | Scope | Rough timing |
|---|---|---|
| Phase 2: Intermediate | Primary 1–6 Mathematics and English; Basic Science; parent add-on; Yoruba, Hausa and Igbo interface strings | Terms 1–2 of 2027/28 |
| Phase 3: Early years | Creche and KG: teacher-led activities, routines and milestones; parent tips; minimal child screen use | From Term 2 of 2027/28, after a design study |
| Later | Native Android wrapper if needed; licensed past-question packs if a licence is obtained; validated outcome reporting | Data-dependent |

## 4. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Content not ready in time | Thin practice, weak mastery evidence | Start authoring in week 2; prioritise Maths and English; publish topics in order of the school calendar |
| Consent friction | Low activation | Run consent through schools; simple notice; lawyer-approved second check |
| NCEE format differs from the assumptions | Wrong practice tests | Blueprints are configuration; verify early |
| Low-end devices struggle | Poor experience | Budgets in CI; entry-device testing from M2 |
| Supabase region latency | Slow scoring | Measure from Lagos in week 1; tune batching; optimistic UI for offline packs |
| Name conflict | Rebrand cost | Trademark search now; identity built around Auntie Stella and the constellation |

## 5. Open questions register

| # | Question | Owner | Status |
|---|---|---|---|
| Q1 | 2027 NCEE papers, counts, durations, mode, date | Academic lead | Open |
| Q2 | School pricing and pilot terms | Founder | Open |
| Q3 | Parental verification method under NDPA s.31 | Lawyer | Open |
| Q4 | Name clearance | Trademark agent | Open |
| Q5 | Supabase region and transfer basis | DPO + engineering | Open |
| Q6 | Messaging provider for WhatsApp and SMS | Engineering | Open |
| Q7 | Commissioned Auntie Stella illustration | Design | Open (placeholder in use) |
