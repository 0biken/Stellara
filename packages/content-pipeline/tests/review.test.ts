import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { checkBatch } from "../src/checks.js";
import { writeJson } from "../src/files.js";
import { applyReview, renderReviewSheet, reviewTemplate, writeReviewSheet } from "../src/review.js";

import { authorId, buildBatch } from "./helpers.js";

const reviewerId = "40000000-0000-4000-8000-000000000002";
const now = new Date("2026-12-01T09:00:00Z");
function approveFirst(batch = buildBatch()) {
  const review = reviewTemplate(batch);
  review.reviewer_id = reviewerId;
  review.decisions[0] = {
    ...review.decisions[0]!,
    decision: "approve",
    answer_verified: true,
    minutes: 5,
  };
  return { batch, review };
}

describe("applyReview", () => {
  it("refuses a reviewer who is the author in upper case", () => {
    const { batch, review } = approveFirst();
    review.reviewer_id = authorId.toUpperCase();
    expect(() => applyReview(batch, review, now)).toThrow(/author/);
  });
  it("refuses approval without answer_verified", () => {
    const { batch, review } = approveFirst();
    review.decisions[0]!.answer_verified = false;
    const before = structuredClone(batch);
    expect(() => applyReview(batch, review, now)).toThrow(/answer_verified/);
    expect(batch).toEqual(before);
  });
  it("refuses approval of an item that now fails checks", () => {
    const { batch, review } = approveFirst();
    batch.items[0] = { ...batch.items[0]!, hint: "Think about the expo." };
    expect(() => applyReview(batch, review, now)).toThrow(/fails checks/);
  });
  it("refuses a decision for an unknown item", () => {
    const { batch, review } = approveFirst();
    review.decisions[0]!.item_id = "90000000-0000-4000-8000-999999999999";
    expect(() => applyReview(batch, review, now)).toThrow(/unknown item/);
  });
  it("approves and stamps reviewer and time", () => {
    const { batch, review } = approveFirst();
    review.decisions[1] = { ...review.decisions[1]!, decision: "changes_requested", minutes: 3 };
    const updated = applyReview(batch, review, now);
    expect(updated.items[0]).toMatchObject({
      status: "approved",
      reviewer_id: reviewerId,
      answer_verified_at: "2026-12-01T09:00:00.000Z",
    });
    expect(updated.items[1]?.status).toBe("changes_requested");
    expect(updated.items[2]?.status).toBe("draft");
    expect(batch.items[0]?.status).toBe("draft");
  });
});

describe("review sheet", () => {
  it("review sheet marks the keyed option and shows the machine check status", () => {
    const batch = buildBatch();
    const sheet = renderReviewSheet(batch, checkBatch(batch));
    expect(sheet).toContain("Work every answer yourself before you tick answer_verified.");
    expect(sheet).toMatch(/d\. 7,000 \(keyed answer\)/);
    expect(sheet).toMatch(/Machine check: match/);
    expect(sheet).toContain("Gives the face value of the digit.");
  });
  it("review-sheet does not overwrite an existing review.json", () => {
    const dir = mkdtempSync(join(tmpdir(), "stellara-review-"));
    try {
      writeJson(join(dir, "batch.json"), buildBatch());
      writeFileSync(join(dir, "review.json"), '{"kept":true}');
      writeReviewSheet(dir);
      expect(readFileSync(join(dir, "review.json"), "utf8")).toBe('{"kept":true}');
      expect(readFileSync(join(dir, "review.md"), "utf8")).toContain("mathematics.s1.t1");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
