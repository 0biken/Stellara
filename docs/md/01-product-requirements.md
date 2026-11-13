# 01 · Product requirements

| | |
|---|---|
| **Product** | Stellara for Kids (working name, not yet cleared) |
| **Version** | 1.0 draft, 12 November 2026 |
| **Owner** | Founder / Product lead |
| **Status** | For review. Supersedes the earlier all-ages PRD for the children's product. |

## 1. Vision

A personal tutor that knows your child. Stellara teaches in short daily steps, checks what has truly been learned, and shows parents exactly where their child stands, from kindergarten to the Common Entrance examination.

Learning grows. Every skill a child masters becomes a star, and mastered stars sprout. Over a term the stars join into the child's own sky: something children are proud of and parents can trust.

## 2. Why now, and for whom

Stellara has direct relationships with a number of private primary schools. Those schools report two problems:

1. **Parents want proof of progress.** Termly report cards and occasional WhatsApp messages from teachers are not enough.
2. **Schools want better Common Entrance results.** Results are part of how a school markets itself.

Stellara is therefore sold **to schools first** (business to school to parent). Parents and children are the daily users; the school is the buyer and the channel.

## 3. Users

| User | Age | Needs | Primary surfaces |
|---|---|---|---|
| **Child, early years** | 2–5 | Play-based early learning with an adult. Very little screen time. | Phase 3 only: parent- and teacher-led activities |
| **Child, primary** | 6–12 | Short daily practice, clear progress, encouragement | Child app (phone, tablet, school device) |
| **Child, Common Entrance candidate** | 9–12 (Primary 5–6) | Exam-format practice, timing, knowing what to work on | Child app, practice tests |
| **Parent or guardian** | Adult | Proof of progress, simple guidance, control over data | Parent app, weekly report, WhatsApp summary |
| **Class teacher** | Adult | See class progress, assign practice, spot who needs help | Teacher dashboard |
| **School administrator** | Adult | Licences, classes, parent onboarding, results overview | School admin console |
| **Content author** | Adult | Write lessons and items in the agreed schema | Content studio |
| **Academic reviewer** | Adult | Approve content, verify answers | Content studio |
| **Stellara operations** | Adult | Support, school onboarding, data requests | Internal admin |

Every user under 18 is a **child** under the Nigeria Data Protection Act. No child creates their own account. See [07 Privacy, security and compliance](07-privacy-security-compliance.md).

## 4. The three sections and phasing

| Section | Who | Content | Phase |
|---|---|---|---|
| **Common Entrance prep** | Primary 5–6 | NCEE papers: Mathematics, English, Quantitative Aptitude, Verbal Aptitude, General Paper *(verify against the 2027 NECO brochure)* | **MVP (Phase 1)** |
| **Intermediate** | Primary 1–6 | Mathematics and English Studies first, then Basic Science and Technology | Phase 2 |
| **Creche and kindergarten** | Ages 2–5 | Early literacy, numeracy, routines, development milestones. Adult-led, minimal screen use | Phase 3 |

The data model supports all three from day one (see [05 Data model](05-data-model.md)), so later phases add content and screens, not rebuilds.

## 5. MVP scope (Phase 1)

### In

1. **School onboarding.** Stellara staff create a school, the school admin invites teachers, and teachers create classes.
2. **Parent-led child profiles.** Parents join with a class invite code, give consent, and create the child's profile.
3. **Child sign-in without credentials.** On a family phone: a profile picker with a 4-picture PIN. On a school device: a class code plus the picture PIN.
4. **Placement check.** About 20 items per paper, optional and resumable. Results are reported at strand level only.
5. **Learning path.** Short lesson cards (5–8 minutes) followed by practice items on each topic.
6. **Practice and review.** Scored practice, spaced review at +3, +10 and +30 days (capped by the exam date), and topic assessments.
7. **Practice tests.** Timed, NCEE-style tests on a server-controlled timer. They can be resumed after an interruption.
8. **Mastery.** Mastery rule v0, five levels per topic, shown as constellation stars. See [02 Learning rules](02-learning-rules.md).
9. **Motivation.** Stardust (points with a daily cap), days in a row with resting clouds, and calm celebrations.
10. **Offline practice.** Downloadable practice packs, answers saved on the device first, automatic sync.
11. **Parent report.** A weekly in-app report plus a monthly WhatsApp or SMS summary, including "a note from Auntie Stella".
12. **Teacher dashboard.** Class view by topic and mastery state, pupils who need help, and the ability to assign a practice set.
13. **School overview.** Licence usage and Common Entrance coverage by class.
14. **Content studio.** Author, review and publish items and lessons, with provenance and versioning.
15. **Compliance foundations.** Consent records, a data export or delete request flow, an audit log and a non-affiliation notice.

