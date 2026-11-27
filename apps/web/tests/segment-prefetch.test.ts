// @vitest-environment node
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { fixSegmentPrefetch, flatSegmentName } from "../scripts/fix-segment-prefetch.mjs";

describe("segment prefetch fix", () => {
  it("names nested segment files the way the client requests them", () => {
    expect(flatSegmentName("__next.sign-in/__PAGE__.txt")).toBe("__next.sign-in.__PAGE__.txt");
    expect(flatSegmentName("__next.!KGZhbWlseSk/family/__PAGE__.txt")).toBe(
      "__next.!KGZhbWlseSk.family.__PAGE__.txt",
    );
    expect(flatSegmentName("__next._tree.txt")).toBeNull();
    expect(flatSegmentName("index.txt")).toBeNull();
  });

  it("copies nested files beside their route, once", () => {
    const out = mkdtempSync(join(tmpdir(), "stellara-export-"));
    try {
      mkdirSync(join(out, "family/__next.!KGZhbWlseSk/family"), { recursive: true });
      writeFileSync(join(out, "family/__next.!KGZhbWlseSk/family/__PAGE__.txt"), "rsc");
      writeFileSync(join(out, "family/__next._tree.txt"), "tree");
      expect(fixSegmentPrefetch(out)).toBe(1);
      expect(existsSync(join(out, "family/__next.!KGZhbWlseSk.family.__PAGE__.txt"))).toBe(true);
      expect(fixSegmentPrefetch(out)).toBe(0);
    } finally {
      rmSync(out, { recursive: true, force: true });
    }
  });
});
