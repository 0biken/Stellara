# Auntie Stella Animated Avatars Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate five reusable animated Auntie Stella SVG variants while preserving every existing static asset, adding a current side-by-side preview, and delivering a six-second MP4 gallery.

**Architecture:** Extend the existing dependency-free SVG generator with opt-in motion CSS and stable animation hooks. Static and animated files share the same drawing functions; only animated outputs receive contained CSS. The same generator replaces the stale hand-built preview with a small gallery that references both sets of files.

**Tech Stack:** Node.js ES modules, built-in `node:test`, SVG, CSS keyframes, HTML

**Spec:** `docs/superpowers/specs/2026-11-13-avatar-animation-design.md`

## Global Constraints

- Preserve all five existing static SVG files byte-for-byte after regeneration.
- Add no runtime or development dependency.
- Animate only `transform` and `opacity`.
- Include `prefers-reduced-motion` handling in every animated SVG.
- Keep a useful static first frame when SVG animation is unsupported.
- Do not initialize Git as part of this work; the project is not currently a Git repository.

## Review Focus

- Animation-disabled renderers must show the original expression without a displaced head, hidden eyes, or invisible star; pinned by Task 1's static-first-frame assertions.
- Reduced-motion users must receive no positional or scale animation; pinned by Task 1's reduced-motion CSS assertions.
- Regenerating animated files must not alter static assets consumed by docs and emails; pinned by Task 1's before/after hash test.
- Every expression and the round avatar must have exactly one matching animated output; pinned by Task 1's file-list test.
- The preview must not inline duplicate SVG IDs and must label static versus animated examples; pinned by Task 2's markup assertions.

---

### Task 1: Generate accessible animated SVG variants

**Files:**
- Modify: `docs/tools/avatar.mjs`
- Modify: `docs/tools/package.json`
- Create: `docs/tools/avatar.test.mjs`
- Create: `docs/assets/auntie-stella/auntie-stella-smiling-animated.svg`
- Create: `docs/assets/auntie-stella/auntie-stella-listening-animated.svg`
- Create: `docs/assets/auntie-stella/auntie-stella-thinking-animated.svg`
- Create: `docs/assets/auntie-stella/auntie-stella-proud-animated.svg`
- Create: `docs/assets/auntie-stella/auntie-stella-avatar-round-animated.svg`

**Interfaces:**
- Consumes: existing `EXPR`, `figure(e)`, and `svg(expr, shape)` generator structure.
- Produces: `motionCss(expr: string): string`; `svg(expr: string, shape: "square" | "round", animated?: boolean): string`; five `*-animated.svg` files containing expression-specific CSS.

- [ ] **Step 1: Add failing generator tests**

Use `node:test` to capture SHA-256 hashes for the five static SVGs, run `avatar.mjs`, and assert:

