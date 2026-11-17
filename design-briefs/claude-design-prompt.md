# Claude Design prompt: Stellara screens and landing pages

Paste everything between the two lines into Claude Design. Attach these files with it:

- `docs/assets/logo/stellara-mark.svg` and `stellara-app-icon.svg`
- `docs/assets/auntie-stella/*.svg` (the five static poses; leave out the `-animated` files)
- `docs/md/08-design-system.md` and `docs/md/16-ux-writing.md`
- The Stellara Brand Kit link: https://claude.ai/artifact/X6QxbuLuGakazbv4qT54ga

---

## Role

You are the lead product designer for **Stellara**, a learning app for Nigerian primary-school children (ages 6–12) and their parents, sold through private schools. Design the marketing site and the core app screens. Hold the craft bar of Duolingo and Khan Academy: one clear task per screen, an obvious next step, a friendly character, honest progress. Match their **quality**, not their **look**. Do not borrow their layouts, colours, mascot poses, path maps, streak flames or wording.

## The product in one paragraph

Stellara is a personal tutor that knows your child. Children practise in short daily sets. Each topic is a star in the child's own sky. A star fills as the child masters the topic, and a mastered star **sprouts**. Parents get a weekly report with evidence ("9 of the last 10 right, including a check two weeks later"). Schools see licence use and Common Entrance coverage. There is no teacher role in the MVP. The first section is Common Entrance (NCEE) preparation for Primary 5–6.

## Locked brand (do not change)

**Direction: Sweet garden.** It should feel sweet, calm and a little cartoony. Sweetness lives in colour, round shapes and the logo. Layout, motion and words stay quiet.

Use role tokens. Every screen comes in **Daytime** (light) and **Starlight** (dark).

| Role               | Daytime            | Starlight         | Job                                            |
| ------------------ | ------------------ | ----------------- | ---------------------------------------------- |
| bg                 | #FFF8F1 cream      | #1E1518 cocoa     | Page                                           |
| surface            | #FFFFFF            | #291E22           | Cards, tiles, sheets                           |
| sunk               | #FCEFE6            | #33262B           | Wells, empty bars                              |
| line               | #F0DCD3            | #47363C           | 1 px borders                                   |
| text               | #3A2430            | #F7ECE7           | Main text                                      |
| muted              | #76606A            | #C9B6BB           | Secondary text                                 |
| primary            | #C23A68 strawberry | #F39BB9           | The one main button, links, selection          |
| primary-tint / ink | #FCE1EA / #A12E57  | #47222F / #F7B3CA | Selected states, active nav, wordmark          |
| reward             | #F6C445 honey      | #F2C55C           | Stars and Stardust. Fill only, never text      |
| reward-tint / ink  | #FFF2CC / #845400  | #3B2F1C / #F5D27E | Stardust chip                                  |
| success            | #86BF7E matcha     | #93C98A           | Progress, sprouts, ticks                       |
| success-tint / ink | #E1F2DB / #2D6537  | #20352A / #A8D99F | Correct answer, mastered rows                  |
| error              | #B42318            | #FF8A80           | Form errors only, never a child's wrong answer |

- **One job per colour.** Strawberry means action, honey means reward, matcha means growth. About two thirds of every screen is cream or surface. Strawberry Milk is about 12%. The rest are small accents.
- **Type:** Nunito 800/700 for display and headings (never below 16 px, never for paragraphs). Inter for body text: 15/24 for adults, 18/28 for children, 22/30 Nunito question stems. Use sentence case everywhere.
- **Shape:** radius 10 / 16 / 24, pill buttons, and a spacing scale of 4, 8, 12, 16, 20, 24, 32, 40, 56, 72. No shadows except on dialogs and phone frames (`0 24px 50px -28px`, cocoa). Illustrations and the logo get a soft cocoa outline. UI controls never do.
- **Logo:** a honey star with a small face and a matcha sprout with a strawberry bud. The wordmark is lowercase "stellara" in Nunito 800, coloured primary-ink. Never add a glow or shadow, recolour it, or swap in a four-point sparkle.
- **Auntie Stella** is the guide character. Use her in hints, empty states, the report header and milestones. She never looks disappointed. She never stands next to scores or exam claims.
- **Motion** (describe it in annotations): a press shrinks the control to 0.97 over 120 ms. UI fades over 200–240 ms with `cubic-bezier(.23,1,.32,1)`. A reward star rises from 0.95 scale over 400 ms. A mastery milestone (line draws, star fills, sprout grows) plays once in about 1.2 s and can be skipped. Nothing bounces, shakes, flashes or confettis. With reduced motion, only fades remain.

