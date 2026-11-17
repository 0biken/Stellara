import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { openSync } from "fontkit";

const blocks = [];
for (const name of ["inter", "nunito"]) {
  const css = readFileSync(
    new URL(`../packages/ui/node_modules/@fontsource-variable/${name}/wght.css`, import.meta.url),
    "utf8",
  );
  for (const subset of ["latin", "latin-ext", "vietnamese"]) {
    const marker = `/* ${name}-${subset}-wght-normal */`;
    const start = css.indexOf(marker);
    if (start < 0) throw new Error(`Missing ${marker}`);
    blocks.push(
      css
        .slice(start, css.indexOf("}", start) + 1)
        .replaceAll("./files/", `../node_modules/@fontsource-variable/${name}/files/`),
    );
  }
}

// Metric-matched fallbacks (the technique next/font uses). Until a webfont
// arrives the browser draws an Arial-compatible font scaled to the same width
// and line box, so the swap does not move the page (CLS, docs/md/09 §4).
// Arial's figures were measured with fontkit on SAMPLE (Arial and Arial Bold,
// 2048 units per em); Liberation Sans and Arimo share Arial's metrics.
const SAMPLE =
  "The quick brown fox jumps over the lazy dog. Your child sets a goal and practises at their own pace, about ten minutes a session.";
const ARIAL = {
  regular: { avg: 0.44426, local: ["Arial", "ArialMT", "Liberation Sans", "Arimo"] },
  bold: {
    avg: 0.47857,
    local: ["Arial Bold", "Arial-BoldMT", "Liberation Sans Bold", "Arimo Bold"],
  },
};
const percent = (value) => `${(value * 100).toFixed(2)}%`;

function fallbackFace(name, family, weight, range, arial) {
  const file = fileURLToPath(
    new URL(
      `../packages/ui/node_modules/@fontsource-variable/${name}/files/${name}-latin-wght-normal.woff2`,
      import.meta.url,
    ),
  );
  const font = openSync(file).getVariation({ wght: weight });
  const run = font.layout(SAMPLE);
  const avg =
    run.glyphs.reduce((sum, glyph) => sum + glyph.advanceWidth, 0) /
    run.glyphs.length /
    font.unitsPerEm;
  const sizeAdjust = avg / arial.avg;
  const em = (units) => Math.abs(units) / font.unitsPerEm / sizeAdjust;
  return [
    `/* ${family} metrics on Arial, ${range} */`,
    "@font-face {",
    `  font-family: '${family}';`,
    `  font-weight: ${range};`,
    `  src: ${arial.local.map((local) => `local('${local}')`).join(", ")};`,
    `  size-adjust: ${percent(sizeAdjust)};`,
    `  ascent-override: ${percent(em(font.ascent))};`,
    `  descent-override: ${percent(em(font.descent))};`,
    `  line-gap-override: ${percent(em(font.lineGap))};`,
    "}",
  ].join("\n");
}

blocks.push(
  fallbackFace("inter", "Inter Fallback", 400, "100 599", ARIAL.regular),
  fallbackFace("inter", "Inter Fallback", 700, "600 1000", ARIAL.bold),
  fallbackFace("nunito", "Nunito Fallback", 400, "100 599", ARIAL.regular),
  fallbackFace("nunito", "Nunito Fallback", 800, "600 1000", ARIAL.bold),
);

writeFileSync(
  new URL("../packages/ui/src/fonts.css", import.meta.url),
  `/* Generated local Latin and Latin Extended subsets and metric-matched fallbacks; run pnpm docs:generate. */\n${blocks.join("\n\n")}\n`,
);
