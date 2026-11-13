# 10 · QA and testing

## 1. Test pyramid

| Layer | Tool | Scope | Gate |
|---|---|---|---|
| Rules unit tests | Vitest | `packages/rules`: every fixture in [02 §10](02-learning-rules.md#10-fixtures), plus property tests | 100% of fixtures pass; branch coverage ≥ 90% |
| Schema and RLS | pgTAP | Every table policy: allow and deny cases; constraints (consent, append-only, publish checks) | All pass |
| Edge Functions | Deno test + local Supabase | Contracts in [06](06-api-and-events.md), idempotency, rate limits | All pass |
| Components | Storybook + axe + visual snapshots | Every state in [08 §6](08-design-system.md#6-components) | No axe violations |
| End to end | Playwright (mobile viewport, throttled) | Key journeys (§2) | All pass on Chromium mobile and WebKit |
| Performance | Lighthouse CI + bundle check | Budgets in [09 §4](09-frontend-guidelines.md#4-performance-budgets) | Within budget |
| Manual | Device lab, TalkBack, school walkthrough | Release checklist (§6) | Signed off |

## 2. Key journeys (Playwright)

1. School admin invites a teacher → the teacher creates a class → gets a join code.
2. A parent signs up with an OTP → consents → creates a child with the join code.
3. The child sets a PIN → does the placement check → sees the sky.
4. The child takes a lesson → practice set → mastery changes appear.
5. The child downloads a pack → goes offline → answers 10 items → comes back online → sync → the day is credited.
6. The child starts a practice test → loses connection for 3 minutes → keeps answering → reconnects → finishes; the score is correct.
7. The child closes the app mid-test twice → resumes → the third resume is refused and the test is finalised.
8. A teacher assigns a set → the child sees it first → the teacher sees completion.
9. Weekly report generation → the parent opens the report → no forbidden phrases (§4).
10. The parent requests export and deletion → requests are fulfilled within the SLA in staging.

## 3. Offline and interruption matrix

| Scenario | Expected |
|---|---|
| Airplane mode mid-practice set | Answers saved; "Saved, will sync" note; no data lost |
| Tab killed by the OS during a set | Reopening resumes at the next unanswered item |
| Device clock 2 hours wrong | Server receive time used for the learning day |
| Sync after 80 hours offline | Responses stored; the day is not credited for the streak |
| Two children on one phone | No mixing of outboxes or caches |
| Duplicate submission (retry) | One attempt row per `client_id` |
| Low storage (< 50 MB free) | Packs refuse to download, with a clear message |
| 2G (≈ 50 kbps) | Shell loads from cache; set starts within 10 s when online |

## 4. Content and copy checks

- Automatic: publish checks ([03 §6](03-curriculum-and-content.md#6-workflow)); maths renders; images have alt text; readability score.
- Forbidden-phrase lint across i18n catalogues, WhatsApp/SMS templates and email templates: `weak`, `failed`, `ready for`, `guarantee`, `don't lose`, `hurry`, `expo`, `runz`, `live question`, `AI`, `streak`, `behind`, `last chance`, `dear parent`, `do not reply`, `(s)`, `light mode`, `dark mode`.
- Message checks: SMS templates are GSM-7 only and one segment (160 characters) with the longest sample values; email subjects ≤ 45 characters and preheaders ≤ 90 (`node docs/tools/emails.mjs` warns); every email has a plain-text version.
- Email rendering: each template checked in Gmail (Android and web), Outlook, Apple Mail and Yahoo, in light and dark, before first use.
- Theme check: every Storybook story and every key journey runs axe and a visual snapshot in **both light and dark** (Playwright `colorScheme: 'light' | 'dark'`), plus once with `data-theme` forced against the opposite device setting.
- Sampling: 10% of newly published items each week get a second reviewer; the error rate must stay below 1%.

## 5. Device lab (minimum)

| Device | Why |
|---|---|
| Entry Android Go phone (2 GB RAM) | Worst realistic case |
| Mid-range Android (₦100k–150k, 3–4 GB) | Reference device |
| Samsung tablet (school use) | Class mode |
| Older iPhone (iOS 16) | Parents on iOS |
| Shared Windows PC with Chrome | School computer labs |

## 6. Release checklist

- [ ] All automated gates green
- [ ] Rules version bumped if any rule changed; fixtures updated
- [ ] Migrations reviewed, reversible or with a documented forward-fix
- [ ] TalkBack pass on the key journeys
- [ ] Key journeys checked by eye in light and dark on the reference device
- [ ] `node docs/tools/tokens.mjs` passes (contrast, both themes)
- [ ] Manual offline run on the entry device
- [ ] Forbidden-phrase lint clean
- [ ] Privacy review if new data or a new processor is involved
- [ ] Release notes for schools (plain language)