## Voice

Words should be sweet in moments and plain in facts. Use real copy, never lorem ipsum.

- **Auntie Stella to children:** at most 15 words a line (8 for ages 4–7). One exclamation mark per screen at most. "Well done! You found it." / "Not quite. Look at the bottom numbers first."
- **Stellara to parents:** evidence first, full sentences, no exclamation marks, no emoji. Use the child's first name.
- **Stellara to schools:** short and factual, numbers first.
- **Say:** Stardust, days in a row, resting cloud, your sky, sprouted, mastered, not yet, today's set, practice test, coverage, picture key.
- **Never say:** streak, XP, coins, weak areas, failed, behind, hurry, don't lose, you are ready, predicted score, guaranteed, AI tutor, mock exam, official NECO.
- Use Nigerian names and context (Tolu, Chiamaka, Musa, Mrs Adeyemi, Greenfield School, Primary 5 Gold, ₦). Phone numbers default to +234.

## Deliverables

### A. Marketing site (responsive: 390 px and 1280 px, both themes)

1. **Home (for schools; schools are the buyer).** Hero: "A personal tutor that knows your child." Then: how a star grows (not assessed → mastered → sprouted), what parents see (a real weekly report), what the school sees (the school overview), Common Entrance coverage with the label "not a predicted score", how a pilot works, privacy and NDPA consent in plain words, and a "Talk to us about a pilot" call to action. Footer: the non-affiliation notice ("Stellara is not affiliated with NECO").
2. **For parents.** Joining with a school code, what a child does each day (10 questions, about 10 minutes), the picture key (no passwords for children), the weekly report and the WhatsApp summary, and consent and data controls.
3. **For schools.** Set-up time, creating classes and join codes, class mode in the computer lab, and the school overview.

### B. Child app (phone, 390 × 844, max width 480, primary action in thumb reach)

4. Who's learning today? (profile picker) → picture key (tap 4 of 9 pictures)
5. Home / Your sky: the constellation, today's set card, days in a row with a resting cloud, and the Stardust chip
6. Question screen: the stem, answer tiles in selected, correct and not-quite states, a hint card from Auntie Stella, and "6 of 10" progress
7. Explanation sheet (worked steps, revealed one by one)
8. End of set: specific praise, Stardust earned, and the stars that grew
9. Star sprouted milestone (the calmest celebration in the app)
10. Practice test: a numeric mm:ss timer with no red, plus the one notice at 5 minutes left
11. Empty sky for a new child

Bottom nav: Sky, Learn, Practice.

### C. Parent app (phone, plus a two-column layout from 768 px)

12. Welcome → phone sign-in with WhatsApp OTP → "What should we call you?" → consent → add a child → set up the picture key
13. Weekly report: This week · Something to celebrate · What to practise next · Common Entrance coverage · A note from Auntie Stella
14. Settings → How Stellara looks: Match my phone / Daytime / Starlight, with the confirmation "Saved on this phone."
15. Withdraw consent (typed confirmation, plain and serious)

### D. School admin (desktop 1280 px, plus a phone fallback)

16. Classes: a list of classes with pupil counts; create a class and share its join code.
17. Start class mode: pick a class, show its class code for the lab devices.
18. School overview: licences used, and Common Entrance coverage by class

For each screen, show the default, empty, loading and error states. Use worst-case data too: long names like "Oluwaseyifunmi Adebayo-Okonkwo", Yoruba diacritics (ẹ ọ ṣ), and a class of 45 pupils.

