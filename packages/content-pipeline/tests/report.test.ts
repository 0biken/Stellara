import { describe, expect, it } from "vitest";

import { summarisePilot } from "../src/report.js";
import { reviewTemplate } from "../src/review.js";

import { buildBatch } from "./helpers.js";

describe("summarisePilot", () => {
  it("summarises minutes 4, 10 and 6 as median 6 and 200 projected hours", () => {
    const batch = buildBatch();
    const review = reviewTemplate(batch);
    const set = (index: number, decision: "approve" | "changes_requested", minutes: number) => {
      review.decisions[index] = { ...review.decisions[index]!, decision, minutes };
    };
    set(0, "approve", 4);
    set(1, "approve", 10);
    set(2, "changes_requested", 6);
    const summary = summarisePilot([{ batch, review }]);
    expect(summary).toMatchObject({
      topics: 1,
      items: 4,
      approved: 2,
      changes_requested: 1,
      rejected: 0,
      undecided: 1,
      median_minutes_per_item: 6,
      total_review_minutes: 20,
      projected_review_hours_2000_items: 200,
    });
    expect(summary.first_pass_approval_rate).toBeCloseTo(2 / 3);
  });
  it("reports null median when no minutes were recorded", () => {
    const summary = summarisePilot([{ batch: buildBatch(), review: null }]);
    expect(summary.median_minutes_per_item).toBeNull();
    expect(summary.projected_review_hours_2000_items).toBeNull();
    expect(summary.undecided).toBe(4);
  });
});
