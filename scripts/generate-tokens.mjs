import { writeFileSync } from "node:fs";

import { SUPPORTING, THEMES } from "../docs/tools/tokens.mjs";

const declarations = (tokens) =>
  Object.entries(tokens)
    .map(([key, value]) => `  --${key}: ${value};`)
    .join("\n");
const light = { ...THEMES.light, ...SUPPORTING.light };
const dark = { ...THEMES.dark, ...SUPPORTING.dark };

// Theme-independent tokens from 08 §4–5.
const shared = {
  "font-display": '"Nunito Variable", "Nunito", "Inter Variable", "Inter", system-ui, sans-serif',
  "font-body":
    '"Inter Variable", "Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  "radius-sm": "10px",
  "radius-md": "16px",
  "radius-lg": "24px",
  "ease-out": "cubic-bezier(0.23, 1, 0.32, 1)",
  "ease-in-out": "cubic-bezier(0.77, 0, 0.175, 1)",
  "motion-press": "120ms",
  "motion-ui": "200ms",
  "motion-reward": "400ms",
  "space-page": "clamp(24px, 6vw, 80px)",
};

const css = `/* Generated from docs/tools/tokens.mjs; run pnpm docs:generate. */
:root {
  color-scheme: light;
${declarations(light)}
${declarations(shared)}
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    color-scheme: dark;
${declarations(dark).replace(/^/gm, "  ")}
  }
}
:root[data-theme="dark"] {
  color-scheme: dark;
${declarations(dark)}
}
@media (prefers-contrast: more) {
  :root {
    --muted: var(--text);
    --line: var(--line-strong);
  }
}
`;
writeFileSync(new URL("../packages/ui/src/tokens.css", import.meta.url), css);

const ts = `/* Generated from docs/tools/tokens.mjs; run pnpm docs:generate. */
/** Browser chrome colours (theme-color) for each theme. */
export const themeColors = { light: "${THEMES.light.bg}", dark: "${THEMES.dark.bg}" } as const;
`;
writeFileSync(new URL("../packages/ui/src/theme-colors.ts", import.meta.url), ts);
console.log("Generated shared UI tokens from the canonical Sweet Garden palette.");