## Quality bar: no signs of slop

Reject your own draft if any of these appear:

- Purple or blue gradients, glassmorphism, glows, blurred blobs, noise textures, or neon on dark
- Generic three-column feature cards with an icon on top, bento grids for their own sake, or cards inside cards
- Made-up statistics, testimonials, school logos or "trusted by" strips. Use clearly marked placeholders instead.
- Emoji used as icons, mixed icon styles, or stock photos of children
- More than one strawberry button per screen, or honey-coloured text
- Centre-aligned paragraphs longer than two lines, or headings that wrap to more than three lines
- Countdown urgency, streak guilt, leaderboards, red for wrong answers, shake animations
- Bubbly display fonts (no Baloo, Fredoka, or comic styles), all-caps labels, Title Case buttons
- Dark mode that is pure black or purple. Starlight is warm cocoa.

What good looks like:

- One idea per screen, with generous space and a clear focal point
- Every state readable without colour: a ✓ with "Correct", a dashed border with "Not quite", stars that differ by shape
- Touch targets of at least 48 px for children and 44 px for adults, and a visible 2 px focus ring
- WCAG 2.2 AA contrast in both themes
- Illustration carries the warmth. Interface chrome stays quiet.
- It should look fast on a ₦60,000 Android phone: light assets, no heavy effects inside lessons.

## Output format

Work in this order: the design-system board first (tokens, type, buttons, answer tiles, star states, nav), then the marketing home, then the child screens, then parents, then the school admin screens. Show Daytime and Starlight side by side. Annotate motion, component names and copy keys. End with a self-review against the quality bar above. List anything you changed or could not meet.

---

## Skills to run in Claude Code around this

Claude Design can't load these skills. Use them in Claude Code before the brief (to settle scope) and after the designs come back (to review them and turn them into code).

| When     | Skill                            | What it does for Stellara                                                                                                    |
| -------- | -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Before   | `brainstorming`                  | Settles which screens are in this round and the open questions (pilot call to action, pricing, the copy on the schools page) |
| Review   | `emil-design-eng`                | Polish: spacing, press states, motion values, the invisible details (you asked for this one)                                 |
| Review   | `apple-design`                   | HIG-grounded critique, dark mode, accessibility, onboarding, "less generic" (you asked for this one)                         |
| Review   | `design-taste-frontend`          | An anti-slop pre-flight for the landing pages, against templated layouts                                                     |
| Review   | `web-design-guidelines`          | A web interface and accessibility compliance pass                                                                            |
| Review   | `dataviz`                        | The school overview, coverage bars and report blocks                                                                         |
| Review   | `break-ui`                       | Worst-case data: long names, diacritics, 45 pupils, empty states                                                             |
| Build    | `frontend-design`                | Turns the approved designs into `apps/web` screens using `@stellara/ui`                                                      |
| Build    | `redesign-existing-projects`     | Brings `/basic` and the route-group shells in line without a rebuild                                                         |
| Motion   | `animate`                        | Builds the press, reward-star and sprout-milestone motion to the token values                                                |
| Motion   | `find-animation-opportunities`   | Finds where motion helps, and rejects everything else                                                                        |
| Motion   | `animation-performance`          | Keeps motion within the frame budget on cheap Android phones                                                                 |
| Verify   | `playwright-cli`                 | Screenshots at 390 and 1280 px in Daytime and Starlight                                                                      |
| Verify   | `verification-before-completion` | No "done" claims without evidence                                                                                            |
| Optional | `minimalist-ui`                  | Only for the school admin and studio surfaces, if they feel busy                                                             |

**Left out on purpose** (each one pulls toward a look you've rejected or the docs forbid): `gpt-taste`, `high-end-visual-design`, `animated-component-libraries`, `gsap-scrolltrigger`, `scroll-reveal-libraries`, `locomotive-scroll`, `industrial-brutalist-ui`, the 3D skills, `lottie-animations`, and `brandkit` (the brand is already locked). Their problems are scroll-jacking, glows, bounces, agency-luxury type or a heavy payload.
