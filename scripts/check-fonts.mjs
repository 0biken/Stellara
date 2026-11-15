import assert from "node:assert/strict";
import { statSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { openSync } from "fontkit";

const required = "ẹọṣńɓɗƙịụ₦ẸỌṢŃƁƊƘỊỤ";
for (const name of ["inter", "nunito"]) {
  const paths = ["latin", "latin-ext", "vietnamese"].map(
    (subset) =>
      new URL(
        `../packages/ui/node_modules/@fontsource-variable/${name}/files/${name}-${subset}-wght-normal.woff2`,
        import.meta.url,
      ),
  );
  const fonts = paths.map((path) => openSync(fileURLToPath(path)));
  const missing = [...required].filter(
    (char) => !fonts.some((font) => font.hasGlyphForCodePoint(char.codePointAt(0))),
  );
  if (name === "inter")
    assert.deepEqual(missing, [], "Inter must cover every required Nigerian-language glyph");
  else
    assert(
      missing.every((char) => "ƙƘ".includes(char)),
      `Unexpected Nunito gaps: ${missing}`,
    );
  console.log(
    `${name}: ${paths.reduce((bytes, path) => bytes + statSync(path).size, 0)} bytes; fallback glyphs: ${missing.join("") || "none"}`,
  );
}
