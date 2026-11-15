import { readFileSync, writeFileSync } from "node:fs";

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
writeFileSync(
  new URL("../packages/ui/src/fonts.css", import.meta.url),
  `/* Generated local Latin and Latin Extended subsets; run pnpm docs:generate. */\n${blocks.join("\n\n")}\n`,
);
