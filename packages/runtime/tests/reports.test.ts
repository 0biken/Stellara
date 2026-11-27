import { initialStreak, type MasteryState } from "@stellara/rules";
import { describe, expect, it } from "vitest";

import { CRON_JOBS } from "../src/jobs/index.js";
import { reportMonthly, reportWeekly, REPORT_TEMPLATE_VERSION } from "../src/reports.js";
import { child, memoryReportDeps, uuidFrom } from "../src/testing/index.js";

import { CHILD, HOUR, OTHER_CHILD, TOPIC_A, TOPIC_B, TOPIC_C, TOPIC_D } from "./helpers.js";

import type { AttemptRecord, MasteryEventRecord } from "../src/ports.js";
import type { MemoryStore } from "../src/testing/index.js";

// Sunday 17 Jan 2027, 18:30 Lagos: the snapshot 10 Jan 18:00 → 17 Jan 18:00 has ended.
const SUNDAY = Date.parse("2027-01-17T17:30:00Z");
const WEEK_START = Date.parse("2027-01-10T17:00:00Z");
const WEEK_END = Date.parse("2027-01-17T17:00:00Z");

let n = 0;
function attempt(childId: string, day: string, at: number, scored = true): AttemptRecord {
  n++;
  return {
    id: uuidFrom(0xb, n),
    client_id: uuidFrom(0xd, 1000 + n),
    child_id: childId,
    set_id: uuidFrom(0x5, 1),
    item_id: uuidFrom(0x1, 1),
    item_version: 1,
    topic_id: TOPIC_A,
    response: {},
    is_correct: true,
    scored,
    confidence: null,
    reason: scored ? "eligible" : "grownup_mode",
    hint_shown: false,
    response_ms: 4000,
    recorded_at: at,
    received_at: at,
    answered_at: at,
    learning_day: day,
    key_on_device: false,
    rules_version: "v0.1.0",
  };
}

function level(store: MemoryStore, childId: string, topicId: string, value: number) {
  return store.putMastery(childId, { topicId, level: value } as unknown as MasteryState);
}

function event(
  childId: string,
  topicId: string,
  from: number,
  to: number,
  at: number,
): MasteryEventRecord {
  n++;
  return {
    id: uuidFrom(0x9, n),
    child_id: childId,
    topic_id: topicId,
    from_level: from,
    to_level: to,
    cause: "practice",
    attempt_id: null,
    created_at: at,
  };
}

describe("reportWeekly", () => {
  it("builds the report blocks from the week's evidence", async () => {
    const { deps, store } = memoryReportDeps(SUNDAY);
    store.addChild(child(CHILD, { year: "P5", term_id: "2026-T1" }));
    store.addPathway("P5", [TOPIC_A, TOPIC_B, TOPIC_C, TOPIC_D]);
    store.addTopicTitle(TOPIC_A, "Fractions");
    store.addTopicTitle(TOPIC_B, "Ratios");
    store.addTopicTitle(TOPIC_C, "Place value");
    await level(store, CHILD, TOPIC_A, 5);
    await level(store, CHILD, TOPIC_B, 3);
    await level(store, CHILD, TOPIC_C, 1);
    await store.insertMasteryEvents([
      event(CHILD, TOPIC_A, 3, 4, WEEK_START + HOUR),
      event(CHILD, TOPIC_A, 4, 5, WEEK_START + 2 * HOUR),
      event(CHILD, TOPIC_B, 2, 3, WEEK_START + 3 * HOUR),
      // Before the window: not part of this week's gain.
      event(CHILD, TOPIC_B, 1, 2, WEEK_START - HOUR),
    ]);
    await store.putReviews(CHILD, [{ topicId: TOPIC_B, dueDay: "2027-01-16" }]);
    await store.putStreak(CHILD, { ...initialStreak("2026-T1"), qualifyingDays: 23 });
    await store.insertAttempts([
      attempt(CHILD, "2027-01-11", Date.parse("2027-01-11T09:00:00Z")),
      attempt(CHILD, "2027-01-12", Date.parse("2027-01-12T09:00:00Z")),
      attempt(CHILD, "2027-01-14", Date.parse("2027-01-14T09:00:00Z")),
      // Practice-only answers are not scored and do not count.
      attempt(CHILD, "2027-01-15", Date.parse("2027-01-15T09:00:00Z"), false),
      // Late Sunday belongs to the next report.
      attempt(CHILD, "2027-01-17", WEEK_END + 10 * 60_000),
    ]);
    store.addBlueprint({ paper: "Paper I", topicIds: [TOPIC_A, TOPIC_B, TOPIC_C, TOPIC_D] });

    expect(await reportWeekly(deps)).toEqual({ processed: 1, created: 1 });
    const [saved] = store.t.reports;
    expect(saved).toMatchObject({
      child_id: CHILD,
      kind: "weekly",
      period_start: WEEK_START,
      period_end: WEEK_END,
      template_version: REPORT_TEMPLATE_VERSION,
      opened_at: null,
    });
    if (saved?.payload.kind !== "weekly") throw new Error("expected a weekly payload");
    const { report, topics } = saved.payload;
    expect(report.stats).toEqual({ mastered: 1, inProgress: 1, activeDaysTerm: 23 });
    expect(report.celebrate).toEqual({ key: "topic_gain", values: { topicId: TOPIC_A, gain: 2 } });
    // Due review first, then the lowest-level pathway topic.
    expect(report.next).toEqual([TOPIC_B, TOPIC_D]);
    expect(report.coverage).toEqual([
      {
        paper: "Paper I",
        practised: 2,
        total: 4,
        share: 0.5,
        label: "syllabus_practised_not_predicted_score",
      },
    ]);
    expect(report.note.key).toBe("celebrate_and_review");
    expect(topics).toEqual({ [TOPIC_A]: "Fractions", [TOPIC_B]: "Ratios" });
  });

  it("celebrates a run of days, then practised days, then stays neutral", async () => {
    const { deps, store } = memoryReportDeps(SUNDAY);
    store.addChild(child(CHILD));
    store.addChild(child(OTHER_CHILD));
    await store.insertAttempts([
      attempt(CHILD, "2027-01-11", Date.parse("2027-01-11T09:00:00Z")),
      attempt(CHILD, "2027-01-12", Date.parse("2027-01-12T09:00:00Z")),
      attempt(CHILD, "2027-01-13", Date.parse("2027-01-13T09:00:00Z")),
    ]);
    await reportWeekly(deps);
    const byChild = new Map(store.t.reports.map((r) => [r.child_id, r.payload]));
    const mine = byChild.get(CHILD);
    const other = byChild.get(OTHER_CHILD);
    if (mine?.kind !== "weekly" || other?.kind !== "weekly") throw new Error("missing reports");
    expect(mine.report.celebrate).toEqual({ key: "longest_run", values: { days: 3 } });
    expect(other.report.celebrate).toEqual({
      key: "no_practice",
      values: { suggestedMinutes: 10 },
    });
    expect(other.report.note.key).toBe("gentle_ten_minutes");
    expect(other.report.stats.activeDaysTerm).toBe(0);
  });

  it("is idempotent and skips children added after the period", async () => {
    const { deps, store } = memoryReportDeps(SUNDAY);
    store.addChild(child(CHILD));
    store.addChild(child(OTHER_CHILD, { created_at: WEEK_END + 1 }));
    store.addChild(child(uuidFrom(0xc, 9), { status: "paused" }));
    expect(await reportWeekly(deps)).toEqual({ processed: 2, created: 1 });
    expect(await reportWeekly(deps)).toEqual({ processed: 2, created: 0 });
    expect(store.t.reports).toHaveLength(1);
  });

  it("leaves no report behind when the write fails", async () => {
    const { deps, store } = memoryReportDeps(SUNDAY);
    store.addChild(child(CHILD));
    store.failOn = "insertReport";
    await expect(reportWeekly(deps)).rejects.toThrow("Injected failure");
    expect(store.t.reports).toHaveLength(0);
  });
});

