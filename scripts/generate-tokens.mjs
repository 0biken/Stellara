import { writeFileSync } from "node:fs";

import { THEMES } from "../docs/tools/tokens.mjs";

const declarations = (tokens) =>
  Object.entries(tokens)
    .map(([key, value]) => `  --${key}: ${value};`)
    .join("\n");
const css = `/* Generated from docs/tools/tokens.mjs; run pnpm docs:generate. */
:root {
  color-scheme: light dark;
${declarations(THEMES.light)}
  --space-page: clamp(24px, 6vw, 80px);
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
${declarations(THEMES.dark).replace(/^/gm, "  ")}
  }
}
:root[data-theme="dark"] {
${declarations(THEMES.dark)}
}
`;
writeFileSync(new URL("../packages/ui/src/tokens.css", import.meta.url), css);
console.log("Generated shared UI tokens from the canonical Sweet Garden palette.");
