import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";

import { checkBudgets, criticalAssets, latinFonts } from "./check-budgets.mjs";

test("critical assets skip legacy polyfills and count preloaded fonts and images", () => {
  const assets = criticalAssets(
    '<link rel="stylesheet" href="/a.css"/><link rel="preload" href="/f.woff2" as="font"/>' +
      '<link rel="preload" as="script" href="/late.js"/><link rel="preconnect" href="/"/>' +
      '<script src="/a.js" async=""></script><script src="/legacy.js" noModule=""></script>' +
      "<script>inline()</script>",
  );
  assert.deepEqual(assets, { js: ["/a.js", "/late.js"], css: ["/a.css"], other: ["/f.woff2"] });
});

test("budgets warn over the spec target and fail over the ceiling", () => {
  const root = mkdtempSync(join(tmpdir(), "stellara-budgets-"));
  const write = (path, body) => {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), body);
  };
  try {
    // Random bytes do not compress, so gzip size is close to the raw size.
    write("_next/static/small.js", randomBytes(10 * 1024));
    write("_next/static/big.js", randomBytes(40 * 1024));
    write("index.html", '<script src="/Stellara/_next/static/small.js"></script>');
    write("heavy/index.html", '<script src="/Stellara/_next/static/big.js"></script>');
    const budgets = { target: { js: 20, total: 100 }, ceiling: { js: 30, total: 100 } };
    const { rows, errors, warnings } = checkBudgets(root, budgets, "/Stellara");
    assert.equal(rows.length, 2);
    assert.equal(warnings.length, 0);
    assert.match(
      errors.join("\n"),
      /\/heavy\/index\.html: js 4\d\.\d KiB is over the 30 KiB ceiling/,
    );

    const loose = checkBudgets(
      root,
      { target: { js: 5, total: 100 }, ceiling: { js: 60, total: 100 } },
      "/Stellara",
    );
    assert.equal(loose.errors.length, 0);
    assert.equal(loose.warnings.length, 2);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("third-party scripts fail the budget check outright", () => {
  const root = mkdtempSync(join(tmpdir(), "stellara-budgets-"));
  try {
    writeFileSync(join(root, "index.html"), '<script src="https://cdn.example.com/x.js"></script>');
    assert.throws(
      () => checkBudgets(root, { target: { js: 130, total: 200 } }),
      /third-party asset https:\/\/cdn\.example\.com\/x\.js/,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("only Basic Latin webfont subsets count towards an English page", () => {
  const css =
    '@font-face{font-family:A;src:url(../media/a-latin.woff2)format("woff2");unicode-range:U+??,U+131}' +
    '@font-face{font-family:A;src:url(../media/a-latin-ext.woff2)format("woff2");unicode-range:U+100-2BA}' +
    "@font-face{font-family:B;src:url('/b.woff2')}" +
    "@font-face{font-family:C;src:url(c.woff2);unicode-range:U+0000-00FF}";
  assert.deepEqual(latinFonts(css), ["../media/a-latin.woff2", "/b.woff2", "c.woff2"]);
});
