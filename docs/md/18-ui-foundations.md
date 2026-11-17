# 18 · UI foundations

This is the implementation guide for the Sweet garden UI foundation. Read it alongside [08 · Design system](08-design-system.md), [09 · Frontend guidelines](09-frontend-guidelines.md), [10 · QA and testing](10-qa-and-testing.md) and [16 · UX writing](16-ux-writing.md). The source of the public component API is `packages/ui/src/index.ts`; TypeScript prop declarations remain authoritative.

Storybook provides synthetic component and layout review fixtures. Its child, adult and studio archetypes show spacing, typography, supplied state and responsive composition. They do not establish a completed learning, reporting, authentication or authoring journey. The application route groups provide shells for later screens; `/basic` currently presents a server-rendered foundation heading and description. The description is not evidence that lessons or practice flows exist there.

## 1. Package boundaries and styles

Applications import reusable controls from `@stellara/ui` and load `@stellara/ui/styles.css` once at their root. `@stellara/ui/tokens.css` exposes the generated semantic tokens separately. The stylesheet includes local font faces, Tailwind, tokens, focus and motion rules. The application owns routing, data, translated labels and business decisions; UI components receive display props and callbacks.

`packages/ui/src/styles.css` maps tokens to Tailwind utilities such as `bg-surface`, `text-muted` and `font-heading`. `docs/tools/tokens.mjs` supplies the generated colours and design values. Change the source and run the generation command rather than editing generated tokens, font CSS or browser-chrome colour constants directly. Artwork may retain its approved illustration palette; controls use semantic tokens.

Use `cx(...parts)` to join optional class names. It omits falsy values; it does not resolve conflicting Tailwind classes. Put application composites in `apps/web/components` and keep API clients, persistence, scoring and learning-day logic out of the UI package.

## 2. Display and input components

| Export | Props and behaviour |
|---|---|
| `Button` | Native button props plus `variant: primary / quiet / text`, `size: child / adult`, `loading`, `loadingLabel`, `block`. Defaults to `type="button"`. Loading disables activation and exposes busy state. Supply translated loading text. |
| `buttonClasses` | `(variant?, size?, className?)` returns the button styling for an anchor or another appropriate semantic element. It does not supply button behaviour. |
| `Field` | `id`, `label`, optional `help` / `error`, and `children`. Use the same ID and matching help/error props on the child control so label and description references resolve. |
| `TextInput`, `PhoneInput`, `OtpInput` | Native input props plus required `id`, optional `help` / `error`. PhoneInput displays +234; it does not validate or normalise a phone number. OtpInput exposes numeric, one-time-code entry with a six-digit pattern; it does not verify an OTP. |
| `Select` | Native select props plus required `id`, optional `help` / `error`; provide native option children. |
| `Toggle` | Checkbox props except `type`, required `id` / `label`, optional `description`. Uses switch semantics. Use native `checked` / `onChange` for application-controlled state or `defaultChecked` for an uncontrolled fixture. |
| `AnswerTile` | Native button props, content and `state: default / selected / correct / not-quite / disabled`. Correct and not-quite require `stateLabel`. Resolved and disabled states lock activation; selection and correctness are supplied by the caller. |
| `QuestionCard` | `header`, `stem`, optional `stimulus`, `stimulusLabel`, answer children. Supply a label whenever a stimulus exists. The stimulus uses native collapsible details on phones and a separate visible desktop block from 768 px. |
| `HintCard` | `avatarSrc`, optional `avatarAlt`, `title` as reveal-button text, hint children, optional `onReveal`. Reveal notifies the caller; scoring consequences belong to the application. |
| `HintReveal` | `label`, children, optional `onReveal`. Reveals once in the mounted instance; the callback does not calculate or persist a hint penalty. |
| `ProgressBar` | Numeric `value` / `max`, accessible `label`, visible `valueText`, optional `tone: success / primary`. Clamps finite display values and exposes numeric ARIA state; the caller formats the text. |
| `Timer` | `remainingMs`, `totalMs`, `mode: bar / numeric`, `label`. A display only: it never starts a clock, extends a deadline or ends a test. `formatClock(ms)` produces a nonnegative rounded-up m:ss display. |
| `StarState` | `level`, `label`, optional `size` / `className`. Levels: not_assessed, foundation, developing, proficient, advanced, mastered. Supply meaningful text; an empty label makes a star decorative when its parent already supplies an equivalent name. |
| `Sky` | `stars: { id, label, level, x, y }[]`, `links: { from, to, lit }[]`, figure `label`, optional `onSelect(id)`. Coordinates are percentages; links refer to supplied IDs. The UI does not infer mastery or prerequisites. |
| `DayRow` | Group `label` and `days: { letter, label, mark }[]`, with mark star / cloud / empty. Give each day a complete accessible label; the short visual letter is decorative. |
| `StardustChip` | Already formatted `text`, optional `className`. It neither awards nor totals rewards. |
| `Picture` | `id`, optional `size` / `className`. Decorative SVG. `pictureIds` / `PictureId` describe sun, moon, leaf, flower, fish, ball, cup, house and kite. |
| `PictureKey` | `labels: Record<PictureId,string>`, `prompt`, `enteredLabel(count)`, `removeLabel`, `clearLabel`, optional `onComplete(sequence)`. Collects four entries, permits repetition and provides correction/reset controls. No sequence is persisted or logged by this component; verification belongs outside it. |
| `ProfilePicker` | `title` and `profiles: { id, name, picture, href }[]`. Renders links and picture avatars, without photos or session switching logic. |
| `Icon` | `name: IconName`, optional `size`, native SVG props. Decorative by default; put the accessible action name on the containing control. |
| `Dialog`, `Sheet` | Controlled `open` / `onOpenChange`, `title`, `closeLabel`, optional `description`, `children`, `variant: info / confirm`, `confirmation`, `closeOnBackdrop` / `className`. Sheet uses the bottom-sheet presentation. The caller must update open state when dismissal is requested. |
| `ExplanationSheet` | Dialog props except children/confirmation, plus readonly `steps`, `nextLabel`, `completeLabel`. Reveals steps progressively, then requests closing. Its step position resets when closed. |

