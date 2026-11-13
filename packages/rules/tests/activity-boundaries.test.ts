import fc from "fast-check";
import { describe, it, expect } from "vitest";

import { placementStrandResult, placementRecommendations } from "../src/placement.js";
import { buildWeeklyReport, reportWindow } from "../src/reports.js";
import { initialStardust, awardStardust, stardustName } from "../src/stardust.js";
import {
  initialStreak,
  processStreakDay,
  startRest,
  repairStreak,
  rolloverStreakTerm,
  outageDuration,
} from "../src/streak.js";
import { learningDay, learningDayBounds, addCalendarDays, creditLearningDay } from "../src/time.js";
import { startTimer, operateTimer, suspectTiming } from "../src/timer.js";
describe("activity boundary validation", () => {
  it("rejects malformed dates, counts autumn DST day, and refuses future device attribution", () => {
    for (const day of ["wrong", "2027-02-30"]) expect(() => addCalendarDays(day, 1)).toThrow();
    expect(() => addCalendarDays("2027-01-01", 0.5)).toThrow();
    expect(() => learningDay(NaN, "Africa/Lagos")).toThrow();
    const b = learningDayBounds("2027-11-06", "America/New_York");
    expect(b.end - b.start).toBe(25 * 3600000);
    expect(
      creditLearningDay({ recordedAt: 100, receivedAt: 0, deviceClockAtSync: 0 }, "Africa/Lagos"),
    ).toMatchObject({ credited: false, source: "server" });
  });
  it("handles every Stardust event threshold and name threshold without mastery fields", () => {
    for (const [value, name] of [
      [0, "Spark"],
      [500, "Glow"],
      [1500, "Beam"],
      [3500, "Comet"],
      [7000, "Nebula"],
      [12000, "Galaxy"],
    ] as const)
      expect(stardustName(value)).toBe(name);
    let s = initialStardust();
    for (const [i, event, amount] of [
      [0, { kind: "response" as const, correct: false, scored: true, dueReview: true }, 0],
      [1, { kind: "response" as const, correct: true, scored: false, dueReview: true }, 0],
      [2, { kind: "review" as const }, 20],
      [3, { kind: "test" as const, answered: 8, total: 10 }, 30],
      [4, { kind: "test" as const, answered: 7, total: 10 }, 0],
      [5, { kind: "test" as const, answered: 0, total: 0 }, 0],
      [6, { kind: "level" as const, topicId: "a", level: 0 }, 0],
    ] as const) {
      const r = awardStardust(s, { ...event, id: String(i), day: "2027-01-01" });
      expect(r.awarded).toBe(amount);
      s = r.state;
    }
    expect(() =>
      awardStardust(s, { id: "bad", day: "2027-01-01", kind: "level", topicId: "a", level: 6 }),
    ).toThrow();
    expect(s.total).toBe(50);
    expect(
      awardStardust(s, { id: "tomorrow", day: "2027-01-02", kind: "review" }).state.total,
    ).toBe(70);
  });
  it("requires a third resume to finalize and finalizes an over-budget pending pause", () => {
    let s = startTimer(100, 60000);
    expect(() => startTimer(0, 0)).toThrow();
    expect(() => startTimer(NaN, 1)).toThrow();
    expect(suspectTiming(s)).toBe(false);
    expect(operateTimer(s, { kind: "resume", at: 100 }).decision).toBe("invalid_operation");
    expect(operateTimer(s, { kind: "finish", at: 99 }).decision).toBe("invalid_operation");
    expect(operateTimer(s, { kind: "pause", at: 60101, validated: true }).decision).toBe(
      "invalid_operation",
    );
    for (let i = 0; i < 2; i++) {
      s = operateTimer(s, { kind: "pause", at: 1000 + i * 2000, validated: true }).state;
      expect(
        operateTimer(s, { kind: "pause", at: 1000 + i * 2000, validated: true }).decision,
      ).toBe("invalid_operation");
      expect(operateTimer(s, { kind: "resume", at: 999 + i * 2000 }).decision).toBe(
        "invalid_operation",
      );
      s = operateTimer(s, { kind: "resume", at: 2000 + i * 2000 }).state;
    }
    s = operateTimer(s, { kind: "pause", at: 6000, validated: true }).state;
    expect(operateTimer(s, { kind: "resume", at: 7000 }).state.status).toBe("finished");
    expect(operateTimer(s, { kind: "finish", at: 5999 }).decision).toBe("invalid_operation");
    expect(operateTimer(s, { kind: "finish", at: 1205001 }).state.status).toBe("finished");
    const ended = operateTimer(startTimer(0, 1000), { kind: "finish", at: 500 }).state;
    expect(operateTimer(ended, { kind: "finish", at: 501 }).decision).toBe("finished");
    expect(
      operateTimer(ended, {
        kind: "answer",
        id: "a",
        itemId: "a",
        answeredAt: 100,
        receivedAt: 100,
        responseMs: 1000,
      }).decision,
    ).toBe("rejected_answer");
  });
  it("rejects answers in historical pauses and invalid response timings", () => {
    let s = startTimer(0, 10000);
    s = operateTimer(s, { kind: "pause", at: 1000, validated: true }).state;
    s = operateTimer(s, { kind: "resume", at: 2000 }).state;
    for (const answer of [
      { answeredAt: 1500, receivedAt: 2000, responseMs: 1000 },
      { answeredAt: 100, receivedAt: 200, responseMs: -1 },
      { answeredAt: NaN, receivedAt: 200, responseMs: 1000 },
      { answeredAt: 100, receivedAt: NaN, responseMs: 1000 },
      { answeredAt: 100, receivedAt: 200, responseMs: NaN },
    ])
      expect(operateTimer(s, { ...answer, id: "a", itemId: "a", kind: "answer" }).decision).toBe(
        "rejected_answer",
      );
  });
  it("does not excuse exactly two outage hours and rejects rest and repair over quotas", () => {
    const step = (s: ReturnType<typeof initialStreak>, day: string, scored: number) =>
      processStreakDay(
        s,
        { id: day, day, scored, completedReview: false, outages: [] },
        "Africa/Lagos",
      );
    let s = { ...initialStreak("t"), clouds: 0 };
    s = step(s, "2027-01-01", 5);
    s = step(s, "2027-01-02", 0);
    s = step(s, "2027-01-03", 5);
    expect(s.run).toBe(1);
    expect(
      repairStreak(s, { id: "r", at: Date.parse("2027-01-04T02:00Z"), completedReview: true }).run,
    ).toBe(2);
    for (const e of [
      { at: 0, completedReview: true },
      { at: Date.parse("2027-01-05T02:00:00.001Z"), completedReview: true },
      { at: Date.parse("2027-01-04T02:00Z"), completedReview: false },
    ])
      expect(() => repairStreak(s, { id: "r", ...e })).toThrow();
    expect(() =>
      repairStreak(initialStreak("t"), { id: "r", at: 0, completedReview: true }),
    ).toThrow();
    const repaired = repairStreak(s, {
      id: "r",
      at: Date.parse("2027-01-04T02:00Z"),
      completedReview: true,
    });
    expect(repairStreak(repaired, { id: "r", at: 0, completedReview: false })).toEqual(repaired);
    expect(() => repairStreak(repaired, { id: "new", at: 0, completedReview: true })).toThrow();
    expect(rolloverStreakTerm(s, "t")).toEqual(s);
    expect(() => startRest(s, "2027-01-01", 1)).toThrow();
    expect(() => startRest(s, "2027-01-04", 0)).toThrow();
    const rest = startRest(startRest(initialStreak("t"), "2027-01-01", 1), "2027-01-02", 1);
    expect(() => startRest(rest, "2027-01-03", 1)).toThrow();
    const t = Date.parse("2027-01-02T02:00Z");
    expect(
      outageDuration("2027-01-02", "Africa/Lagos", [
        { start: t - 3600000, end: t + 7200000 },
        { start: t + 90000000, end: t + 91000000 },
      ]),
    ).toBe(7200000);
    const a = step(initialStreak("t"), "2027-01-01", 5);
    const b = processStreakDay(
      a,
      {
        id: "b",
        day: "2027-01-02",
        scored: 0,
        completedReview: false,
        outages: [{ start: t, end: t + 7200000 }],
      },
      "Africa/Lagos",
    );
    expect(b.clouds).toBe(1);
    expect(
      processStreakDay(
        b,
        { id: "b", day: "2030-01-01", scored: 5, completedReview: true, outages: [] },
        "Africa/Lagos",
      ),
    ).toEqual(b);
  });
  it("keeps generated streak reductions deterministic and immutable with bounded clouds", () => {
    fc.assert(
      fc.property(fc.array(fc.boolean(), { maxLength: 80 }), (xs) => {
        const original = initialStreak("t");
        let s = original;
        xs.forEach((q, i) => {
          const e = {
            id: String(i),
            day: addCalendarDays("2027-01-01", i),
            scored: q ? 5 : 0,
            completedReview: false,
            outages: [],
          };
          const copy = JSON.stringify(s);
          const next = processStreakDay(s, e, "Africa/Lagos");
          expect(JSON.stringify(s)).toBe(copy);
          expect(processStreakDay(s, e, "Africa/Lagos")).toEqual(next);
          s = next;
          expect(s.clouds).toBeGreaterThanOrEqual(0);
          expect(s.clouds).toBeLessThanOrEqual(3);
        });
        expect(original.run).toBe(0);
      }),
      { seed: 2027, numRuns: 40 },
    );
  });
  it("uses report fallback templates and empty coverage", () => {
    const base = {
      topics: [],
      activeDaysTerm: 0,
      practisedDays: 0,
      longestRun: 0,
      blueprints: [{ paper: "p", topicIds: [] }],
    };
    expect(buildWeeklyReport(base).celebrate).toEqual({
      key: "no_practice",
      values: { suggestedMinutes: 10 },
    });
    expect(buildWeeklyReport(base).coverage[0]?.share).toBe(0);
    expect(buildWeeklyReport({ ...base, practisedDays: 2 }).celebrate).toEqual({
      key: "practised_days",
      values: { days: 2 },
    });
    expect(buildWeeklyReport({ ...base, longestRun: 3 }).celebrate).toEqual({
      key: "longest_run",
      values: { days: 3 },
    });
    expect(() => reportWindow(NaN)).toThrow();
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 2000000000 }), (offset) => {
        const at = Date.parse("2027-01-01T00:00Z") + offset;
        const w = reportWindow(at);
        expect(w.end - w.start).toBe(604800000);
        expect(w.end).toBeLessThanOrEqual(at);
        expect(at - w.end).toBeLessThan(604800000);
        expect(reportWindow(w.end + 604800000).start).toBe(w.end);
      }),
      { seed: 42, numRuns: 100 },
    );
  });
  it("rejects invalid placement counts and prioritises check strands", () => {
    for (const [c, a] of [
      [-1, 1],
      [2, 1],
      [0, -1],
      [0.5, 1],
    ])
      expect(() => placementStrandResult(c!, a!)).toThrow();
    expect(
      placementRecommendations(
        [
          { strandId: "a", correct: 2, answered: 4 },
          { strandId: "b", correct: 0, answered: 4 },
        ],
        [
          { id: "a", strandId: "a" },
          { id: "b", strandId: "b" },
          { id: "x", strandId: "missing" },
        ],
      ),
    ).toEqual(["b", "a"]);
  });
});
