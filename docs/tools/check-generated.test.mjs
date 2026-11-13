import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const checker = join(dirname(fileURLToPath(import.meta.url)), "check-generated.mjs");
test("freshness gate accepts clean outputs and rejects stale, deleted and new outputs", () => {
  const root = mkdtempSync(join(tmpdir(), "stellara-docs-check-"));
  const git = (...args) => execFileSync("git", args, { cwd: root, stdio: "pipe" });
  const write = (path, content) => { mkdirSync(dirname(join(root, path)), { recursive: true }); writeFileSync(join(root, path), content); };
  const check = () => spawnSync(process.execPath, [checker], { cwd: root, encoding: "utf8" });
  try {
    git("init");
    write("docs/html/index.html", "fresh\n");
    write("brand-kit/kit.html", "fresh\n");
    git("add", ".");
    git("-c", "user.name=Test", "-c", "user.email=test@example.com", "commit", "-m", "fixture");
    assert.equal(check().status, 0, check().stderr);
    write("docs/html/index.html", "stale\n");
    assert.equal(check().status, 1);
    assert.match(check().stderr, /docs\/html\/index.html/);
    mkdirSync(join(root, "docs/tools"), { recursive: true });
    const nested = spawnSync(process.execPath, [checker], { cwd: join(root, "docs/tools"), encoding: "utf8" });
    assert.equal(nested.status, 1, "npm scripts run from docs/tools and must still check root outputs");
    git("restore", "docs/html/index.html");
    rmSync(join(root, "brand-kit/kit.html"));
    assert.equal(check().status, 1);
    git("restore", "brand-kit/kit.html");
    for (const path of ["packages/ui/src/tokens.css", "docs/html/new.html", "brand-kit/new.html", "docs/stellara-docs.html", "docs/assets/auntie-stella/new.svg", "docs/assets/logo/new.svg"]) {
      write(path, "new\n");
      assert.equal(check().status, 1, path);
      assert.ok(check().stderr.includes(path), check().stderr);
      rmSync(join(root, path));
    }
    write("docs/md/draft.md", "source edits are allowed\n");
    assert.equal(check().status, 0);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
