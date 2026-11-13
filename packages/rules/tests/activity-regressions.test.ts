import { it, expect } from "vitest";

import { initialStreak, processStreakDay, repairStreak } from "../src/streak.js";
import { startTimer, operateTimer } from "../src/timer.js";

it("rejects backdated pause replay instead of extending the same interval twice", () => {
  let s = startTimer(0, 60000);
  s = operateTimer(s, { kind: "pause", at: 1000, validated: true }).state;
  s = operateTimer(s, { kind: "resume", at: 11000 }).state;
  const before = JSON.stringify(s);
  const result = operateTimer(s, { kind: "pause", at: 1000, validated: true });
  expect(result.decision).toBe("invalid_operation");
  expect(JSON.stringify(result.state)).toBe(before);
  expect(result.state.endsAt).toBe(70000);
});
it("rejects pause before accepted answer while permitting delayed and reordered offline answers", () => {
  let s = startTimer(0, 60000);
  s = operateTimer(s, {
    kind: "answer",
    id: "a",
    itemId: "a",
    answeredAt: 5000,
    receivedAt: 6000,
    responseMs: 1000,
  }).state;
  expect(operateTimer(s, { kind: "pause", at: 4000, validated: true }).decision).toBe(
    "invalid_operation",
  );
  s = operateTimer(s, { kind: "pause", at: 7000, validated: true }).state;
  s = operateTimer(s, { kind: "resume", at: 17000 }).state;
  s = operateTimer(s, { kind: "tick", at: 100000 }).state;
  expect(operateTimer(s, { kind: "pause", at: 18000, validated: true }).decision).toBe(
    "invalid_operation",
  );
  expect(operateTimer(s, { kind: "finish", at: 99999 }).decision).toBe("invalid_operation");
  expect(operateTimer(s, { kind: "resume", at: 99999 }).decision).toBe("invalid_operation");
  const delayed = operateTimer(s, {
    kind: "answer",
    id: "b",
    itemId: "b",
    answeredAt: 2000,
    receivedAt: 100001,
    responseMs: 1000,
  });
  expect(delayed.decision).toBe("accepted");
  expect(
    operateTimer(delayed.state, {
      kind: "answer",
      id: "c",
      itemId: "c",
      answeredAt: 70000,
      receivedAt: 970000,
      responseMs: 1000,
    }).decision,
  ).toBe("accepted");
});
it("rejects nonfinite repairs and invalid calendar context before comparing repair windows", () => {
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
  for (const at of [NaN, Infinity, -Infinity])
    expect(() => repairStreak(s, { id: "r", at, completedReview: true })).toThrow();
  for (const day of ["bad", "2027-02-30"])
    expect(() =>
      processStreakDay(
        initialStreak("t"),
        { id: "x", day, scored: 5, completedReview: false, outages: [] },
        "Africa/Lagos",
      ),
    ).toThrow();
  for (const endedAt of [NaN, Infinity, -Infinity])
    expect(() =>
      repairStreak(
        { ...s, ended: { at: endedAt, formerRun: 1, subsequentQualifying: 0 } },
        { id: "r", at: Date.parse("2027-01-04T02:00Z"), completedReview: true },
      ),
    ).toThrow();
  expect(() =>
    repairStreak(
      { ...s, lastDay: "bad" },
      { id: "r", at: Date.parse("2027-01-04T02:00Z"), completedReview: true },
    ),
  ).toThrow();
});