`IconName` includes check, alert, sky, learn, practice, home, report, children, settings, privacy, items, review, flags, palette, cloud, chevron, plus and close. `ButtonVariant`, `ButtonSize`, `ButtonProps`, `InputProps`, `AnswerState`, `AnswerTileProps`, `StarLevel`, `SkyStar`, `SkyLink`, `DayMark`, `Profile`, `PictureId` and `IconProps` describe the corresponding data shapes.

For destructive actions supply `confirmation: { confirmationText, label, actionLabel, onConfirm }`. `variant="confirm"` alone does not perform or authorise an operation. Typed confirmation matches exactly and case-sensitively without trimming, rejects empty confirmation text, and blocks duplicate confirmation in one opening. The application performs the resulting action and decides whether to close. Native modal opening supplies background inertness and focus containment; dismissal through Escape, the close button or an allowed backdrop hit requests `onOpenChange(false)`. Backdrop dismissal defaults to enabled. The component initially focuses its title and attempts to return focus to the prior trigger when closed. `DialogProps`, `TypedConfirmation` and `ExplanationSheetProps` are exported contracts.

## 3. Shells, navigation, appearance and reports

| Export | Props and behaviour |
|---|---|
| `ChildShell` | `children`; a centred 480 px reading surface. Compose the child navigation separately. |
| `AdultShell` | `children`; an adult reading surface up to the configured max-width. It does not supply account controls or routes. |
| `StudioShell` | `children`, required `narrowMessage`. Below 1024 px the narrow-screen message replaces the studio content; this is layout behaviour, not an authorisation check. |
| `Nav` | `label`, readonly `items: { id, label, href, icon? }[]`, optional `activeId`, `variant: child / adult`, `className`. Anchors use caller-provided destinations and aria-current for the active ID. Child navigation is sticky with bottom safe-area space; the adult list becomes vertical from 768 px. |
| `EmptyState` | `title`, body `children`, `avatarSrc`, `avatarAlt`, optional `action: { label, href }`. Use the static listening illustration and a meaningful alt or empty decorative alt when surrounding text supplies its meaning. |
| `ReportBlock` | `title`, body `children`, optional `value` / `className`, and discriminated `kind: stat / celebrate / practise-next / coverage / note`. Coverage requires `disclaimer`; other kinds do not accept it. Displays supplied facts without deriving reports. |
| `Appearance` | `audience: parent`, `labels: AppearanceLabels`, optional `storage` adapter. The adapter supplies getItem/setItem/removeItem; null explicitly means storage is unavailable. This adult-only setting manages its own device preference. |

