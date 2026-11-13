# 08 · Design system

The visual direction is **Sweet garden**: strawberry, honey and matcha on cream, with warm cocoa text. It feels sweet, calm and a little cartoony, in both light and dark. The idea behind it is simple: learning grows. Every topic is a star, and a mastered star sprouts. The full visual kit is published as the [Stellara Brand Kit](https://claude.ai/artifact/X6QxbuLuGakazbv4qT54ga), with a light/dark switch on every board. This document is the build reference: tokens, components and rules. Tokens live in `packages/ui/tokens`; the source of truth for colour values is `docs/tools/tokens.mjs`.

## 1. Principles

1. **Sweet, then calm.** Sweetness lives in colour, round shapes and the logo. Layout, motion and words stay quiet. Nothing flashes, bounces or shakes.
2. **One thing at a time.** One question per screen, one Strawberry button, plenty of space.
3. **Shape before colour.** Every state can be read without colour (icons, words, shapes).
4. **Earned, not given.** Honey (rewards) appears only after real learning.
5. **Both themes, always.** Every screen, the children's app included, is designed and tested in Daytime and Starlight.
6. **Kind to cheap phones.** Light assets, no heavy effects inside lessons.

## 2. Colour

### 2.1 Roles

Components use **role tokens**, never raw hex values. Each role has a light and a dark value.

| Role token | Light | Dark | Use |
|---|---|---|---|
| `bg` | `#FFF8F1` Cream | `#1E1518` Cocoa | App background |
| `surface` | `#FFFFFF` | `#291E22` | Cards, answer tiles, sheets |
| `sunk` | `#FCEFE6` Biscuit | `#33262B` | Wells, empty progress, segmented controls |
| `line` | `#F0DCD3` | `#47363C` | Borders, dividers |
| `text` | `#3A2430` Cocoa | `#F7ECE7` soft white | Main text |
| `muted` | `#76606A` Mauve | `#C9B6BB` | Secondary text |
| `primary` | `#C23A68` Strawberry | `#F39BB9` | The one main button per screen, links, selection |
| `on-primary` | `#FFFFFF` | `#3A1123` | Text on `primary` |
| `primary-tint` | `#FCE1EA` Strawberry Milk | `#47222F` | Selected answers, app icon background |
| `primary-ink` | `#A12E57` Strawberry Ink | `#F7B3CA` | Text on `primary-tint`; the wordmark |
| `reward` | `#F6C445` Honey | `#F2C55C` | Stars, Stardust, rewards. **Fill only, never text** |
| `reward-edge` | `#D9A22C` | `#C99A33` | Star outlines |
| `reward-tint` | `#FFF2CC` Honey Cream | `#3B2F1C` | Stardust chip |
| `reward-ink` | `#845400` Honey Ink | `#F5D27E` | Stardust numbers |
| `success` | `#86BF7E` Matcha | `#93C98A` | Progress bars, sprouts, ticks |
| `success-tint` | `#E1F2DB` Matcha Milk | `#20352A` | Correct-answer tile, mastered rows |
| `success-ink` | `#2D6537` Matcha Ink | `#A8D99F` | Success text |
| `hint` | `#FCE1EA` | `#47222F` | Auntie Stella hint cards and notes |
| `focus` | `#C23A68` | `#F39BB9` | Focus ring |
| `error` | `#B42318` | `#FF8A80` | Form errors only, **never** a child's wrong answer |

**One job per colour.** Strawberry is action. Honey is reward. Matcha is growth and correctness. Don't use them for anything else, or they lose their meaning.

**Proportion.** Mostly cream and surface (about two thirds of any screen). Strawberry Milk around 12%. Strawberry, Matcha and Honey are small accents.

### 2.2 Contrast (computed, both themes)

| Pair | Light | Dark | Needs |
|---|---|---|---|
| `text` on `bg` | 13.53 | 15.40 | 4.5 |
| `muted` on `bg` | 5.46 | 9.26 | 4.5 |
| `muted` on `surface` | 5.75 | 8.36 | 4.5 |
| `on-primary` on `primary` | 5.12 | 7.94 | 4.5 |
| `primary` on `bg` (links) | 4.87 | 8.68 | 4.5 |
| `primary-ink` on `primary-tint` | 5.62 | 7.97 | 4.5 |
| `text` on `hint` | 11.59 | 11.77 | 4.5 |
| `reward-ink` on `bg` | 6.14 | 12.25 | 4.5 |
| `reward-ink` on `reward-tint` | 5.79 | 8.95 | 4.5 |
| `success-ink` on `success-tint` | 5.92 | 8.16 | 4.5 |
| `error` on `surface` | 6.57 | 7.06 | 4.5 |
| `focus` on `bg` (non-text) | 4.87 | 8.68 | 3 |

`reward` as text fails in light mode (1.55:1), so honey is never used for text. Run `node docs/tools/tokens.mjs` after any change; it exits with an error if a pair falls below its minimum, and CI runs it on every pull request.

### 2.3 Daytime and Starlight (light and dark)

In every user-facing word, the light theme is **Daytime** and the dark theme is **Starlight**; following the device is **Match my phone** (see [16 §4](16-ux-writing.md#4-daytime-and-starlight-appearance)). "Light" and "dark" are used only in code.

- **Default: follow the device** (`prefers-color-scheme`). This covers the children's app, the parent app, teacher and school screens, and the website.
- **Override:** parents can choose *Settings → How Stellara looks: Match my phone, Daytime, Starlight*. It is stored **per device** (localStorage `stellara-theme`, absent means System), so a shared family tablet keeps its own setting. There is no theme switch on children's screens. This follows Apple's guidance (HIG *Dark Mode*: "Avoid offering an app-specific appearance setting"), while still giving families the control they asked for.
- **Dark is warm cocoa,** never pure black or purple. Text is a soft off-white (`#F7ECE7`), never `#FFFFFF` on dark.
- **Illustrations** keep their colours in dark mode. Auntie Stella and photos are dimmed slightly (`filter: brightness(.9)`) so they don't glare.
- **The logo** keeps the same honey star and sprout in both themes. Only the wordmark colour changes (`primary-ink`).
- **Switching theme changes colours instantly.** Nothing animates.

## 3. Logo: the star sprout

| Part | Detail |
|---|---|
| Star | Five rounded points with plump inner corners (inner radius 0.6 R). Fill `reward`, with a soft cocoa outline (`#3A2430`, 2.6 / 100 units) |
| Face | Two dot eyes, a small smile, pink cheeks. Friendly, never a talking mascot |
| Sprout | Two matcha leaves and a strawberry bud on a short stem from the top point |
| Wordmark | "stellara", lowercase, Nunito 800, tracking −0.02 em, colour `primary-ink` |
| Versions | Horizontal lockup, stacked, wordmark only, one colour (on Strawberry, reversed on cocoa), app icon (mark on `primary-tint`) |
| Minimum size | Lockup 96 px wide (25 mm in print). Mark 24 px; below that, drop the face |
| Clear space | x on every side, where x is the star's height without the sprout |
| Misuse | Don't stretch, recolour, add glows or shadows, set honey text, retype or capitalise the wordmark, or swap in a four-point sparkle |

The mark is a working drawing. A designer redraws it once the name is cleared. The SVG source is the `logoMark()` function in the brand kit.

## 4. Typography

| Role | Font | Weight | Size / line height |
|---|---|---|---|
| Display | Nunito | 800 | 44/50 |
| Heading | Nunito | 700 | 28/34 |
| Question stem | Nunito | 800 | 22/30 (children), 20/28 (P5–6) |
| Child body | Inter | 400 | 18/28 |
| Body | Inter | 400 | 15/24 |
| Label | Inter | 500 | 13/18 |
| Caption | Inter | 500 | 12/18 |

- Stacks: headings `Nunito, Inter, system-ui, sans-serif`; body `Inter, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`.
- Nunito is never used below 16 px or for long paragraphs.
- Self-host subsetted WOFF2 (Latin, Latin Extended for Yoruba and Hausa letters, ₦). Run the glyph test (ẹ ọ ṣ ń ɓ ɗ ƙ ị ụ ₦) in CI against the subset files. **Known gap:** the Google Fonts build of Nunito has no **ƙ**, so Inter draws that letter. Before launch, either add ƙ to a custom Nunito subset or accept the fallback after checking Hausa headings on real Android phones.
- Children under 8: body text never below 18 px. Parents: never below 15 px.
- Lesson and test screens may fall back to system fonts if the font budget is exceeded.

## 5. Space, shape, elevation, motion

| Token | Values |
|---|---|
| `space` | 4, 8, 12, 16, 20, 24, 32, 40, 56, 72 |
| `radius` | `sm` 10 · `md` 16 · `lg` 24 · `pill` 999 (buttons are pills) |
| `border` | 1 px `line`; answer tiles 1.5 px; selected 1.5 px `primary` |
| `elevation` | None by default. Phone frame and dialogs only: `0 24px 50px -28px` with a cocoa shadow (black at 50% in dark) |
| `outline` | Illustrations and the logo only: cocoa `#3A2430`, about 1.5 px at display size. Never on UI controls |
| `ease-out` | `cubic-bezier(.23, 1, .32, 1)`: anything entering or responding |
| `ease-in-out` | `cubic-bezier(.77, 0, .175, 1)`: things moving across the screen |
| `motion.press` | 120 ms, `scale(.97)` on buttons and answer tiles |
| `motion.ui` | 200–240 ms, fade and settle, `ease-out` |
| `motion.reward` | 400 ms: a star rises in from `scale(.95)` with opacity |
| `motion.stagger` | 40 ms between stars that appear together; never blocks input |
| `motion.milestone` | ≈ 1,200 ms: line draws, star fills, sprout grows. Once, skippable |
| Reduced motion | Fades stay; all movement, scaling and 3D are removed |

Motion rules:

- Never `ease-in` for interface motion. Never enter from `scale(0)`.
- Animate only `transform` and `opacity`. Use CSS transitions (which can be interrupted) for anything that can be triggered repeatedly; keyframes only for one-off moments.
- Hover effects only under `@media (hover: hover) and (pointer: fine)`.
- No animation on actions that repeat many times an hour (keyboard shortcuts, tab switches in the teacher grid).

## 6. Components

Each component lives in `packages/ui`, has Storybook stories for every state **in both themes**, and passes axe checks.

| Component | Variants and states | Rules |
|---|---|---|
| **Button** | primary (Strawberry pill, `on-primary` text), quiet (outline), text; default, pressed, disabled, loading | Min height 48 px for children, 44 px for adults. One primary per screen. Press: `scale(.97)` |
| **Answer tile** | default, selected, correct, not-quite, disabled | Selected: `primary-tint` fill, `primary` border. Correct: `success-tint` fill, ✓ and "Correct". Not quite: dashed `primary` border and "Not quite". Never red, never a shake |
| **Question card** | stem, optional stimulus, media | Nunito stem; stimulus collapsible on small screens |
| **Hint card** | Auntie Stella avatar (32 px) plus text | `hint` background; opens on tap; marks the response unscored |
| **Explanation sheet** | worked steps | Bottom sheet; steps revealed one by one |
| **Progress bar** | set progress, coverage | Set progress in `success` on `sunk`; coverage in `primary`. Always paired with "6 of 10" text |
| **Star state** | not_assessed, foundation, developing, proficient, advanced, mastered | Dashed outline, outline, half fill, fill, fill with a thicker cocoa edge, fill with a sprout (see [02 §3.5](02-learning-rules.md#35-display)) |
| **Sky (constellation)** | topic stars plus links | Lit links in `link-on` (light `#E9A3BB`, dark `#B05E79`); unlit links dashed in `link-off`. Tap a star for the topic sheet |
| **Day row** | star, resting cloud, empty | Week view with day letters; cloud uses `cloud` (light `#F6E7DF`, dark `#3A2D32`) |
| **Stardust chip** | amount | `reward-ink` on `reward-tint`, small honey star |
| **Timer** | calm bar for topic assessments; numeric for practice tests | Practice test: mm:ss plus bar; no red; at 5 minutes left, one gentle notice |
| **Report block** | stat, celebrate, practise-next, coverage, note | Coverage always labelled "not a predicted score" |
| **Picture PIN** | 4 of 9 pictures | Pictures have text labels for screen readers |
| **Profile picker** | avatar plus first name | Avatars from a fixed set; no photos |
| **Form fields** | text, phone (+234 default), OTP, select, toggle | Label above, help text below, errors in `error` with an icon |
| **Appearance setting** ("How Stellara looks") | Match my phone, Daytime, Starlight | Parent and teacher Settings only. A list of three options, each with a one-line description; default Match my phone. Confirmation: "Saved on this phone." |
| **Dialog / sheet** | confirm, info | Never for nagging; destructive actions need typed confirmation |
| **Nav** | child: bottom bar (Sky, Learn, Practice); adults: top bar plus side nav on desktop | Active tab: `primary-ink` on `primary-tint` |
| **Empty state** | with Auntie Stella listening pose | Says what will appear and how to start |

## 7. Auntie Stella

| Asset | File | Use |
|---|---|---|
| Round avatar | `docs/assets/auntie-stella/auntie-stella-avatar-round.svg` | Hints (32 px), notes (40 px), empty states |
| Smiling | `auntie-stella-smiling.svg` | Welcome, correct runs, report header |
| Listening | `auntie-stella-listening.svg` | Empty states, waiting, onboarding |
| Thinking | `auntie-stella-thinking.svg` | Hints, worked explanations |
| Proud | `auntie-stella-proud.svg` | Topic mastered, end of term, parent note |

Placeholder v2 wears the sweet palette: a strawberry top, Matcha Milk background, a honey star earring, and the same soft cocoa outline as the logo. Regenerate with `node docs/tools/avatar.mjs`.

Rules: she never looks disappointed at the child; she never appears next to scores or exam claims; minimum size 24 px. The logo star never becomes a second talking character. Replace the placeholder with a commissioned illustration using the brief on board 3 of the brand kit.

## 8. Layout

- Child app: a single column, max width 480 px, 16–20 px side gutters, primary action pinned to the bottom within thumb reach.
- Parent app: a single column on phones; two columns from 768 px.
- Teacher and school: responsive grid; the class grid scrolls horizontally inside its own container.
- Content studio: desktop only (≥ 1024 px).

## 9. Accessibility

- WCAG 2.2 AA is a release gate **in both themes**.
- Touch targets ≥ 48 × 48 px for children.
- Every interactive element has a visible focus ring (2 px `focus`, 3 px offset).
- Screen readers: question stems and options read in order; star states have text labels; maths has an accessible MathML alternative.
- Read-aloud (Web Speech API, where available) for children under 8; it is never required to complete a task.
- Never rely on colour alone: correct and not-quite states include an icon and a word.
- Respect `prefers-reduced-motion` and `prefers-contrast: more` (in high-contrast mode, `muted` text switches to `text` and borders to `line-strong`).

## 10. Voice in the interface

The full writing guide, with copy for every screen, WhatsApp, SMS and email, is [16 UX writing](16-ux-writing.md).

| Register | Speaker | Rules | Example |
|---|---|---|---|
| Ages 4–7 | Auntie Stella | ≤ 8 words, read aloud, concrete | "Well done! You found it." |
| Ages 8–12 | Auntie Stella | ≤ 15 words, specific | "Correct. That's four in a row." |
| Parents | Stellara | Plain, warm, evidence first, no exclamation marks | "Tolu has mastered Fractions: 9 of the last 10 right, including a check two weeks later." |

**Word list.** Say: Stardust, days in a row, resting cloud, your sky, sprouted, mastered, needs practice, not yet, practice test, coverage. Never say: weak areas, failed, you are ready, guaranteed score, don't lose your streak, hurry, expo, runz, live questions, official JAMB/NECO, AI tutor.

## 11. Tokens in code

```css
:root {
  --bg:#FFF8F1; --surface:#FFFFFF; --sunk:#FCEFE6; --line:#F0DCD3; --line-strong:#E3C7BC;
  --text:#3A2430; --muted:#76606A;
  --primary:#C23A68; --on-primary:#FFFFFF; --primary-tint:#FCE1EA; --primary-ink:#A12E57;
  --reward:#F6C445; --reward-edge:#D9A22C; --reward-tint:#FFF2CC; --reward-ink:#845400;
  --success:#86BF7E; --success-tint:#E1F2DB; --success-ink:#2D6537;
  --hint:#FCE1EA; --focus:#C23A68; --error:#B42318;
  --link-on:#E9A3BB; --link-off:#EAD5CD; --cloud:#F6E7DF; --outline:#3A2430;
  --font-display:"Nunito","Inter",system-ui,sans-serif;
  --font-body:"Inter",system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;
  --radius-sm:10px; --radius-md:16px; --radius-lg:24px;
  --ease-out:cubic-bezier(.23,1,.32,1); --ease-in-out:cubic-bezier(.77,0,.175,1);
  --motion-press:120ms; --motion-ui:200ms; --motion-reward:400ms;
  color-scheme: light;
}
/* Dark values: applied when the device is dark and no override is set, or when the parent chose Dark */
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { /* same block as below */ } }
:root[data-theme="dark"] {
  --bg:#1E1518; --surface:#291E22; --sunk:#33262B; --line:#47363C; --line-strong:#5E4950;
  --text:#F7ECE7; --muted:#C9B6BB;
  --primary:#F39BB9; --on-primary:#3A1123; --primary-tint:#47222F; --primary-ink:#F7B3CA;
  --reward:#F2C55C; --reward-edge:#C99A33; --reward-tint:#3B2F1C; --reward-ink:#F5D27E;
  --success:#93C98A; --success-tint:#20352A; --success-ink:#A8D99F;
  --hint:#47222F; --focus:#F39BB9; --error:#FF8A80;
  --link-on:#B05E79; --link-off:#4D3B41; --cloud:#3A2D32;
  color-scheme: dark;
}
```

```ts
// tailwind.config.ts (excerpt). Colours point at CSS variables so one class works in both themes.
const v = (n: string) => `var(--${n})`;
export default {
  darkMode: ["variant", ['@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) & }', '[data-theme="dark"] &']],
  theme: {
    extend: {
      colors: {
        bg: v("bg"), surface: v("surface"), sunk: v("sunk"), line: v("line"),
        text: v("text"), muted: v("muted"),
        primary: { DEFAULT: v("primary"), on: v("on-primary"), tint: v("primary-tint"), ink: v("primary-ink") },
        reward: { DEFAULT: v("reward"), edge: v("reward-edge"), tint: v("reward-tint"), ink: v("reward-ink") },
        success: { DEFAULT: v("success"), tint: v("success-tint"), ink: v("success-ink") },
        hint: v("hint"), focus: v("focus"), error: v("error"),
      },
      fontFamily: { display: ["Nunito", "Inter", "system-ui", "sans-serif"], body: ["Inter", "system-ui", "sans-serif"] },
      borderRadius: { sm: "10px", md: "16px", lg: "24px" },
      transitionTimingFunction: { out: "cubic-bezier(.23,1,.32,1)", "in-out": "cubic-bezier(.77,0,.175,1)" },
    },
  },
};
```
