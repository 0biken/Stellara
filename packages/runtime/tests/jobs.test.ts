import { initialStreak } from "@stellara/rules";
import { describe, expect, it } from "vitest";

import {
  closeLearningDay,
  CRON_JOBS,
  retentionPurgePlan,
  scheduleDueReviews,
  updateItemStats,
} from "../src/jobs/index.js";
import { child, memoryDeps } from "../src/testing/index.js";

import { CHILD, DAY, HOUR, OTHER_CHILD, TOPIC_A, TOPIC_B } from "./helpers.js";

import type { AttemptRecord } from "../src/ports.js";

// 03:05 Lagos on 21 Jan closes learning day 20 Jan.
const CLOSE = Date.parse("2027-01-21T02:05:00Z");

function activity(day: string, scored: number, review = 0) {
  return {
    child_id: CHILD,
    learning_day: day,
    scored_count: scored,
    review_sets_done: review,
    qualifying: scored >= 5 || review > 0,
    credited_by: null,
  };
}

describe("closeLearningDay", () => {
  it("starts a run on the first qualifying day", async () => {
    const { deps, store } = memoryDeps(CLOSE);
    store.addChild(child(CHILD));
    await store.putActivityDay(activity("2027-01-20", 6));
    expect(await closeLearningDay(deps)).toEqual({ processed: 1 });
    expect((await store.getStreak(CHILD))?.run).toBe(1);
    expect((await store.getActivityDay(CHILD, "2027-01-20"))?.credited_by).toBe("activity");
  });

  it("catches up missed runs, uses clouds, excuses outages and is idempotent", async () => {
    const { deps, store, clock } = memoryDeps(CLOSE);
    store.addChild(child(CHILD));
    await store.putStreak(CHILD, { ...initialStreak("2026-T1"), run: 3, lastDay: "2027-01-16" });
    await store.putActivityDay(activity("2027-01-17", 5));
    await store.putActivityDay(activity("2027-01-19", 0, 1));
    store.addOutage({
      start: Date.parse("2027-01-20T09:00:00Z"),
      end: Date.parse("2027-01-20T12:00:00Z"),
    });
    await closeLearningDay(deps);
    const streak = await store.getStreak(CHILD);
    expect(streak).toMatchObject({ run: 5, clouds: 1, lastDay: "2027-01-20" });
    const credited = async (d: string) => (await store.getActivityDay(CHILD, d))?.credited_by;
    expect(await credited("2027-01-17")).toBe("activity");
    expect(await credited("2027-01-18")).toBe("cloud");
    expect(await credited("2027-01-19")).toBe("activity");
    expect(await credited("2027-01-20")).toBe("outage");
    clock.advance(HOUR);
    expect(await closeLearningDay(deps)).toEqual({ processed: 0 });
  });

  it("credits Rest Mode days and rolls the term over", async () => {
    const { deps, store } = memoryDeps(CLOSE);
    store.addChild(child(CHILD, { term_id: "2027-T2" }));
    await store.putStreak(CHILD, {
      ...initialStreak("2026-T1"),
      run: 2,
      restUses: 2,
      lastDay: "2027-01-19",
      rest: { start: "2027-01-20", end: "2027-01-25" },
    });
    await closeLearningDay(deps);
    // A new term clears Rest Mode, so the missed day uses a cloud instead.
    expect(await store.getStreak(CHILD)).toMatchObject({
      run: 2,
      clouds: 1,
      termId: "2027-T2",
      restUses: 0,
    });
    expect((await store.getActivityDay(CHILD, "2027-01-20"))?.credited_by).toBe("cloud");
  });

  it("records Rest Mode credit inside the same term", async () => {
    const { deps, store } = memoryDeps(CLOSE);
    store.addChild(child(CHILD));
    await store.putStreak(CHILD, {
      ...initialStreak("2026-T1"),
      run: 2,
      lastDay: "2027-01-19",
      rest: { start: "2027-01-20", end: "2027-01-25" },
    });
    await closeLearningDay(deps);
    expect((await store.getStreak(CHILD))?.run).toBe(2);
    expect((await store.getActivityDay(CHILD, "2027-01-20"))?.credited_by).toBe("rest");
  });

  it("does not replay more than 14 missed days", async () => {
    const { deps, store } = memoryDeps(CLOSE);
    store.addChild(child(CHILD));
    await store.putStreak(CHILD, { ...initialStreak("2026-T1"), lastDay: "2026-11-01" });
    expect(await closeLearningDay(deps)).toEqual({ processed: 15 });
    expect((await store.getStreak(CHILD))?.lastDay).toBe("2027-01-20");
  });
});

