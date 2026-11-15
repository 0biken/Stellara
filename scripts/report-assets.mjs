import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

function files(path) {
  return readdirSync(path, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? files(join(path, entry.name)) : [join(path, entry.name)],
  );
}
const assets = files(fileURLToPath(new URL("../apps/web/.next/static", import.meta.url)));
for (const extension of [".js", ".css", ".woff2"]) {
  const selected = assets.filter((path) => path.endsWith(extension));
  console.log(
    `${extension}: ${selected.length} files, ${selected.reduce((sum, path) => sum + statSync(path).size, 0)} bytes (uncompressed build assets; not a page-transfer or full-product performance gate)`,
  );
}
