import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const TOOLS = dirname(fileURLToPath(import.meta.url));
const SOURCE_OUT = join(TOOLS, "..", "assets", "auntie-stella");
const TEST_ROOT = mkdtempSync(join(tmpdir(), "stellara-avatar-test-"));
const TEST_OUT = join(TEST_ROOT, "auntie-stella");

const variants = [
  ["smiling", "auntie-stella-smiling.svg", "auntie-stella-smiling-animated.svg"],
  ["listening", "auntie-stella-listening.svg", "auntie-stella-listening-animated.svg"],
  ["thinking", "auntie-stella-thinking.svg", "auntie-stella-thinking-animated.svg"],
  ["proud", "auntie-stella-proud.svg", "auntie-stella-proud-animated.svg"],
  ["smiling", "auntie-stella-avatar-round.svg", "auntie-stella-avatar-round-animated.svg"],
];

const hash = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");

execFileSync(process.execPath, [join(TOOLS, "avatar.mjs")], {
  cwd: TOOLS,
  env: { ...process.env, STELLARA_AVATAR_OUT: TEST_OUT },
  stdio: "pipe",
});

test("generator creates one accessible animated variant for every static avatar", () => {
  for (const [expression, , animatedName] of variants) {
    const svg = readFileSync(join(TEST_OUT, animatedName), "utf8");
    assert.match(svg, /<svg[^>]+role="img"[^>]+aria-label="[^"]+"/);
    assert.match(svg, /<title>[^<]+<\/title>/);
    assert.match(svg, new RegExp(`class="as-motion as-motion-${expression}"`));
    assert.match(svg, /@keyframes as-/);
    assert.match(svg, /class="as-figure"/);
    assert.match(svg, /class="as-head-motion"/);
    assert.match(svg, /class="as-eyes"/);
    assert.match(svg, /class="as-star"/);
  }
});

test("regeneration preserves every static avatar byte for byte", () => {
  for (const [, staticName] of variants) {
    assert.equal(hash(join(TEST_OUT, staticName)), hash(join(SOURCE_OUT, staticName)), staticName);
  }
});

test("animated variants reduce motion to a gentle opacity pulse", () => {
  for (const [, , animatedName] of variants) {
    const svg = readFileSync(join(TEST_OUT, animatedName), "utf8");
    assert.match(svg, /@media \(prefers-reduced-motion: reduce\)/);
    assert.match(svg, /\.as-figure,\.as-head-motion,\.as-eyes,\.as-star\{animation:none;transform:none\}/);
    assert.match(svg, /\.as-reduced-pulse\{animation:as-soft-pulse 6s var\(--ease-in-out\) infinite\}/);
    assert.match(svg, /@keyframes as-soft-pulse\{0%,100%\{opacity:1\}50%\{opacity:\.92\}\}/);
  }
});

test("generator writes a Sweet Garden static and animated comparison preview", () => {
  const html = readFileSync(join(TEST_OUT, "preview.html"), "utf8");
  assert.match(html, /#FFF8F1/);
  assert.match(html, /#3A2430/);
  assert.match(html, /#C23A68/);
  assert.doesNotMatch(html, /#D9E6F2|#F4DCD5|#1E2B38/);
  assert.equal((html.match(/<img\b/g) || []).length, 10);
  assert.equal((html.match(/<svg\b/g) || []).length, 0);
  for (const [, staticName, animatedName] of variants) {
    assert.match(html, new RegExp(`src="${staticName}"`));
    assert.match(html, new RegExp(`src="${animatedName}"`));
  }
  for (const label of ["Smiling", "Listening", "Thinking", "Proud", "Round"]) {
    assert.match(html, new RegExp(`<h2>${label}</h2>`));
  }
  assert.equal((html.match(/<figcaption>Static<\/figcaption>/g) || []).length, 5);
  assert.equal((html.match(/<figcaption>Animated<\/figcaption>/g) || []).length, 5);
  assert.equal((html.match(/<img[^>]+alt="[^"]+"/g) || []).length, 10);
});
