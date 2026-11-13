import {
  scoreResponse,
  type ScoringResponse,
  type ScoringConfidence,
  type ScoringPriorAttempt,
} from "./scoring.js";

export type MasteryLevel = 0 | 1 | 2 | 3 | 4 | 5;
export interface MasteryEvidence extends ScoringResponse {
  readonly confidence: ScoringConfidence;
}
export interface MasteryState {
  readonly topicId: string;
  readonly level: MasteryLevel;
  readonly evidence: readonly MasteryEvidence[];
  readonly priorAttempts: readonly ScoringPriorAttempt[];
  readonly processedEventIds: readonly string[];
  readonly processedResponseIds: readonly string[];
  readonly enteredLevel4At: number | null;
  readonly firstReachedLevel2At: number | null;
}
export interface MasteryEvent {
  readonly eventId: string;
  readonly kind: "practice" | "assessment" | "placement" | "retention";
  readonly occurredAt: number;
  readonly responses: readonly ScoringResponse[];
  readonly unseen?: boolean;
  readonly mixed?: boolean;
  readonly examAt?: number;
}
export type MasteryTransitionReason =
  | "duplicate_event"
  | "invalid_event"
  | "placement_unchanged"
  | "no_scored_evidence"
  | "practice_unchanged"
  | "level_promoted"
  | "retention_promoted"
  | "retention_downgraded"
  | "retention_unchanged"
  | "retention_invalid";
export interface MasteryUpdate {
  readonly state: MasteryState;
  readonly reason: MasteryTransitionReason;
}

export function initialMasteryState(topicId: string): MasteryState {
  return {
    topicId,
    level: 0,
    evidence: [],
    priorAttempts: [],
    processedEventIds: [],
    processedResponseIds: [],
    enteredLevel4At: null,
    firstReachedLevel2At: null,
  };
}

function practiceLevel(
  state: MasteryState,
  evidence: readonly MasteryEvidence[],
  assessmentPassed: boolean,
): MasteryLevel {
  let level = state.level;
  const last = evidence.slice(-10);
  if (evidence.length >= 4) level = Math.max(level, 1) as MasteryLevel;
  if (evidence.length >= 6 && last.filter((r) => r.correct).length >= 5)
    level = Math.max(level, 2) as MasteryLevel;
  const normal = evidence.filter((r) => r.confidence === "normal");
  const recent = normal.slice(-10),
    correct = recent.filter((r) => r.correct);
  const proficient =
    normal.length >= 10 &&
    correct.length >= 8 &&
    correct.filter((r) => r.difficulty !== "easy").length >= 6 &&
    new Set(recent.map((r) => r.setId)).size >= 2 &&
    new Set(recent.map((r) => r.learningDay)).size >= 2;
  if (proficient || assessmentPassed) level = Math.max(level, 3) as MasteryLevel;
  const hard = normal.filter((r) => r.difficulty === "hard").slice(-5);
  if (
    level >= 3 &&
    hard.length === 5 &&
    hard.filter((r) => r.correct).length >= 4 &&
    hard.filter((r) => r.correct && r.application).length >= 2 &&
    new Set(hard.map((r) => r.setId)).size >= 2
  )
    level = Math.max(level, 4) as MasteryLevel;
  return level;
}

/** Events are consumed in chronological order; placement supplies strand evidence elsewhere. */
export function updateMastery(state: MasteryState, event: MasteryEvent): MasteryUpdate {
  if (state.processedEventIds.includes(event.eventId)) return { state, reason: "duplicate_event" };
  if (
    !event.eventId ||
    !Number.isFinite(event.occurredAt) ||
    event.responses.some((r) => !Number.isFinite(r.answeredAt) || r.answeredAt > event.occurredAt)
  )
    return { state, reason: "invalid_event" };
  const processedEventIds = [...state.processedEventIds, event.eventId];
  const priorAttempts = [...state.priorAttempts],
    processedResponseIds = [...state.processedResponseIds];
  const added: MasteryEvidence[] = [];
  let allUnseen = true;
  for (const response of event.responses) {
    if (priorAttempts.some((a) => a.itemId === response.itemId)) allUnseen = false;
    const scored = scoreResponse(response, priorAttempts, processedResponseIds);
    if (scored.reason === "invalid_response" || scored.reason === "duplicate_event") continue;
    processedResponseIds.push(response.eventId);
    priorAttempts.push({ itemId: response.itemId, answeredAt: response.answeredAt });
    if (scored.scored) added.push({ ...response, confidence: scored.confidence });
  }
  if (event.kind === "placement")
    return {
      state: { ...state, processedEventIds, processedResponseIds, priorAttempts },
      reason: "placement_unchanged",
    };
  const evidence = [...state.evidence, ...added];
  let level = state.level,
    reason: MasteryTransitionReason = "no_scored_evidence";
  if (event.kind === "retention") {
    const valid =
      state.level >= 4 &&
      state.enteredLevel4At !== null &&
      (event.examAt === undefined || Number.isFinite(event.examAt)) &&
      event.responses.every((r, i) => {
        if (i > 0 && r.answeredAt < event.responses[i - 1]!.answeredAt) return false;
        if (event.examAt !== undefined && event.examAt <= r.answeredAt) return false;
        const waitingDays =
          event.examAt !== undefined && event.examAt - r.answeredAt < 42 * 86_400_000 ? 7 : 14;
        return r.answeredAt - state.enteredLevel4At! >= waitingDays * 86_400_000;
      }) &&
      event.unseen === true &&
      event.mixed === true &&
      allUnseen &&
      event.responses.length === 5 &&
      added.length === 5 &&
      added.every((r) => r.confidence === "normal");
    reason = "retention_invalid";
    if (valid) {
      const correct = added.filter((r) => r.correct).length;
      if (correct >= 4 && level === 4) {
        level = 5;
        reason = "retention_promoted";
      } else if (correct <= 2) {
        level = (level - 1) as MasteryLevel;
        reason = "retention_downgraded";
      } else reason = "retention_unchanged";
    }
  } else if (added.length > 0) {
    const passed =
      event.kind === "assessment" &&
      event.responses.length === 10 &&
      added.length === 10 &&
      added.every((r) => r.confidence === "normal") &&
      added.filter((r) => r.correct).length >= 8;
    level = practiceLevel(state, evidence, passed);
    reason = level > state.level ? "level_promoted" : "practice_unchanged";
  }
  const enteredLevel4At =
    level === 4 && state.level !== 4 ? event.occurredAt : state.enteredLevel4At;
  const firstReachedLevel2At =
    state.firstReachedLevel2At === null && level >= 2
      ? event.occurredAt
      : state.firstReachedLevel2At;
  return {
    state: {
      ...state,
      level,
      evidence,
      priorAttempts,
      processedEventIds,
      processedResponseIds,
      enteredLevel4At,
      firstReachedLevel2At,
    },
    reason,
  };
}
