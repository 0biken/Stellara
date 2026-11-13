import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { cpSync, mkdtempSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const tools = dirname(fileURLToPath(import.meta.url));
test("rebuilding after a guide is removed deletes its obsolete HTML page", () => {
  const root = mkdtempSync(join(tmpdir(), "stellara-build-test-"));
  try {
    for (const dir of ["md", "assets"]) cpSync(join(tools, "..", dir), join(root, "docs", dir), { recursive: true });
    cpSync(join(tools, "build.mjs"), join(root, "docs/tools/build.mjs"));
    cpSync(join(tools, "node_modules/marked"), join(root, "docs/tools/node_modules/marked"), { recursive: true, dereference: true });
    const build = () => execFileSync(process.execPath, [join(root, "docs/tools/build.mjs")], { stdio: "pipe" });
    build();
    assert.ok(existsSync(join(root, "docs/html/16-ux-writing.html")));
    rmSync(join(root, "docs/md/16-ux-writing.md"));
    build();
    assert.equal(existsSync(join(root, "docs/html/16-ux-writing.html")), false);
    assert.ok(existsSync(join(root, "docs/html/index.html")));
    assert.ok(existsSync(join(root, "docs/html/00-index.html")));
  } finally { rmSync(root, { recursive: true, force: true }); }
});