describe("scheduleDueReviews", () => {
  it("materialises due topics without piling up repeats", async () => {
    const { deps, store } = memoryDeps(CLOSE);
    store.addChild(child(CHILD));
    store.addChild(child(OTHER_CHILD, { status: "paused" }));
    await store.putReviews(CHILD, [
      { topicId: TOPIC_A, dueDay: "2027-01-10" },
      { topicId: TOPIC_A, dueDay: "2027-01-17" },
      { topicId: TOPIC_B, dueDay: "2027-01-30" },
    ]);
    expect(await scheduleDueReviews(deps)).toEqual({ processed: 1 });
    expect(store.t.dueQueue.get(CHILD)).toEqual([{ topicId: TOPIC_A, dueDay: "2027-01-10" }]);
  });
});

describe("updateItemStats", () => {
  it("folds the last 24 hours of attempts into cumulative item stats", async () => {
    const { deps, store, clock } = memoryDeps(CLOSE);
    const attempt = (item_id: string, received_at: number, is_correct: boolean) =>
      ({
        client_id: `${item_id}-${received_at}`,
        item_id,
        received_at,
        is_correct,
      }) as AttemptRecord;
    store.t.attempts.push(
      attempt("i1", CLOSE - HOUR, true),
      attempt("i1", CLOSE - 2 * HOUR, false),
      attempt("i2", CLOSE - 3 * HOUR, true),
      attempt("i1", CLOSE - 2 * DAY, true),
    );
    expect(await updateItemStats(deps)).toEqual({ processed: 2 });
    expect(await store.getItemStats("i1")).toMatchObject({ exposure_count: 2, p_correct: 0.5 });
    clock.advance(DAY);
    store.t.attempts.push(attempt("i1", CLOSE + HOUR, true));
    await updateItemStats(deps);
    expect(await store.getItemStats("i1")).toMatchObject({
      exposure_count: 3,
      correct_count: 2,
      updated_at: CLOSE + DAY,
    });
  });
});

describe("retentionPurgePlan", () => {
  it("computes the cutoffs from the retention schedule", async () => {
    const at = Date.parse("2027-06-15T00:00:00Z");
    const { deps, store } = memoryDeps(at);
    store.addChild(child(CHILD, { last_active_at: Date.parse("2026-05-01T00:00:00Z") }));
    store.addChild(child(OTHER_CHILD, { last_active_at: Date.parse("2027-05-01T00:00:00Z") }));
    const plan = await retentionPurgePlan(deps);
    expect(new Date(plan.learning_records_inactive_before).toISOString()).toBe(
      "2026-06-15T00:00:00.000Z",
    );
    expect(new Date(plan.audit_log_before).toISOString()).toBe("2025-06-15T00:00:00.000Z");
    expect(new Date(plan.events_before).toISOString()).toBe("2025-05-15T00:00:00.000Z");
    expect(at - plan.raw_ip_before).toBe(30 * DAY);
    expect(plan.messages_before).toBe(plan.learning_records_inactive_before);
    expect(plan.children).toEqual([CHILD]);
  });
});

describe("CRON_JOBS", () => {
  it("registers each job once, in UTC, one hour behind Lagos", () => {
    expect(new Set(CRON_JOBS.map((j) => j.name)).size).toBe(CRON_JOBS.length);
    expect(CRON_JOBS.find((j) => j.name === "close-learning-day")?.cron_utc).toBe("5 2 * * *");
  });
});
