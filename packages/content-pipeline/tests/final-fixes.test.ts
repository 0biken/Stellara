import { mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { checkBatch } from "../src/checks.js";
import { writeJson } from "../src/files.js";
import { applyReview, applyReviewInDir, reviewTemplate } from "../src/review.js";

import { modelDraft } from "./fixtures.js";
import { buildBatch } from "./helpers.js";

const reviewerId = "40000000-0000-4000-8000-000000000002";
const now = new Date("2026-12-01T09:00:00Z");
type Decision = "approve" | "changes_requested" | "reject" | null;
function reviewWith(batch: ReturnType<typeof buildBatch>, decision: Decision, index = 0) {
  const review = reviewTemplate(batch);
  review.reviewer_id = reviewerId;
  review.decisions[index] = {
    ...review.decisions[index]!,
    decision,
    answer_verified: decision === "approve",
    minutes: 5,
  };
  return review;
}

describe("approval is revoked by a later non-approve decision", () => {
  it("reject after approve returns the item to draft and clears the stamp", () => {
    const approved = applyReview(buildBatch(), reviewWith(buildBatch(), "approve"), now);
    const after = applyReview(approved, reviewWith(approved, "reject"), now);
    expect(after.items[0]?.status).toBe("draft");
    expect(after.items[0]).not.toHaveProperty("reviewer_id");
    expect(after.items[0]).not.toHaveProperty("answer_verified_at");
  });
  it("changes_requested after approve clears the stamp", () => {
    const approved = applyReview(buildBatch(), reviewWith(buildBatch(), "approve"), now);
    const after = applyReview(approved, reviewWith(approved, "changes_requested"), now);
    expect(after.items[0]?.status).toBe("changes_requested");
    expect(after.items[0]).not.toHaveProperty("reviewer_id");
  });
});

describe("approval is tied to the item content", () => {
  it("check fails an approved item edited after review", () => {
    const approved = applyReview(buildBatch(), reviewWith(buildBatch(), "approve"), now);
    expect(checkBatch(approved).ok).toBe(true);
    approved.items[0] = {
      ...approved.items[0]!,
      stem: "What is the value of the digit 4 in 47,325?",
    };
    expect(checkBatch(approved).items[0]?.errors.join(" ")).toMatch(/changed since review/);
  });
  it("lets the reviewer re-approve an edited item", () => {
    const approved = applyReview(buildBatch(), reviewWith(buildBatch(), "approve"), now);
    approved.items[0] = { ...approved.items[0]!, hint: "Use a place value chart." };
    const again = applyReview(approved, reviewWith(approved, "approve"), now);
    expect(checkBatch(again).ok).toBe(true);
  });
});

describe("apply-review uses the same duplicate check as check", () => {
  it("refuses to approve an item whose stem exists in another topic folder", () => {
    const root = mkdtempSync(join(tmpdir(), "stellara-apply-"));
    try {
      for (const name of ["a", "b"]) {
        mkdirSync(join(root, name));
        writeJson(join(root, name, "batch.json"), buildBatch());
      }
      writeJson(join(root, "b", "review.json"), reviewWith(buildBatch(), "approve"));
      const before = readFileSync(join(root, "b", "batch.json"));
      expect(() => applyReviewInDir(join(root, "b"), now)).toThrow(/fails checks/);
      expect(readFileSync(join(root, "b", "batch.json")).equals(before)).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe("review file integrity", () => {
  it("refuses duplicate decisions for the same item", () => {
    const batch = buildBatch();
    const review = reviewWith(batch, "approve");
    review.decisions[1] = { ...review.decisions[0]! };
    expect(() => applyReview(batch, review, now)).toThrow(/more than once/);
  });
  it("refuses to approve an item with no author of record", () => {
    const batch = buildBatch();
    delete batch.items[0]!.author_id;
    expect(checkBatch(batch).items[0]?.errors.join(" ")).toMatch(/author_id/);
    expect(() => applyReview(batch, reviewWith(batch, "approve"), now)).toThrow(/author/);
  });
});

describe("duplicate option values", () => {
  it("fails options with the same value even without a check expression", () => {
    const draft = structuredClone(modelDraft);
    draft.items[0]!.options = [
      { id: "a", text: "7000" },
      { id: "b", text: "7,000" },
      { id: "c", text: "700" },
      { id: "d", text: "70" },
    ];
    draft.items[0]!.check_expression = null;
    draft.items[0]!.distractor_notes = ["a", "b", "c"].map((id) => ({ option_id: id, why: "x" }));
    expect(checkBatch(buildBatch(draft)).items[0]?.errors.join(" ")).toMatch(/same value/);
  });
});
