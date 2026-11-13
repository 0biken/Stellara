import { expect, it } from "vitest";

import { initialMasteryState, updateMastery, type MasteryEvent } from "../src/mastery.js";
import { scoreResponse } from "../src/scoring.js";

import { advanced, event, response } from "./mastery-helpers.js";

const DAY = 86_400_000;
function retention(answerDays: number[], overrides: Partial<MasteryEvent> = {}) {
  const state = advanced();
  const entered = state.enteredLevel4At!;
  return {
    state,
    check: event(
      "retention-correction",
      answerDays.map((day, i) => response(800 + i, { answeredAt: entered + day * DAY })),
      {
        kind: "retention",
        occurredAt: entered + 60 * DAY,
        unseen: true,
        mixed: true,
        ...overrides,
      },
    ),
  };
}

it("does not let delayed retention submission turn early answers into eligible evidence", () => {
  for (const days of [
    [1, 1, 1, 1, 1],
    [13, 14, 14, 14, 14],
  ]) {
    const { state, check } = retention(days);
    expect(updateMastery(state, check).state.level).toBe(4);
  }
  const { state, check } = retention([14, 14, 14, 14, 14]);
  expect(updateMastery(state, check).state.level).toBe(5);
});

it("uses answer-time exam proximity rather than upload-time proximity", () => {
  const { state, check } = retention([7, 7, 7, 7, 7]);
  const entered = state.enteredLevel4At!;
  expect(
    updateMastery(state, { ...check, occurredAt: entered + 14 * DAY, examAt: entered + 49 * DAY })
      .state.level,
  ).toBe(4);
  expect(updateMastery(state, { ...check, examAt: entered + 49 * DAY - 1 }).state.level).toBe(5);
  expect(updateMastery(state, { ...check, examAt: entered + 8 * DAY }).state.level).toBe(5);
});

it("rejects malformed exam timestamps and out-of-order retention answers", () => {
  for (const examAt of [NaN, Infinity, -Infinity, 0]) {
    const { state, check } = retention([14, 14, 14, 14, 14], { examAt });
    expect(updateMastery(state, check).state.level).toBe(4);
  }
  const { state, check } = retention([15, 14, 15, 15, 15]);
  expect(updateMastery(state, check).state.level).toBe(4);
});

it("allows corrected response IDs and fresh IDs after invalid responses without poisoning item sightings", () => {
  for (const sameId of [true, false]) {
    const malformed = response(900, { learningDay: "bad" });
    const invalid = updateMastery(
      initialMasteryState("topic"),
      event("bad-calendar", [malformed]),
    ).state;
    expect(invalid.priorAttempts).toEqual([]);
    expect(invalid.processedResponseIds).toEqual([]);
    const fixed = {
      ...malformed,
      learningDay: "2026-01-01",
      eventId: sameId ? malformed.eventId : "new-response",
    };
    expect(updateMastery(invalid, event("fixed-calendar", [fixed])).state.evidence).toHaveLength(1);
  }
});

it("rejects impossible calendar dates while accepting actual leap dates", () => {
  for (const learningDay of [
    "2026-02-30",
    "2026-02-31",
    "2026-02-29",
    "2026-04-31",
    "2026-99-01",
  ]) {
    expect(scoreResponse(response(910, { learningDay })).reason).toBe("invalid_response");
  }
  expect(scoreResponse(response(910, { learningDay: "2028-02-29" })).scored).toBe(true);
  const rs = Array.from({ length: 10 }, (_, i) =>
    response(920 + i, { learningDay: i < 5 ? "2026-02-28" : "2026-02-30" }),
  );
  const result = updateMastery(initialMasteryState("topic"), event("fake-second-day", rs)).state;
  expect(result.level).toBe(1);
  expect(result.evidence).toHaveLength(5);
});

it("placement records valid sightings and response IDs while leaving mastery and evidence unchanged", () => {
  const initial = advanced();
  const r = response(950);
  const placed = updateMastery(
    initial,
    event("placement-history", [r, response(951, { learningDay: "bad" })], { kind: "placement" }),
  ).state;
  expect(placed.level).toBe(initial.level);
  expect(placed.evidence).toEqual(initial.evidence);
  expect(placed.priorAttempts).toContainEqual({ itemId: r.itemId, answeredAt: r.answeredAt });
  expect(placed.processedResponseIds).toContain(r.eventId);
  expect(placed.processedResponseIds).not.toContain("r951");
  const next = updateMastery(
    placed,
    event("practice-after-placement", [
      { ...r, eventId: "practice-new-id", itemVersion: "2", answeredAt: r.answeredAt + DAY },
    ]),
  ).state;
  expect(next.evidence).toEqual(initial.evidence);
  expect(
    updateMastery(placed, event("placement-history", [r], { kind: "placement" })).state,
  ).toEqual(placed);
});
