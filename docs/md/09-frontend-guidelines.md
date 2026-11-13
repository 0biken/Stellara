# 09 · Frontend guidelines

## 1. Stack

- Next.js 16 App Router, React Server Components for adult and static surfaces; client components for the child practice runtime. The foundation includes a minimal static shell only.
- TypeScript `strict`. Zod for every boundary (function responses, IndexedDB records, content).
- Styling: Tailwind with the tokens in [08](08-design-system.md#11-tokens-in-code). No CSS-in-JS runtime.
- Data: `@supabase/supabase-js` for adult surfaces; a small typed client for Edge Functions; TanStack Query for caching on adult surfaces.
- Offline: Serwist service worker; Dexie for IndexedDB; a custom outbox module (`apps/web/lib/outbox`).

## 2. Structure

```
apps/web/
  app/
    (child)/sky/  (child)/learn/[topic]/  (child)/practice/[set]/  (child)/test/[set]/
    (family)/…   (teach)/…   (school)/…   (studio)/…   (ops)/…   basic/…
  components/      app-specific composites (screens built from packages/ui)
  lib/
    outbox/        queue, retry with backoff, idempotency, clock offset
    packs/         download, verify signature, evict
    session/       child session tokens, PIN flow
    api/           typed Edge Function client
  sw/              service worker (precache shell, runtime cache for media)
```

## 3. Rules for the child runtime

1. Never compute correctness for online sets on the client. Show "checking" until the server answers (target under 400 ms).
2. Offline packs may grade locally. Mark those responses `key_on_device: true`.
3. Save every answer to IndexedDB **before** any network call.
4. Never block the UI on the network after the set has loaded.
5. Practice-test timer: display `ends_at - (Date.now() + serverOffset)`; resync the offset every 60 s and on resume.
6. Keep one child's data partitioned by `child_id`; clear the partition on profile removal.
7. No third-party scripts, fonts from our own origin only, no analytics SDKs.

## 4. Performance budgets

Enforced in CI with Lighthouse CI and a bundle-size check. A failing budget fails the build.

| Metric | Budget |
|---|---|
| First visit, critical path | ≤ 200 KB total, ≤ 130 KB JS (compressed) |
| Repeat visit before usable | ≤ 15 KB over the network |
| Lesson (text) / lesson with images | ≤ 30 KB / ≤ 120 KB |
| Offline practice pack (40 items with images) | ≤ 120 KB |
| Practice test payload (no keys) | ≤ 500 KB |
| Time to interactive, cold, reference device* at 1.6 Mbps, 150 ms RTT | < 5 s |
| Field LCP / INP / CLS (p75) | ≤ 2.5 s / ≤ 200 ms / ≤ 0.1 |
| Answer tap to visual response | < 100 ms |
| 100-item practice test on a 3 GB RAM device | No tab reload |

\*Reference device: an Android Go or entry Android phone costing ₦100,000–150,000 (for example, a current Tecno, Infinix or itel entry model), Chrome stable.

## 5. Browser support

| Browser | Support |
|---|---|
| Chrome Android 100+, Samsung Internet 20+ | Full |
| Opera (full mode), Firefox Android | Full |
| Safari iOS 16+ | Full (PWA install guidance shown) |
| Desktop Chrome, Edge, Firefox, Safari (last 2) | Full (teachers, studio) |
| Opera Mini (Extreme) | `/basic` mode: server-rendered lessons and untimed practice; no practice tests |

Measure the Opera Mini share in the pilot before investing further.

## 6. Internationalisation

- All strings in `packages/i18n` catalogues (ICU MessageFormat). No hard-coded copy.
- English (Nigeria) first. Yoruba, Hausa and Igbo catalogues are created with English fallbacks so translation can start in Phase 2.
- Numbers and money: `en-NG` formatting, ₦.
- Dates: learning-day logic uses the child's time zone with the 03:00 boundary.

## 7. Accessibility in code

- Use semantic HTML first; ARIA only where needed.
- Every component story runs axe in CI.
- Focus is managed on route change and in sheets and dialogs.
- Test with TalkBack on the reference device before each release.

## 8. Themes (light and dark)

- **Tokens only.** Components read colour from CSS variables (`var(--primary)`, Tailwind `bg-primary`), never hex values. A lint rule (`stylelint-declaration-strict-value` for colour properties, plus a grep in CI for `#[0-9a-f]{6}` in `apps/*/src`) blocks raw colours outside `packages/ui/tokens`.
- **Resolution order:** `data-theme` on `<html>` (set from the parent's per-device choice) wins; otherwise `prefers-color-scheme`. Absence of the stored key means System.
- **No flash on load.** A tiny inline script in `<head>`, before any CSS paints, reads `localStorage["stellara-theme"]` inside `try/catch` and sets `data-theme`. Also set `<meta name="color-scheme" content="light dark">` and `<meta name="theme-color">` for both media queries so the browser UI matches.
- **Switching is instant.** Changing theme swaps variables only; nothing transitions. Canvas and 3D scenes re-read the variables on a `matchMedia("(prefers-color-scheme: dark)")` change and on `data-theme` change.
- **Images.** SVG icons use `currentColor`. Illustrations keep their colours; Auntie Stella and photos get `filter: brightness(.9)` in dark. Never ship a white-background PNG.
- **PWA.** The manifest's `background_color` is cream; the splash in dark comes from `theme-color` with `media="(prefers-color-scheme: dark)"`.
- **Contrast in CI.** `node docs/tools/tokens.mjs` runs on every pull request and fails if any text pair drops below 4.5:1 (3:1 for the focus ring) in either theme.

## 9. Motion in code

- Use the tokens `--ease-out`, `--ease-in-out`, `--motion-press`, `--motion-ui`, `--motion-reward` ([08 §5](08-design-system.md#5-space-shape-elevation-motion)).
- Press feedback: `transition: transform var(--motion-press) var(--ease-out)` and `:active { transform: scale(.97) }`.
- Only `transform` and `opacity` animate. Never `transition: all`.
- Prefer CSS transitions (interruptible) over keyframes for UI that can be re-triggered. Enter with `@starting-style` where supported, a `data-mounted` attribute otherwise.
- Hover styles go inside `@media (hover: hover) and (pointer: fine)`.
- `prefers-reduced-motion: reduce` keeps opacity fades and removes movement, scaling and 3D.

## 10. Code standards

- ESLint (Next, TypeScript, jsx-a11y), Prettier, import order.
- Components: props typed, no default exports in packages, stories required.
- Commit style: Conventional Commits. PRs need one review plus green CI.
- Feature flags (table `feature_flags`, cached) for anything not ready for every school.

Historical baseline: the earlier draft specified Next.js 15 App Router. It was superseded by Next.js 16 on 13 November 2026 because Next.js 15 security support ends on 31 January 2027, before the pilot finishes. This note records the migration decision, not a second supported application stack.
