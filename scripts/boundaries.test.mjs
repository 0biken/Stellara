import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";

import { checkBoundaries } from "./check-boundaries.mjs";
import { checkClient } from "./check-client.mjs";

test("importing canonical tokens never exits a generator with a similar filename", () => {
  const root = mkdtempSync(join(tmpdir(), "stellara-token-import-"));
  try {
    const entry = join(root, "generate-tokens.mjs");
    const module = pathToFileURL(join(process.cwd(), "docs/tools/tokens.mjs")).href;
    writeFileSync(
      entry,
      `import { THEMES } from ${JSON.stringify(module)}; console.log(THEMES.dark.bg);`,
    );
    assert.equal(execFileSync(process.execPath, [entry], { encoding: "utf8" }).trim(), "#1E1518");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("web import boundary rejects static, dynamic and relative server imports", () => {
  const root = mkdtempSync(join(tmpdir(), "stellara-boundary-"));
  const write = (path, body) => {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), body);
  };
  try {
    write("apps/web/app/page.tsx", 'import { getCatalogue } from "@stellara/i18n";');
    assert.deepEqual(checkBoundaries(root), []);
    for (const statement of [
      'import "@stellara/rules";',
      'export * from "@stellara/content-schema/server";',
      'import("@stellara/rules");',
      'import "../../../packages/rules/src/index.js";',
    ]) {
      write("apps/web/app/page.tsx", statement);
      assert.equal(checkBoundaries(root).length, 1, statement);
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("production audit requires a build and rejects answer-bearing code canaries", () => {
  const root = mkdtempSync(join(tmpdir(), "stellara-bundle-"));
  try {
    assert.throws(() => checkClient(root), /build/i);
    const dir = join(root, "apps/web/.next/static/chunks");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "app.js"), 'console.log("Stellara")');
    assert.deepEqual(checkClient(root), []);
    for (const canary of ['"answer_verified_at"', '"v0.1.0"', '"item_answers"']) {
      writeFileSync(join(dir, "app.js"), canary);
      assert.equal(checkClient(root).length, 1, canary);
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
