import { describe, it, expect } from "vitest";

import { placementStrandResult, placementRecommendations } from "../src/placement.js";
import { reportWindow, buildWeeklyReport } from "../src/reports.js";
import { startTimer, operateTimer, suspectTiming } from "../src/timer.js";
describe("trusted timer", () => {
  it("automatically finalizes strictly after grace and defers trusted ongoing pause only within budget", () => {
    const s = startTimer(0, 60000);
    expect(operateTimer(s, { kind: "tick", at: 960000 }).state.status).toBe("active");
    expect(operateTimer(s, { kind: "tick", at: 960001 }).state.status).toBe("finished");
    const paused = operateTimer(s, { kind: "pause", at: 1000, validated: true }).state;
    expect(operateTimer(paused, { kind: "tick", at: 1201000 }).state.status).toBe("paused");
    expect(operateTimer(paused, { kind: "tick", at: 1201001 }).state.status).toBe("finished");
  });
  it("accepts exact answer and receive deadlines but rejects future and pre-start", () => {
    const s = startTimer(1000, 60000);
    expect(
      operateTimer(s, {
        kind: "answer",
        id: "a",
        itemId: "a",
        answeredAt: 61000,
        receivedAt: 961000,
        responseMs: 1000,
      }).decision,
    ).toBe("accepted");
    for (const [answeredAt, receivedAt] of [
      [999, 1000],
      [61001, 62000],
      [61000, 961001],
      [2000, 1999],
    ])
      expect(
        operateTimer(s, {
          kind: "answer",
          id: "x",
          itemId: "x",
          answeredAt: answeredAt!,
          receivedAt: receivedAt!,
          responseMs: 1000,
        }).decision,
      ).toBe("rejected_answer");
  });
  it("requires validated pauses and extends only by actual pause within two resumes", () => {
    let s = startTimer(0, 60000);
    expect(operateTimer(s, { kind: "pause", at: 1000, validated: false }).decision).toBe(
      "untrusted_pause",
    );
    s = operateTimer(s, { kind: "pause", at: 1000, validated: true }).state;
    expect(
      operateTimer(s, {
        kind: "answer",
        id: "a",
        itemId: "a",
        answeredAt: 2000,
        receivedAt: 2000,
        responseMs: 1000,
      }).decision,
    ).toBe("rejected_answer");
    expect(operateTimer(s, { kind: "finish", at: 1000000 }).state.status).toBe("paused");
    s = operateTimer(s, { kind: "resume", at: 1201000 }).state;
    expect(s.endsAt).toBe(1260000);
    s = operateTimer(s, { kind: "pause", at: 1202000, validated: true }).state;
    expect(operateTimer(s, { kind: "resume", at: 1202001 }).state.status).toBe("finished");
  });
  it("uses answered items denominator with strict thirty percent and deduplicates ids", () => {
    let s = startTimer(0, 60000);
    for (let i = 0; i < 10; i++)
      s = operateTimer(s, {
        kind: "answer",
        id: String(i),
        itemId: String(i),
        answeredAt: 1000,
        receivedAt: 1000,
        responseMs: i < 3 ? 999 : 1000,
      }).state;
    expect(suspectTiming(s)).toBe(false);
    const duplicate = operateTimer(s, {
      kind: "answer",
      id: "0",
      itemId: "0",
      answeredAt: 1000,
      receivedAt: 1000,
      responseMs: 999,
    });
    expect(duplicate.decision).toBe("duplicate");
    s = operateTimer(s, {
      kind: "answer",
      id: "11",
      itemId: "11",
      answeredAt: 1000,
      receivedAt: 1000,
      responseMs: 999,
    }).state;
    expect(suspectTiming(s)).toBe(true);
  });
});
describe("report and placement selectors", () => {
  it("selects completed Sunday snapshots even when the cron runs milliseconds late", () => {
    expect(reportWindow(Date.parse("2027-01-10T17:00Z"))).toEqual({
      start: Date.parse("2027-01-03T17:00Z"),
      end: Date.parse("2027-01-10T17:00Z"),
    });
    expect(reportWindow(Date.parse("2027-01-10T17:00:00.001Z"))).toEqual({
      start: Date.parse("2027-01-03T17:00Z"),
      end: Date.parse("2027-01-10T17:00Z"),
    });
    expect(reportWindow(Date.parse("2027-01-17T17:00Z"))).toEqual({
      start: Date.parse("2027-01-10T17:00Z"),
      end: Date.parse("2027-01-17T17:00Z"),
    });
  });
  it("selects gain ties by id and due topics before low assignment with coverage deduplication", () => {
    const r = buildWeeklyReport({
      topics: [
        { id: "b", level: 3, weeklyGain: 1, due: true, assigned: true },
        { id: "a", level: 5, weeklyGain: 1, due: false, assigned: true },
        { id: "c", level: 0, weeklyGain: 0, due: false, assigned: true },
      ],
      activeDaysTerm: 8,
      practisedDays: 2,
      longestRun: 4,
      blueprints: [{ paper: "math", topicIds: ["a", "a", "c"] }],
    });
    expect(r.celebrate).toEqual({ key: "topic_gain", values: { topicId: "a", gain: 1 } });
    expect(r.next).toEqual(["b", "c"]);
    expect(r.coverage[0]).toEqual({
      paper: "math",
      practised: 1,
      total: 2,
      share: 0.5,
      label: "syllabus_practised_not_predicted_score",
    });
    expect(r.stats).toEqual({ mastered: 1, inProgress: 1, activeDaysTerm: 8 });
  });
  it("returns strand-only placement labels at strict thresholds and stable recommendations", () => {
    expect(placementStrandResult(3, 4)).toBe("looks_secure_so_far");
    expect(placementStrandResult(2, 4)).toBe("not_yet_measured_enough");
    expect(placementStrandResult(1, 3)).toBe("check_this");
    expect(placementStrandResult(0, 0)).toBe("not_yet_measured_enough");
    expect(
      placementRecommendations(
        [
          { strandId: "b", correct: 3, answered: 4 },
          { strandId: "a", correct: 0, answered: 4 },
        ],
        [
          { id: "z", strandId: "a" },
          { id: "c", strandId: "a" },
        ],
      ),
    ).toEqual(["c", "z"]);
    expect(
      placementRecommendations(
        [
          { strandId: "a", correct: 0, answered: 4 },
          { strandId: "b", correct: 0, answered: 4 },
        ],
        [
          { id: "z", strandId: "a" },
          { id: "c", strandId: "a" },
          { id: "a", strandId: "a" },
          { id: "b", strandId: "a" },
          { id: "g", strandId: "b" },
          { id: "h", strandId: "b" },
        ],
      ),
    ).toEqual(["a", "b", "c", "z", "g", "h"]);
  });
  it("sorts every due and same-level assignment deterministically and counts unknown blueprint topics in denominator", () => {
    const topics = ["c", "a", "d", "b"].map((id) => ({
      id,
      level: 2,
      weeklyGain: 1,
      due: true,
      assigned: true,
    }));
    const base = {
      topics,
      activeDaysTerm: 0,
      practisedDays: 0,
      longestRun: 0,
      blueprints: [{ paper: "p", topicIds: ["unknown"] }],
    };
    expect(buildWeeklyReport(base).next).toEqual(["a", "b"]);
    expect(buildWeeklyReport(base).coverage[0]?.practised).toBe(0);
    expect(
      buildWeeklyReport({ ...base, topics: topics.map((t) => ({ ...t, due: false })) }).next,
    ).toEqual(["a", "b"]);
  });
});
