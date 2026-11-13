# Auntie Stella animated avatars

## Intent

Give Auntie Stella calm, purposeful motion without making the static artwork used by email and other low-motion contexts unreliable.

## Goals

- Add five animated SVG variants beside the existing static avatar files.
- Preserve the Sweet Garden artwork and expression-specific character poses.
- Give each expression a distinct, restrained gesture with a long quiet interval.
- Keep every output reproducible from `docs/tools/avatar.mjs`.
- Respect `prefers-reduced-motion`.
- Show static and animated versions together in the avatar preview.
- Deliver a six-second MP4 gallery preview showing all animated expressions.

## Non-goals

- Replacing or changing the existing static SVG files.
- Adding a JavaScript animation library.
- Adding continuous decorative motion to email templates.
- Redesigning Auntie Stella's illustration.

## Constraints

- Animate only `transform` and `opacity`.
- Use CSS contained inside each SVG so animated files remain portable.
- Preserve a useful static first frame when animation is unsupported.
- Avoid rapid, perpetual motion; gestures should occur occasionally and settle fully.

## Approaches considered

1. Animate the existing SVGs everywhere. Rejected because it could introduce motion in email and learning contexts that expect static assets.
2. Animate only the preview page. Rejected because the motion would not be reusable by the future application.
3. Add separate animated SVG variants. Chosen because it preserves compatibility while making motion available deliberately.

## Motion design

- Smiling: a soft breath and a natural blink.
- Listening: a small attentive nod.
- Thinking: a subtle gaze shift and head drift.
- Proud: a gentle lift and a single star twinkle.
- Round smiling avatar: the same calm breath and blink as the square smiling avatar.

The loops use long quiet holds between short gestures. Under reduced motion, positional movement is removed and only a faint opacity change remains where it helps the expression stay legible.

## Verification

- Regenerate all avatar and logo assets from the generator.
- Confirm existing static SVG hashes do not change.
- Confirm all animated variants are generated and contain reduced-motion handling.
- Confirm the preview references every static and animated variant.
- Rebuild the docs, brand kit, and emails and verify their current outputs remain unchanged.
- Record the generated comparison gallery and convert it to an H.264 MP4 suitable for inline playback.