`AppearanceLabels` requires title, system, systemDescription, light, lightDescription, dark, darkDescription, saved and saveError strings. Use catalogue entries under `appearance.*`. Successful persistence announces the saved message; blocked storage announces the error message while the current appearance still changes. Children inherit the device theme and do not receive an appearance switch.

`ThemeChoice` is system / light / dark; `themeChoices` lists those choices and `themeStorageKey` is `stellara-theme`. `readThemeChoice` falls back to system for unavailable storage or invalid data, and `saveThemeChoice` reports whether persistence succeeded. System removes the stored override. `applyThemeChoice(choice, document?)` updates the root attribute and browser-chrome meta colours. `themeBootstrapScript` is trusted static code for the head before first paint; it reads storage safely and applies an override before CSS renders. `themeColors` supplies the generated light/dark browser colours. `isThemeChoice` validates stored values.

The application root supplies colour-scheme metadata, separate light/dark theme-color metadata, the bootstrap script and the shared CSS. CSS follows the OS when there is no explicit data-theme override. Parent settings apply immediately and listen for same-origin storage and device preference changes. Persistence is per device, not per child or account.

## 4. State ownership and accessibility

Treat supplied answer states, progress, star levels, day marks, coverage and rewards as facts computed elsewhere. Online answer tiles must wait for the server result. Offline grading is permitted only in the separately defined offline-pack flow. Timer callers calculate remaining time from the authoritative deadline and server offset, as described in [09 §3](09-frontend-guidelines.md#3-rules-for-the-child-runtime).

UI callbacks express interaction intent. Route changes, submissions, network retries and state transitions stay with the application. Keep input state controlled when another part of a real flow needs it. Local disclosure and four-picture collection state belongs to the mounted leaf; remount deliberately when starting a different child's entry session. Do not treat a fixture callback as an authentication or submission implementation.

Supply visible and accessible names from catalogues. Correctness and star state use text or shape as well as colour. Use semantic buttons, anchors and form controls rather than clickable containers. Child buttons target at least 48 px; adult buttons at least 44 px. Focus uses the semantic focus token. Motion uses transform and opacity, with movement removed under reduced motion. Browser checks are still needed for native dialog focus, Escape, inert background content and focus return; jsdom behaviour tests cannot prove those browser features.

## 5. Copy and formatting

Production copy lives in `packages/i18n/src/en-NG.json`, with empty Yoruba, Hausa and Igbo catalogues ready for reviewed translations. `getCatalogue(locale?)` preserves English fallback. `formatMessage(key, values?, locale?)` gives typed key-specific ICU values; for example:

```tsx
<ProgressBar
  value={6}
  max={10}
  label={formatMessage("nav.learn")}
  valueText={formatMessage("progress.count", { current: 6, total: 10 })}
/>
```

Use `formatNumber`, `formatDate` and ICU plural messages instead of constructing copy with suffixes. `formatDate` defaults to Africa/Lagos and accepts an explicit timezone override. A missing translation falls back to English wording and en-NG value formatting for the whole message; standalone helpers map yo/ha/ig to yo-NG/ha-NG/ig-NG. Unknown runtime keys return the key, and invalid ICU or missing arguments throw `I18nFormatError`. Render formatted output as text, never through HTML insertion.

`ReportBlock` coverage displays the supplied coverage disclaimer; it must not become a score prediction. Keep error copy calm, appearance labels Daytime / Starlight / Match my phone, and child prompts within the UX writing limits. Story data such as sample names, arithmetic, form labels and SAMPLE confirmation text is explicitly synthetic review material. Replace it with approved catalogue copy and real data when implementing a screen.

## 6. Local fonts and Nigerian-language glyphs

Inter Variable is the body face. Headings use Nunito Variable with Inter Variable as the next font fallback. Both come from pinned Fontsource packages and are bundled as same-origin WOFF2 assets; the application and Storybook do not need Google Fonts requests.

Keep **Latin, Latin Extended and Vietnamese** subsets for both families. The Vietnamese subset is required here for Unicode ranges containing Yoruba/Igbo dot-below and combining marks; its name describes the upstream file grouping, not the language of this product. Latin plus Latin Extended alone does not guarantee those glyphs.

`scripts/check-fonts.mjs` inspects the actual subset files with fontkit for `ẹọṣńɓɗƙịụ₦ẸỌṢŃƁƊƘỊỤ`. Inter must cover every required glyph. Nunito's known gaps are `ƙƘ`; headings rely on the configured Inter fallback for those letters. Keep the fallback in the stack and review real strings, including combining marks and uppercase variants. A glyph inventory check is separate from browser text rendering, layout and reading-order review.

`scripts/generate-fonts.mjs` writes local font-face rules from the pinned packages. The font subset byte report and `report:assets` are inventory information; neither establishes first-visit transfer, compression, cache behaviour or the full performance budgets in [09 §4](09-frontend-guidelines.md#4-performance-budgets).

## 7. Commands and review surfaces

Run from the repository root using the Node/pnpm versions declared in `package.json`:

| Command | Purpose |
|---|---|
| `pnpm storybook` | Start the Vite/React Storybook review server on port 6006. |
| `pnpm storybook:build` | Build its static review bundle. |
| `pnpm build` | Build workspace packages and the Next.js application. Build both application and Storybook before browser checks. |
| `pnpm test` | Run root boundary/copy-checker tests and package unit tests through Turbo. |
| `pnpm typecheck` | Check source and configured test projects. |
| `pnpm lint` / `pnpm format:check` | Check source conventions, package boundaries and formatting. |
| `pnpm check:copy` | Scan catalogue values and message-template copy; excludes implementation identifiers and HTML styles/scripts/attributes. |
| `pnpm check:fonts` | Check required glyph coverage in the shipped local subsets. |
| `pnpm test:browser` | Run configured Chromium and WebKit accessibility/interaction checks. |
| `pnpm test:visual` | Compare Chromium phone and desktop screenshots against reviewed baselines. |
| `pnpm check:client` | Check the configured application client boundary/build output. |
| `pnpm report:assets` | Report uncompressed built JS, CSS and font asset totals. |
| `pnpm docs:generate` / `pnpm docs:check` | Regenerate source-derived docs/assets and check generated output when deliberately updating it. |

Storybook uses `packages/ui/.storybook/main.ts`, its local Tailwind/Vite plugin and `docs/assets` mapped to `/assets`. The preview imports the shared stylesheet and applies a toolbar-selected theme. Stories cover control states, long text and empty data, plus appearance, typography and the three synthetic archetypes. Appearance examples use isolated storage rather than changing the reviewer's saved preference.

Playwright configuration is in `packages/ui/playwright.config.ts`. It serves the built Storybook and the built application, selects Chromium/WebKit accessibility projects, and separates visual-phone (390 × 844) and visual-desktop (1280 × 900) comparisons. Story helpers enumerate built stories and await font readiness. Accessibility tests exercise both explicit themes against the opposite OS preference; additional tests cover dialog behaviour and the basic page with JavaScript disabled. A screenshot comparison needs a deliberately reviewed platform-consistent baseline. Generating a new baseline alone does not establish correctness.

These are configured checks and review procedures, **not a claim that browser tests, visual acceptance or CI gates have passed**. Record actual run results separately. Device testing, TalkBack, full journeys, representative performance measurement and the human gates in [17](17-foundations-and-human-gates.md) remain distinct from component fixture review.
