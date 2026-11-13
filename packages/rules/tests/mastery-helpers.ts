import {
  initialMasteryState,
  updateMastery,
  type MasteryEvent,
  type MasteryState,
} from "../src/mastery.js";
import { type ScoringResponse } from "../src/scoring.js";

export function response(id: number, overrides: Partial<ScoringResponse> = {}): ScoringResponse {
  return {
    eventId: `r${id}`,
    itemId: `i${id}`,
    itemVersion: "1",
    answeredAt: id * 86_400_000,
    learningDay: `2026-01-${String(1 + (id % 28)).padStart(2, "0")}`,
    setId: `s${id % 2}`,
    correct: true,
    difficulty: "standard",
    application: false,
    responseMs: 2500,
    quick: false,
    hintShown: false,
    explanationShown: false,
    keyOnDevice: false,
    offline: false,
    grownup: false,
    ...overrides,
  };
}
export function event(
  id: string,
  responses: readonly ScoringResponse[],
  overrides: Partial<MasteryEvent> = {},
): MasteryEvent {
  return {
    eventId: id,
    kind: "practice",
    occurredAt: Math.max(0, ...responses.map((r) => r.answeredAt)),
    responses,
    ...overrides,
  };
}
export function advanced(): MasteryState {
  const base = Array.from({ length: 10 }, (_, i) => response(i));
  const hard = Array.from({ length: 5 }, (_, i) =>
    response(10 + i, { difficulty: "hard", application: i < 2, correct: i !== 4 }),
  );
  return updateMastery(initialMasteryState("topic"), event("advanced", [...base, ...hard])).state;
}
