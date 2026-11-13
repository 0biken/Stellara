import fc from "fast-check";
import { describe, it, expect } from "vitest";

import { initialStardust, awardStardust, stardustName } from "../src/stardust.js";
import {
  initialStreak,
  processStreakDay,
  startRest,
  repairStreak,
  rolloverStreakTerm,
  outageDuration,
} from "../src/streak.js";
import { addCalendarDays } from "../src/time.js";
describe("motivation independent of mastery", () => {
  it("awards actual transitions once, partial cap, and logs zeros", () => {
    let s = initialStardust();
    s = awardStardust(s, {
      id: "level",
      day: "2027-01-01",
      kind: "level",
      topicId: "a",
      level: 3,
    }).state;
    expect(s.total).toBe(25);
    s = awardStardust(s, {
      id: "regain",
      day: "2027-01-01",
      kind: "level",
      topicId: "a",
      level: 3,
    }).state;
    expect(s.total).toBe(25);
    for (let i = 0; i < 17; i++)
      s = awardStardust(s, {
        id: `a${i}`,
        day: "2027-01-01",
        kind: "response",
        correct: true,
        scored: true,
        dueReview: false,
      }).state;
    const partial = awardStardust(s, {
      id: "partial",
      day: "2027-01-01",
      kind: "response",
      correct: true,
      scored: true,
      dueReview: true,
    });
    expect(partial.awarded).toBe(5);
    const capped = awardStardust(partial.state, { id: "cap", day: "2027-01-01", kind: "review" });
    expect(capped.awarded).toBe(0);
    expect(capped.state.ledger.at(-1)?.amount).toBe(0);
    expect(
      awardStardust(capped.state, { id: "cap", day: "2027-01-01", kind: "review" }).state,
    ).toEqual(capped.state);
    expect(stardustName(12000)).toBe("Galaxy");
  });
  it("counts only qualifying days and unioned outage intervals", () => {
    let s = initialStreak("t");
    for (let i = 0; i < 8; i++)
      s = processStreakDay(
        s,
        {
          id: `d${i}`,
          day: addCalendarDays("2027-01-01", i),
          scored: i === 6 ? 0 : 5,
          completedReview: false,
          outages: [],
        },
        "Africa/Lagos",
      );
    expect(s.run).toBe(7);
    expect(s.clouds).toBe(2);
    expect(() =>
      processStreakDay(
        s,
        { id: "skip", day: "2027-01-10", scored: 0, completedReview: false, outages: [] },
        "Africa/Lagos",
      ),
    ).toThrow();
    const start = Date.parse("2027-01-09T02:00Z");
    expect(
      outageDuration("2027-01-09", "Africa/Lagos", [
        { start, end: start + 7200000 },
        { start: start + 3600000, end: start + 10800000 },
      ]),
    ).toBe(10800000);
    s = processStreakDay(
      s,
      {
        id: "outage",
        day: "2027-01-09",
        scored: 0,
        completedReview: false,
        outages: [{ start, end: start + 10800000 }],
      },
      "Africa/Lagos",
    );
    expect(s.run).toBe(7);
  });
  it("freezes rest but counts voluntary activity and resets term quotas only", () => {
    let s = startRest(initialStreak("a"), "2027-01-01", 14);
    s = processStreakDay(
      s,
      { id: "a", day: "2027-01-01", scored: 5, completedReview: false, outages: [] },
      "Africa/Lagos",
    );
    s = processStreakDay(
      s,
      { id: "b", day: "2027-01-02", scored: 0, completedReview: false, outages: [] },
      "Africa/Lagos",
    );
    expect(s.run).toBe(1);
    expect(s.clouds).toBe(2);
    expect(rolloverStreakTerm(s, "b").qualifyingDays).toBe(1);
    expect(() => startRest(s, "2027-01-03", 15)).toThrow();
  });
  it("repairs within 48 hours inclusive without counting missed days", () => {
    let s = { ...initialStreak("t"), clouds: 0 };
    s = processStreakDay(
      s,
      { id: "a", day: "2027-01-01", scored: 5, completedReview: false, outages: [] },
      "Africa/Lagos",
    );
    s = processStreakDay(
      s,
      { id: "b", day: "2027-01-02", scored: 0, completedReview: false, outages: [] },
      "Africa/Lagos",
    );
    const at = Date.parse("2027-01-05T02:00Z");
    s = repairStreak(s, { id: "repair", at, completedReview: true });
    expect(s.run).toBe(1);
    expect(s.repairUsed).toBe(true);
  });
  it("has deterministic immutable bounded rewards under seeded generated sequences", () => {
    fc.assert(
      fc.property(fc.array(fc.boolean(), { maxLength: 100 }), (xs) => {
        const original = initialStardust();
        let s = original;
        xs.forEach((correct, i) => {
          const event = {
            id: String(i),
            day: "2027-01-01",
            kind: "response" as const,
            correct,
            scored: true,
            dueReview: true,
          };
          s = awardStardust(s, event).state;
          expect(awardStardust(s, event).state).toEqual(s);
        });
        expect(s.total).toBeLessThanOrEqual(200);
        expect(original.total).toBe(0);
      }),
      { seed: 1729, numRuns: 100 },
    );
  });
});