describe("report data rights", () => {
  it("exports and deletes a child's reports with their other records", async () => {
    const { deps, store } = memoryReportDeps(SUNDAY);
    store.addChild(child(CHILD));
    store.addChild(child(OTHER_CHILD));
    await reportWeekly(deps);
    const exported = await store.collectChildExportData(CHILD);
    expect(exported.reports).toHaveLength(1);
    await store.deleteChildLearningRecords(CHILD);
    expect(store.t.reports.map((r) => r.child_id)).toEqual([OTHER_CHILD]);
  });
});

describe("reportMonthly", () => {
  it("summarises the Lagos calendar month that just ended", async () => {
    // 1 Feb 2027, 18:00 Lagos.
    const { deps, store } = memoryReportDeps(Date.parse("2027-02-01T17:00:00Z"));
    store.addChild(child(CHILD));
    store.addTopicTitle(TOPIC_A, "Fractions");
    store.addTopicTitle(TOPIC_B, "Ratios");
    await level(store, CHILD, TOPIC_A, 5);
    await level(store, CHILD, TOPIC_B, 4);
    await store.insertMasteryEvents([
      event(CHILD, TOPIC_A, 4, 5, Date.parse("2027-01-20T10:00:00Z")),
    ]);
    await store.insertAttempts([
      attempt(CHILD, "2027-01-05", Date.parse("2027-01-05T09:00:00Z")),
      attempt(CHILD, "2027-01-20", Date.parse("2027-01-20T09:00:00Z")),
      // 1 Feb 00:30 Lagos is February, though still 31 Jan in UTC.
      attempt(CHILD, "2027-02-01", Date.parse("2027-01-31T23:30:00Z")),
    ]);
    expect(await reportMonthly(deps)).toEqual({ processed: 1, created: 1 });
    const [saved] = store.t.reports;
    expect(saved).toMatchObject({
      kind: "monthly",
      period_start: Date.parse("2026-12-31T23:00:00Z"),
      period_end: Date.parse("2027-01-31T23:00:00Z"),
    });
    if (saved?.payload.kind !== "monthly") throw new Error("expected a monthly payload");
    expect(saved.payload.month).toBe("2027-01");
    expect(saved.payload.summary.stats).toEqual({ activeDays: 2, mastered: 1, inProgress: 1 });
    expect(saved.payload.summary.note).toEqual({
      key: "month_mastered",
      values: { topicIds: [TOPIC_A] },
    });
    expect(saved.payload.topics).toEqual({ [TOPIC_A]: "Fractions", [TOPIC_B]: "Ratios" });
  });

  it("is registered with its own schedule", () => {
    expect(CRON_JOBS.find((j) => j.name === "report-monthly")?.cron_utc).toBe("0 17 1 * *");
  });
});