- all five animated filenames exist;
- each animated SVG retains `role="img"`, `aria-label`, and `<title>`;
- each contains an expression-specific class, `@keyframes`, and `@media (prefers-reduced-motion: reduce)`;
- reduced-motion CSS disables transform animation and permits only opacity animation;
- the first frame does not hide or displace `.as-figure`, `.as-head-motion`, `.as-eyes`, or `.as-star`;
- all five static hashes are unchanged after regeneration.

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test avatar.test.mjs` from `docs/tools`

Expected: FAIL because no animated SVG files exist.

- [ ] **Step 3: Add stable animation hooks to the shared drawing**

In `figure(e)`, add wrapper groups named `.as-figure`, `.as-head-motion`, `.as-eyes`, and `.as-star` without changing the existing static geometry or transform attributes. Keep static output byte-for-byte stable by emitting hooks only when `animated === true` or by maintaining a separate animated wrapper path.

- [ ] **Step 4: Implement `motionCss(expr: string): string`**

Return contained SVG CSS using the existing strong motion curves:

- `--ease-out: cubic-bezier(0.23, 1, 0.32, 1)`
- `--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1)`

Use a six-second loop with long resting keyframe ranges. Map expressions to motion as follows:

- `smiling`: soft figure breathing and one natural eye blink;
- `listening`: one small head nod;
- `thinking`: one subtle head drift and eye shift;
- `proud`: one gentle head lift and star opacity/scale twinkle.

Under reduced motion, disable all transform keyframes and use only a six-second `opacity` pulse on `.as-star` or `.as-figure` between `0.92` and `1`.

- [ ] **Step 5: Extend `svg(expr, shape, animated = false)` and output generation**

When `animated` is true, insert the motion style and animation hooks, then write the five approved animated filenames. Continue writing the existing static filenames through the unchanged static path.

- [ ] **Step 6: Add the test command**

Add `"test": "node --test avatar.test.mjs"` to `docs/tools/package.json` without changing dependencies.

- [ ] **Step 7: Run the focused test**

Run: `npm test` from `docs/tools`

Expected: PASS with all animated-file, accessibility, reduced-motion, static-first-frame, and static-hash assertions passing.

### Task 2: Replace the stale preview with a generated comparison gallery

**Files:**
- Modify: `docs/tools/avatar.mjs`
- Modify: `docs/tools/avatar.test.mjs`
- Modify: `docs/assets/auntie-stella/preview.html`

**Interfaces:**
- Consumes: the static and animated filenames produced by Task 1.
- Produces: `preview(expressions: string[]): string` and a generated `preview.html` with one labeled static/animated pair per expression plus the round avatar pair.

- [ ] **Step 1: Add failing preview assertions**

Extend `avatar.test.mjs` to assert that regeneration writes `preview.html` with:

- Sweet Garden background, foreground, and accent tokens rather than `#D9E6F2`, `#F4DCD5`, or `#1E2B38`;
- ten `<img>` elements, one static and one animated file for each of five variants;
- headings for Smiling, Listening, Thinking, Proud, and Round;
- visible `Static` and `Animated` labels;
- meaningful image `alt` text;
- no inline `<svg>` elements, preventing duplicate SVG IDs.

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `npm test` from `docs/tools`

Expected: FAIL because the current preview is legacy inline markup.

- [ ] **Step 3: Implement `preview(expressions: string[]): string`**

Generate a responsive Sweet Garden gallery using semantic headings, `<figure>`, `<figcaption>`, and `<img>`. Reference the generated SVG filenames instead of inlining their markup. Include a short note that reduced-motion settings suppress positional movement.

- [ ] **Step 4: Write the preview during avatar generation**

Have `avatar.mjs` write `docs/assets/auntie-stella/preview.html` after the SVG outputs and report it in the command summary.

- [ ] **Step 5: Run the focused test**

Run: `npm test` from `docs/tools`

Expected: PASS with all preview assertions passing.

- [ ] **Step 6: Run full asset verification**

Run from the project root:

- `node docs/tools/avatar.mjs`
- `node docs/tools/build.mjs`
- `node docs/tools/brandkit.mjs`
- `node docs/tools/emails.mjs`
- `node docs/tools/tokens.mjs`

Expected: all commands exit 0; 17 docs, 6 brand-kit avatars, and 9 email templates build; every contrast row reports `ok`; existing generated docs, brand kit, emails, logos, and static avatars remain byte-identical to their pre-change versions.

### Task 3: Record the animated gallery video

**Files:**
- Create: `docs/assets/auntie-stella/stellara-avatar-animations.webm`
- Create: `docs/assets/auntie-stella/stellara-avatar-animations.mp4`

**Interfaces:**
- Consumes: the generated `preview.html` and five animated SVG files from Tasks 1 and 2.
- Produces: a six-second 1280×720 gallery video encoded as H.264 MP4 with a WebM source recording.

- [ ] **Step 1: Open the generated preview at 1280×720**

Use Playwright CLI against the local `preview.html`, confirm all five animated variants are visible without scrolling, and check the browser console for errors.

- [ ] **Step 2: Record one full animation cycle**

Use Playwright screencast recording for six seconds and save `stellara-avatar-animations.webm` in the avatar asset directory.

- [ ] **Step 3: Convert and verify the MP4**

Use FFmpeg with H.264 video, `yuv420p` pixel format, and fast-start metadata to create `stellara-avatar-animations.mp4`. Verify with `ffprobe` that it is 1280×720, approximately six seconds long, and decodable.
