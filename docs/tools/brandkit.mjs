// Builds brand-kit/stellara-brand-kit.html from brand-kit/src/stellara-brand-kit.src.html,
// inlining the Auntie Stella SVGs (ids suffixed so each copy stays unique).
// Run: node docs/tools/avatar.mjs && node docs/tools/brandkit.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const A = join(ROOT, "docs", "assets", "auntie-stella");
let n = 0;
const html = readFileSync(join(ROOT, "brand-kit", "src", "stellara-brand-kit.src.html"), "utf8")
  .replace(/<!--STELLA:(\w+)-->/g, (_, k) => {
    const file = k === "round" ? "auntie-stella-avatar-round.svg" : `auntie-stella-${k}.svg`;
    const s = readFileSync(join(A, file), "utf8").trim(); n++;
    return s.replace(/id="([^"]+)"/g, `id="$1-${n}"`).replace(/url\(#([^)]+)\)/g, `url(#$1-${n})`);
  });
writeFileSync(join(ROOT, "brand-kit", "stellara-brand-kit.html"), html);
console.log(`Brand kit built, ${n} avatars inlined, ${(html.length / 1024).toFixed(0)} KB`);
