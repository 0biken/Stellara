/** UTC epoch milliseconds; itemId is stable across version changes. */
export interface ScoringResponse {
  readonly eventId: string;
  readonly itemId: string;
  readonly itemVersion: string;
  readonly answeredAt: number;
  readonly learningDay: string;
  readonly setId: string;
  readonly correct: boolean;
  readonly difficulty: "easy" | "standard" | "hard";
  readonly application: boolean;
  readonly responseMs: number;
  readonly quick: boolean;
  readonly hintShown: boolean;
  readonly explanationShown: boolean;
  readonly keyOnDevice: boolean;
  readonly offline: boolean;
  readonly grownup: boolean;
}
export interface ScoringPriorAttempt {
  readonly itemId: string;
  readonly answeredAt: number;
}
export type ScoringConfidence = "normal" | "low";
export type ScoringReason =
  | "eligible"
  | "offline_key"
  | "duplicate_event"
  | "invalid_response"
  | "seen_within_30_days"
  | "hint_shown"
  | "explanation_shown"
  | "too_fast"
  | "key_on_device"
  | "grownup_mode";
export type ScoringResult =
  | {
      readonly scored: true;
      readonly confidence: ScoringConfidence;
      readonly reason: ScoringReason;
    }
  | { readonly scored: false; readonly confidence: null; readonly reason: ScoringReason };

export function scoreResponse(
  response: ScoringResponse,
  priorAttempts: readonly ScoringPriorAttempt[] = [],
  processedEventIds: readonly string[] = [],
): ScoringResult {
  const reject = (reason: ScoringReason): ScoringResult => ({
    scored: false,
    confidence: null,
    reason,
  });
  if (processedEventIds.includes(response.eventId)) return reject("duplicate_event");
  const dayEpoch = Date.parse(`${response.learningDay}T00:00:00.000Z`);
  if (
    !response.eventId ||
    !response.itemId ||
    !response.setId ||
    !Number.isFinite(response.answeredAt) ||
    !Number.isFinite(response.responseMs) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(response.learningDay) ||
    !Number.isFinite(dayEpoch) ||
    new Date(dayEpoch).toISOString().slice(0, 10) !== response.learningDay
  )
    return reject("invalid_response");
  if (
    priorAttempts.some(
      (a) => a.itemId === response.itemId && response.answeredAt - a.answeredAt < 30 * 86_400_000,
    )
  )
    return reject("seen_within_30_days");
  if (response.hintShown) return reject("hint_shown");
  if (response.explanationShown) return reject("explanation_shown");
  if (response.responseMs < (response.quick ? 1500 : 2500)) return reject("too_fast");
  if (response.grownup) return reject("grownup_mode");
  if (response.keyOnDevice && !response.offline) return reject("key_on_device");
  return {
    scored: true,
    confidence: response.keyOnDevice ? "low" : "normal",
    reason: response.keyOnDevice ? "offline_key" : "eligible",
  };
}