### Out of the MVP (with the condition for bringing it back)

| Feature | Return condition |
|---|---|
| Intermediate section (P1–6 full curriculum) | Phase 2, once the pilot gate is passed |
| Creche/KG section | Phase 3, after an early-years design study with 3 schools |
| Leaderboards | Only if pilot data shows a need; opt-in for ages 10+, aliases only |
| Video lessons, YouTube embeds | After a DPIA update and data-cost review |
| AI-generated hints or chat | Not for children until a DPIA and DPO sign-off |
| Direct-to-parent paid subscriptions | Phase 2. The MVP is sold through school licences |
| Native Android app | When the PWA install rate or offline needs show a gap |
| Yoruba, Hausa and Igbo interfaces | Strings are ready from day one; translation comes in Phase 2 |

## 6. Principles that shape every feature

1. **Learning is measured by rules, not opinions.** Every status shown to a parent comes from a published rule.
2. **Nothing is earned by opening a page.** Stardust and mastery come from answering, not viewing.
3. **No loss-framing.** No broken-streak guilt, no countdowns other than real exam timers, no "hurry".
4. **Honest about the exam.** Stellara shows practice coverage and mastery, never a predicted score and never "you are ready".
5. **Light on data and kind to cheap phones.** See the budgets in [09 Frontend guidelines](09-frontend-guidelines.md).
6. **Children's data is minimal.** Collect a first name, a class, a year of birth and progress. No photos of children, and no free-text input from children in the MVP.

## 7. User stories and acceptance criteria

The IDs are used in tests ([10 QA and testing](10-qa-and-testing.md)).

### 7.1 Schools and teachers

**SCH-01** As a Stellara operator, I can create a school with a licence count and term dates.
- AC1: The school cannot invite teachers until a named school admin has accepted the data processing agreement.
- AC2: Licence count and dates are visible to the school admin.

**SCH-02** As a school admin, I can invite teachers by phone number or email.
- AC1: An invite expires after 7 days.
- AC2: A teacher sees only the classes assigned to them (enforced by row-level security, tested in pgTAP).

**SCH-03** As a teacher, I can create a class (for example "Primary 5 Gold") and get a class invite code for parents.
- AC1: The code is 6 characters, contains no ambiguous characters, and can be regenerated.
- AC2: A child joins a class only after a parent has given consent (see FAM-02).

**SCH-04** As a teacher, I can see a class grid of topics by pupils with mastery states.
- AC1: States use shape as well as colour (outline, half, full, ringed).
- AC2: A "needs help" list shows pupils with 3 or more topics at Foundation after at least 20 scored responses.

**SCH-05** As a teacher, I can assign a practice set (topic or mixed) to a class with a due date.
- AC1: Assigned sets appear first on the child's home screen.
- AC2: Completion and the median score are shown to the teacher.

### 7.2 Families

**FAM-01** As a parent, I can sign up with a phone number (OTP by WhatsApp, then SMS) or with email.
- AC1: An OTP expires after 10 minutes. After 5 failed attempts in 15 minutes, sign-in is blocked for 30 minutes.

**FAM-02** As a parent, I give consent before a child profile exists.
- AC1: **No child profile row exists without a consent record** (database constraint plus test).
- AC2: The consent record stores who consented, which child, the notice version, purposes, a timestamp and the verification method.
- AC3: Each purpose is separately selectable: core learning (required), school sharing (required for school accounts), progress messages, product research.

**FAM-03** As a parent, I create a child profile with a first name, year of birth, class code and an avatar chosen from a set.
- AC1: Photo upload is not available.
- AC2: The child chooses a 4-picture PIN on first use, and the parent can reset it.

