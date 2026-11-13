import { it, expect } from "vitest";

import s1 from "../fixtures/S-01.json" with { type: "json" };
import s2 from "../fixtures/S-02.json" with { type: "json" };
import s3 from "../fixtures/S-03.json" with { type: "json" };
import x1 from "../fixtures/X-01.json" with { type: "json" };
import { initialStardust, awardStardust } from "../src/stardust.js";
import { initialStreak, processStreakDay } from "../src/streak.js";
import { creditLearningDay } from "../src/time.js";
it("S-01 chronological qualifying days consume and earn clouds", () => {
  let s = initialStreak(s1.termId);
  for (const event of s1.events) s = processStreakDay(s, event, s1.timezone);
  expect(s).toMatchObject(s1.expected);
});
it("S-02 old offline work does not credit a day", () => {
  for (const event of s2.events)
    expect(creditLearningDay(event, s2.timezone)).toMatchObject(s2.expected);
});
it("S-03 outage excuses rather than increments", () => {
  let s = initialStreak(s3.termId);
  for (const event of s3.events) s = processStreakDay(s, event, s3.timezone);
  expect(s).toMatchObject(s3.expected);
});
it("X-01 caps twenty five real response events and retains zero ledger entries", () => {
  let s = initialStardust();
  for (const e of x1.events)
    s = awardStardust(s, { ...e, kind: "response", day: x1.day, dueReview: false }).state;
  expect(s.total).toBe(x1.expected.total);
  expect(s.ledger).toHaveLength(x1.expected.ledgerCount);
});
