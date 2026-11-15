import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import { checkCopy } from "./check-copy.mjs";

async function fixture(files, work) {
  const root = await mkdtemp(join(tmpdir(), "stellara-copy-"));
  try {
    for (const [file, body] of Object.entries(files)) {
      await mkdir(join(root, file, ".."), { recursive: true });
      await writeFile(join(root, file), body);
    }
    await work(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

test("scans catalogue values and template text, excluding implementation and HTML metadata", async () => {
  await fixture(
    {
      "packages/i18n/src/en-NG.json": JSON.stringify({
        "AI.streak": "Claim your mail. Stellara is not affiliated with NECO or any exam body.",
      }),
      "packages/i18n/src/index.ts": "// AI streak",
      "docs/emails/templates/test.html":
        '<head><style>.weak { color: red } /* dark mode */</style></head><body><script>"failed"</script><p title="hurry">All saved.</p></body>',
      "docs/emails/templates/test.txt": "Hello {{child_name}}. 2 days in a row.",
    },
    async (root) => assert.deepEqual(await checkCopy(root), []),
  );
});

test("catches approved phrases, curly quotes, plurals and bracket suffixes at word boundaries", async () => {
  const banned = [
    "weak",
    "failed",
    "ready for",
    "guarantee",
    "don’t lose",
    "hurry",
    "expo",
    "runz",
    "live questions",
    "AI",
    "streaks",
    "behind",
    "last chance",
    "dear parent",
    "do not reply",
    "day(s)",
    "light mode",
    "dark mode",
  ];
  await fixture(
    {
      "packages/i18n/src/en-NG.json": JSON.stringify(
        Object.fromEntries(banned.map((text, i) => [String(i), text.toUpperCase()])),
      ),
      "docs/emails/templates/test.html":
        "<body>Dear <b>parent</b>. Don&#39;t lose. <p>Hurry</p></body>",
      "docs/sms/templates/report.txt": "Live question",
      "docs/whatsapp/templates/report.json": JSON.stringify({ message: "streak" }),
    },
    async (root) => {
      const violations = await checkCopy(root);
      assert.equal(violations.filter((v) => v.path.endsWith("en-NG.json")).length, banned.length);
      assert.ok(violations.some((v) => v.path.endsWith("test.html") && v.phrase === "dear parent"));
      assert.ok(violations.some((v) => v.path.includes("sms")));
      assert.ok(violations.some((v) => v.path.includes("whatsapp")));
      const result = spawnSync(
        process.execPath,
        [fileURLToPath(new URL("./check-copy.mjs", import.meta.url)), root],
        { encoding: "utf8" },
      );
      assert.equal(result.status, 1);
      assert.match(result.stderr, /en-NG.json/);
    },
  );
});