**FAM-04** As a parent, I receive a weekly report.
- AC1: Every sentence is generated from rules in [02 Learning rules §8](02-learning-rules.md#8-parent-report-rules).
- AC2: The report never shows a predicted score or the phrase "ready for".

**FAM-05** As a parent, I can export or delete my child's data.
- AC1: Export is delivered within 7 days as JSON plus a readable PDF.
- AC2: Deletion removes the child's personal data within 30 days and keeps only anonymised aggregate counts.

**FAM-06** As a parent, I can withdraw consent as easily as I gave it.
- AC1: Withdrawal takes 2 taps from Settings. Processing stops immediately, and deletion follows FAM-05.

### 7.3 Children

**KID-01** As a child, I pick my profile and enter my picture PIN.
- AC1: After 5 wrong PINs, the profile is locked for 5 minutes and a parent can unlock it.

**KID-02** As a child, I see my sky: today's suggested set, assigned sets, and my constellation.
- AC1: The first screen is usable within 5 seconds on the reference device (see [09](09-frontend-guidelines.md#4-performance-budgets)).

**KID-03** As a child, I take a short lesson and then practise.
- AC1: Practice items are scored on the server. On a correct first attempt, the child sees feedback within 100 ms locally (optimistic), and the server confirms it.
- AC2: A wrong answer shows one hint and then the worked explanation. It never says "wrong"; it says "Not quite".

**KID-04** As a Common Entrance candidate, I take a timed practice test.
- AC1: The server owns the start time and the end time. A lost connection does not stop the clock, and answers saved locally are accepted up to 15 minutes after the end time if they were recorded before it.
- AC2: A test can be resumed twice, with a total pause time of up to 20 minutes. After that it is scored as it stands.
- AC3: Answer keys are never sent to the device for a practice test.

**KID-05** As a child, I can practise offline with a downloaded pack.
- AC1: A pack of 40 items with images is under 120 KB.
- AC2: Offline responses sync automatically when online. They count towards days in a row if synced within 72 hours.

**KID-06** As a child, I get Stardust and keep my days in a row.
- AC1: The rules are as in [02 §6–7](02-learning-rules.md#6-stardust).
- AC2: A missed day uses a resting cloud automatically. The copy never mentions losing anything.

### 7.4 Content team

**CON-01** As an author, I create items in the schema in [03](03-curriculum-and-content.md#4-content-schema).
- AC1: An item cannot be published without provenance, a verified answer, a reviewer other than the author, alt text for every image, and a curriculum tag.

**CON-02** As a reviewer, I approve, reject or request changes, with comments.
- AC1: Every state change is in the audit log.

**CON-03** As an author, I edit a published item by creating a new version.
- AC1: Responses keep the item version they were answered against.

## 8. Non-functional requirements (summary)

| Area | Requirement | Detail |
|---|---|---|
| Performance | First-visit critical path ≤ 200 KB; interactive in under 5 s on the reference phone at 1.6 Mbps | [09](09-frontend-guidelines.md) |
| Offline | Practice packs and lessons work offline; sync is automatic | [04](04-technical-architecture.md#offline-and-sync) |
| Accessibility | WCAG 2.2 AA; TalkBack pass on the key flows | [08](08-design-system.md#9-accessibility), [10](10-qa-and-testing.md) |
| Security | OWASP ASVS Level 2; RLS on every table | [07](07-privacy-security-compliance.md) |
| Privacy | NDPA; DPIA signed before the pilot; consent before any child data | [07](07-privacy-security-compliance.md) |
| Availability | 99.5% monthly for the child app during term | [11](11-devops-and-environments.md) |
| Browsers | Chrome Android 100+, Samsung Internet, Opera (full mode), Safari iOS 16+. Opera Mini gets a basic server-rendered mode with no timed tests | [09](09-frontend-guidelines.md) |

## 9. Success measures

Targets and the pilot gate are in [12 Analytics and metrics](12-analytics-and-metrics.md). In short: weekly active pupils, the parent report open rate, topics mastered per pupil per month, a measurable gain on delayed retention checks, and school renewal intent.

## 10. Open questions

| # | Question | Owner | Needed by |
|---|---|---|---|
| Q1 | 2027 NCEE papers, item counts, durations, and whether it is paper or CBT | Academic lead | Before practice-test blueprints are final |
| Q2 | Price per pupil per term for schools; is a parent add-on allowed? | Founder | Before pilot contracts |
| Q3 | Parental verification method that satisfies NDPA s.31 | Lawyer | Before the pilot |
| Q4 | Product name clearance | Trademark agent | Before any public launch |
| Q5 | Supabase hosting region and the cross-border transfer basis | DPO, engineering | Before the pilot |
