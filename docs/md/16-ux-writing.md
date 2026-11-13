# 16 · UX writing

Every word in Stellara is part of the design. This guide covers the app, notifications, WhatsApp, SMS and email. The look is sweet; the words are **sweet in moments and plain in facts**. A child should feel encouraged, and a parent should know exactly what happened and what to do next.

Strings live in `packages/i18n` (ICU MessageFormat). Email templates are in `docs/emails/` and are built by `docs/tools/emails.mjs`. The voice rules in [08 §10](08-design-system.md#10-voice-in-the-interface) are summarised here and extended.

## 1. Principles

1. **Kind and true.** We never shame, nag or exaggerate. We never hide a problem either: "Not quite" is kind *and* honest.
2. **Specific beats general.** "9 of the last 10 right" beats "Great progress!". Praise names what went right.
3. **One idea per line.** Children read one short idea at a time. Parents get the fact first and the detail second.
4. **Same thing, same name.** A feature keeps one name everywhere: app, WhatsApp, email, school letters. A button called "Start today's set" leads to a screen titled "Today's set".
5. **Sweet in moments, plain in facts.** Garden and sky words belong to celebrations, Auntie Stella, and the names of things. Settings, consent, money, errors and data use plain words.
6. **Nothing to lose.** Progress only grows. We never say lose, break, miss, fail, behind or last chance.

## 2. Three voices

| Voice | Speaks to | Sounds like | Rules |
|---|---|---|---|
| **Auntie Stella** | Children | A patient auntie at the kitchen table | Ages 4–7: ≤ 8 words a line, read aloud. Ages 8–12: ≤ 15 words. One exclamation mark per screen at most. "My dear" no more than once a session |
| **Stellara** | Parents and guardians | A trusted class teacher writing a note home | Evidence first. Full sentences. No exclamation marks, no emoji in the app. Uses the child's first name, never "your child" when the name is known |
| **Stellara for schools** | Teachers, heads, proprietors | A capable colleague | Short, factual, numbers first. No sweetness beyond the brand names |

### 2.1 Tone dial

| Moment | Warmth | Detail | Example |
|---|---|---|---|
| Child gets it right | High | Low | "Well done! You found it." |
| Child gets it wrong | High | One next step | "Not quite. Look at the bottom numbers first." |
| Topic mastered | Highest | Low | "Your Fractions star sprouted." |
| Parent report | Medium | High | "Tolu practised on 5 days and mastered Fractions." |
| Consent and privacy | Low, respectful | Complete | "You can withdraw consent at any time in Settings. We then stop using Tolu's data and delete it within 30 days." |
| Errors | Calm | What to do | "That code has expired. We've sent a new one." |
| Security notice | Serious | Complete | No sweetness at all. See §9.9 |

### 2.2 How we address parents

At sign-up we ask **"What should we call you?"** with an example ("Mummy Tolu", "Mrs Adeyemi", "Funmi"). Every message uses that name. Respectful address matters to Nigerian families, and a guess ("Hi Olufunmilayo!") feels like a mass mailing. If no name is set, we use "Hello" alone.

## 3. Names of things

Use these words exactly. The QA lint ([10 §4](10-qa-and-testing.md#4-content-and-copy-checks)) checks the "Never" column.

| Thing | Children see | Parents and schools see | Never |
|---|---|---|---|
| The child's progress map | **Your sky** | Tolu's sky | Dashboard, skill tree, map |
| A topic | A star | Topic | Skill node, unit |
| Topic at `mastered` | **Sprouted** | Mastered | Completed, done, passed |
| Topic below `developing` | A star waiting for you | Not yet / Getting started | Weak area, failing |
| Points | **Stardust** | Stardust | XP, coins, gems, points |
| Daily habit | **Days in a row** | Days in a row | Streak (in copy), chain |
| A missed day covered automatically | **Resting cloud** | Resting cloud | Freeze, lost day, missed |
| Today's suggested practice | **Today's set** | Today's set | Homework (unless a teacher assigned it), task |
| A set a teacher assigned | **From your teacher** | Assigned set | Homework due, overdue |
| Timed exam practice | **Practice test** | Practice test | Mock exam, exam, real questions |
| Share of the syllabus practised | n/a | Coverage | Readiness, predicted score, chance of passing |
| Parent's weekly summary | n/a | **Weekly report** | Scorecard, results |
| Short message in the report | n/a | **A note from Auntie Stella** | AI summary, insight |
| Child sign-in | **Your picture key** | Picture key | PIN (to children), password |
| School's join code | n/a | School code | Access token, licence key |
| Light theme | n/a | **Daytime** | Light mode |
| Dark theme | n/a | **Starlight** | Dark mode, night mode |
| Follow the device | n/a | **Match my phone** | System, auto |

## 4. Daytime and Starlight (appearance)

The two themes are named for the sky the whole product is built on. Parents choose in *Settings → How Stellara looks*.

| Option | Label | Description shown under it |
|---|---|---|
| Follow the device (default) | **Match my phone** | Switches between Daytime and Starlight with your phone's setting. |
| Light | **Daytime** | Cream and honey. Bright and clear for daytime. |
| Dark | **Starlight** | Warm cocoa. Gentle on the eyes in the evening. |

- On compact toggles (the brand kit, the docs) the labels are **Auto · Daytime · Starlight**.
- The setting is stored on this device only. The confirmation reads: "Saved on this phone. Other phones keep their own setting."
- Children have no switch. When the device moves to dark, the child's app simply becomes Starlight. Auntie Stella may say once, the first time: "The stars are out. Let's learn by starlight."
- Teachers see the same three options in *Account → How Stellara looks*.

## 5. Mechanics

| Topic | Rule | Example |
|---|---|---|
| Spelling | British/Nigerian English. "Practise" is the verb, "practice" the noun | "Practise Ratios", "Practice test" |
| Case | Sentence case everywhere: titles, buttons, tabs, email subjects | "Start today's set" |
| Buttons | Verb first, and name the result. Two words is ideal, four the maximum | "Check", "Next question", "Send report" |
| Same name through a flow | A button's verb appears in the confirmation | "Send invite" → "Invite sent" |
| Numbers | Digits always, even one to nine, so children can scan them | "3 stars", "1 day" |
| Money | ₦ with commas, no kobo unless needed. In SMS write "NGN" (see §8.2) | ₦25,000 |
| Dates | Day, date, short month. Lagos time | Tue 14 Jan |
| Times | 12-hour with "am"/"pm", no leading zero | 5:00 pm |
| Ranges | En dash, no spaces | 10–15 minutes |
| Plurals | ICU plural rules, never "(s)" | "1 star" / "2 stars" |
| Exclamation marks | Children: one per screen at most. Adults: none | |
| Emoji | None in the app UI. WhatsApp only, at most one per message, from ⭐ 🌱 ☁️ | |
| Names | The child's first name; never a surname in child-facing copy | Tolu |
| Gender | "They" for a child when a pronoun is unavoidable; better, repeat the name | "Tolu practised on 5 days." |
| Exams | Plain text names only, with "Stellara is not affiliated with NECO or any exam body" wherever a paper is named in marketing or reports | |

## 6. In the app

### 6.1 Children (ages 8–12 shown; ages 4–7 use the shorter line in brackets)

| Moment | Copy |
|---|---|
| Choose profile | "Who's learning today?" |
| Picture key | "Tap your 4 pictures." · Wrong: "Not quite. Try again." · Locked: "Let's take a short rest. Ask a grown-up to help." |
| Home, first visit | "Hello Tolu. This is your sky. Every topic is a star." ("Hello Tolu! This is your sky.") |
| Home, returning | "Welcome back, Tolu. Today's set is ready." ("Ready, Tolu?") |
| Today's set card | Title: "Today's set" · Detail: "10 questions · about 10 minutes" · Button: "Start today's set" |
| Question header | "Fractions · 6 of 10" |
| Correct (rotate, no repeat within 5) | "Correct." · "Yes, that's it." · "Well done. That's 4 in a row." · "Exactly right." ("Well done!" · "You found it!" · "Yes!") |
| Not quite (one hint follows) | "Not quite. Look at the bottom numbers first." · "Not this time. Check the tens column." ("Not quite. Let's look again.") |
| Hint button | "Ask Auntie Stella" |
| After the worked answer | Button: "Got it" |
| Set finished | "Set done. You answered 8 of 10 correctly and earned 40 Stardust." ("All done! 40 Stardust for you.") |
| Star sprouted | "Your Fractions star sprouted." Second line: "You got 9 of the last 10 right." ("Your star sprouted!") |
| Resting cloud used | "Yesterday was a resting day. Your 6 days in a row are safe." ("You rested yesterday. Shall we start?") |
| Stardust daily cap reached | "That's all the Stardust for today. Keep practising if you like; your stars still grow." |
| Offline | "No internet right now. You can keep practising; we'll save your answers." |
| Back online, synced | "All your answers are saved." |
| Practice test intro | "Practice test: Mathematics. 40 questions · 45 minutes. The timer keeps going if the internet drops." Button: "Start practice test" |
| Practice test, 5 minutes left | "5 minutes left. Take your time with the last few." |
| Practice test submit | "Hand in your test?" · "You have 3 unanswered questions." · Buttons: "Hand in" / "Keep going" |
| Practice test result | "You answered 31 of 40 correctly." Then by strand. Never a grade, never "pass" |
| Empty sky (new child) | "Your sky is waiting. Start today's set to light your first star." |

### 6.2 Parents

| Moment | Copy |
|---|---|
| Welcome | Title: "A personal tutor that knows your child" · Body: "Short daily practice, real progress you can see, and a weekly report from Stellara." · Button: "Get started" |
| Phone sign-in | Label: "Your phone number" · Help: "We'll send a 6-digit code by WhatsApp. If WhatsApp isn't available, by SMS." · Button: "Send code" |
| Code entry | "Enter the 6-digit code we sent to 0803 *** 4421." · Link: "Send a new code" (enabled after 30 seconds: "Send a new code in 0:24") |
| What should we call you | Label: "What should we call you?" · Help: "For example: Mummy Tolu, Mrs Adeyemi, Funmi." |
| Consent | Title: "Before Tolu starts" · Body: plain list of what we collect and why (see [07](07-privacy-security-compliance.md)) · Toggles named by purpose · Button: "I agree and give consent" · Under it: "You can change this at any time in Settings." |
| Add a child | "Child's first name" · "Class" · "School code (from Tolu's school)" · Button: "Add Tolu" → "Tolu has been added." |
| Picture key set-up | "Choose 4 pictures for Tolu. Tolu will tap them to sign in, so no password to remember." |
| Weekly report ready (in app) | Card: "Tolu's weekly report is ready" · Detail: "Mon 6 – Sun 12 Jan" · Button: "Read report" |
| Report headings | "This week" · "Something to celebrate" · "What to practise next" · "Common Entrance coverage" · "A note from Auntie Stella" |
| Coverage label | "Share of the syllabus practised, not a predicted score." |
| No practice this week | "Tolu didn't practise this week. A 10-minute set on Tuesday is a gentle way back in." |
| Rest mode | Title: "Rest mode" · "Pause days in a row for up to 14 days, for holidays or illness. You can use it twice a term." · Button: "Start rest mode" → "Rest mode is on until Sun 26 Jan." |
| Withdraw consent | Title: "Withdraw consent" · Body: "Stellara will stop using Tolu's data straight away and delete it within 30 days. Tolu won't be able to sign in." · Button: "Withdraw consent" → "Consent withdrawn. We've stopped using Tolu's data." |
| Delete account | Typed confirmation: "Type DELETE to confirm." · Button: "Delete account" |

### 6.3 Teachers and school admins

| Moment | Copy |
|---|---|
| Class home | "Primary 5 Gold · 28 pupils · 21 practised this week" |
| Assign a set | Button: "Assign set" · Sheet title: "Assign a set to Primary 5 Gold" · Confirmation: "Set assigned to 28 pupils." |
| Class grid legend | "Mastered · In progress · Not yet · Not started" |
| Pupil not practising | "Kemi hasn't practised for 7 days." (fact, no judgement) |
| Empty class | "No pupils yet. Share the school code with parents, or add pupils from a list." |
| Invite a teacher | Button: "Send invite" → "Invite sent to Mrs Okafor." |
| Licences | "212 of 250 licences in use." |

## 7. Errors

**Formula:** what happened, then what to do. Never blame the user, never apologise twice, never show a code without a sentence.

| Situation | Copy |
|---|---|
| Wrong OTP | "That code doesn't match. Check the latest message and try again." |
| Expired OTP | "That code has expired. We've sent you a new one." |
| Too many attempts | "Too many tries. For your security, wait 30 minutes and try again." |
| Invalid school code | "We can't find that school code. Check it with Tolu's school; it has 6 letters and numbers." |
| School out of licences | Parent: "Tolu's school has no places left right now. We've let the school know." · School: "A parent couldn't join: all 250 licences are in use." |
| Network | "Can't connect right now. Your work is saved on this phone." |
| Server error | "Something went wrong on our side. Please try again in a few minutes." (one apology, in this case only) |
| Pack too large for storage | "There isn't enough space on this phone for the offline pack. Free up about 5 MB and try again." |
| Form field | Under the field, specific: "Enter a Nigerian mobile number, like 0803 123 4567." |

## 8. Notifications, WhatsApp and SMS

All messages respect quiet hours (20:00–07:00), school hours by default, and at most one message a day ([07](07-privacy-security-compliance.md)). WhatsApp templates must be pre-approved by Meta; utility templates are used for reports and sign-in, never marketing.

### 8.1 WhatsApp templates (utility)

Variables ending in `_phrase` are pluralised with ICU before sending ("1 day" / "5 days", "1 new topic mastered" / "2 new topics mastered"). Never write "day(s)".

| ID | Message |
|---|---|
| `wa_otp` | "Your Stellara code is {{code}}. It expires in 10 minutes. Don't share it with anyone." |
| `wa_report_weekly` | "Hello {{parent_name}}. Tolu's weekly report is ready ⭐ This week: practised on {{days_phrase}}, {{mastered_phrase}}. Read it: {{link}}" |
| `wa_star_sprouted` | "Hello {{parent_name}}. Tolu has mastered {{topic}} 🌱 {{evidence}}. See Tolu's sky: {{link}}" (only if the parent chose "Tell me when a topic is mastered") |
| `wa_monthly` | "Hello {{parent_name}}. Tolu's month on Stellara: {{active_days_phrase}}, {{mastered_phrase}}, working on {{in_progress_phrase}}. Full report: {{link}}" |
| `wa_rest_day` | Never sent. A resting cloud is not news. |
| `wa_consent_needed` | "Hello {{parent_name}}. {{school}} has invited Tolu to Stellara. Tolu can start once you give consent: {{link}}" |

### 8.2 SMS (fallback)

- One segment only: 160 GSM-7 characters. **₦, curly quotes and emoji switch SMS to UCS-2 and cut the limit to 70**, so SMS copy uses straight quotes, no emoji and "NGN".
- Sender ID: `Stellara` (registered at least 3 weeks before the pilot).
- `sms_otp`: "Stellara code: {{code}}. Expires in 10 mins. Do not share it." (60 characters)
- `sms_report`: "Tolu's Stellara report is ready: {{days_phrase}} practised, {{mastered_phrase}}. {{short_link}}"

### 8.3 Push and in-app notices

Push is off by default for parents; WhatsApp is the main channel. When on, push uses the WhatsApp wording without emoji. Children never receive push notifications.

## 9. Email

Email is for parents who sign up with an email address, for teachers and school admins, and for anything legal (receipts of consent, data exports, deletion). Templates: `docs/emails/` (HTML and plain text, built by `docs/tools/emails.mjs`). **[Open the email gallery](../emails/index.html)** to see every template in Daytime and Starlight.

### 9.1 Rules for every email

- **From:** "Stellara" `<hello@…>`. Reports add "with a note from Auntie Stella" in the body, never in the From name. Reply-to: the support inbox, which a human reads.
- **Subject:** sentence case, ≤ 45 characters, the child's name first where there is one, no emoji, no "!" and no clickbait. **Preheader:** ≤ 90 characters and adds a fact, never repeats the subject.
- **One button**, named by its result ("Read Tolu's report"). The same link is also written out in the plain-text version.
- **Daytime and Starlight:** every template declares `color-scheme: light dark`, ships a Starlight stylesheet for clients that support it, and is checked in clients that force-invert colours. The logo is a PNG with its own cream rounded tile, so it never sits on an inverted background.
- **Accessible:** real text (not images of text), `lang="en-NG"`, 16 px body minimum, alt text on the logo, a table layout that reads in order.
- **Footer:** why you're getting this email, how to change it (one link to notification settings), the company's postal address, and "Stellara is not affiliated with NECO or any exam body" on anything that names an exam.
- **Never:** tracking pixels on emails to do with children's data or consent; "Dear Parent"; "Do not reply".

### 9.2 Template list

| File | Sent when | Subject | Preheader | Button |
|---|---|---|---|---|
| `sign-in` | Parent or teacher asks for a link | Your Stellara sign-in link | The link works once and expires in 15 minutes. | Sign in to Stellara |
| `consent-confirmed` | Consent given | You've given consent for Tolu | Here's what you agreed to, and how to change it. | View consent settings |
| `weekly-report` | Sunday 18:00 | Tolu's week: 5 days, 1 new star (pluralised) | Fractions sprouted. Next: 10 minutes on Ratios. | Read Tolu's report |
| `star-sprouted` | Topic mastered, if chosen | Tolu has mastered Fractions | 9 of the last 10 right, including a check 2 weeks later. | See Tolu's sky |
| `teacher-invite` | Admin invites a teacher | Join Primary 5 Gold on Stellara | Mrs Bello from Greenfield School invited you. | Accept invite |
| `school-term-summary` | End of term, to admins | Greenfield School's term on Stellara | 212 pupils practised; 1,348 topics mastered. | Open the school summary |
| `data-export-ready` | Parent asks for a copy of data | Your copy of Tolu's data is ready | The download link works for 7 days. | Download Tolu's data |
| `account-deleted` | Deletion finished | Tolu's Stellara account has been deleted | We've removed Tolu's data. Here's what we keep and why. | (no button) |
| `security-notice` | A personal-data breach that affects the family | Important: a security issue with your account | What happened, what it means for you, and what we're doing. | Read the full notice |

### 9.3 Security notice

No garden or sky words, no Auntie Stella, no softening. It says, in this order: what happened and when; which data was involved; what we have done; what the parent should do; who to contact (a named person and a phone number); and the regulator's details. It is reviewed by the DPO and lawyer before it is sent ([07](07-privacy-security-compliance.md)).

## 10. Writing for Nigerian families

- Write for a reading age of about 9 in child copy and 12 in parent copy. Short words, short sentences.
- Avoid idioms that don't travel ("knock it out of the park"). Nigerian English is the default; it is not American English.
- Leave 30% extra space for translation. Yoruba, Hausa and Igbo versions come after the MVP; until then, Auntie Stella's lines may include a short greeting in the child's home language chosen by the parent ("Ẹ káàbọ̀, Tolu").
- Read-aloud: every child line must sound right spoken. Test lines out loud before they ship.

## 11. Checklist for any new string

- [ ] Uses the names in §3 exactly
- [ ] Says what happened and what to do (errors), or what will happen (buttons)
- [ ] Within the word limit for its voice
- [ ] Nothing about losing, failing, ranking or readiness
- [ ] Reads well aloud
- [ ] Plural forms set up in ICU
- [ ] Checked in Daytime and Starlight (length, wrapping, contrast)
- [ ] For SMS: GSM-7 only, one segment
