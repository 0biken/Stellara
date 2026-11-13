export interface TimerAnswer {
  readonly id: string;
  readonly itemId: string;
  readonly answeredAt: number;
  readonly receivedAt: number;
  readonly responseMs: number;
}
export interface TimerState {
  readonly startedAt: number;
  readonly lastOperationAt: number;
  readonly originalEndsAt: number;
  readonly endsAt: number;
  readonly pausedMs: number;
  readonly resumeCount: number;
  readonly status: "active" | "paused" | "finished";
  readonly pauseAt: number | null;
  readonly pauses: readonly { readonly start: number; readonly end: number }[];
  readonly answers: readonly TimerAnswer[];
}
export type TimerOperation =
  | ({ readonly kind: "answer" } & TimerAnswer)
  | { readonly kind: "pause"; readonly at: number; readonly validated: boolean }
  | { readonly kind: "resume" | "finish" | "tick"; readonly at: number };
export type TimerDecision =
  | "accepted"
  | "duplicate"
  | "rejected_answer"
  | "untrusted_pause"
  | "paused"
  | "resumed"
  | "finished"
  | "deferred"
  | "invalid_operation";
export interface TimerResult {
  readonly state: TimerState;
  readonly decision: TimerDecision;
}
export function startTimer(startedAt: number, durationMs: number): TimerState {
  if (!Number.isFinite(startedAt) || !Number.isFinite(durationMs) || durationMs <= 0)
    throw new RangeError("Invalid timer");
  return {
    startedAt,
    lastOperationAt: startedAt,
    originalEndsAt: startedAt + durationMs,
    endsAt: startedAt + durationMs,
    pausedMs: 0,
    resumeCount: 0,
    status: "active",
    pauseAt: null,
    pauses: [],
    answers: [],
  };
}
export function suspectTiming(state: TimerState): boolean {
  return (
    state.answers.length > 0 &&
    state.answers.filter((a) => a.responseMs < 1000).length / state.answers.length > 0.3
  );
}
export function operateTimer(state: TimerState, operation: TimerOperation): TimerResult {
  const result = (decision: TimerDecision, next: TimerState = state): TimerResult => ({
    state: next,
    decision,
  });
  const finish = (at: number) =>
    result("finished", { ...state, lastOperationAt: at, status: "finished", pauseAt: null });
  if (operation.kind === "answer") {
    if (state.answers.some((a) => a.id === operation.id || a.itemId === operation.itemId))
      return result("duplicate");
    if (
      state.status === "finished" ||
      !Number.isFinite(operation.answeredAt) ||
      !Number.isFinite(operation.receivedAt) ||
      !Number.isFinite(operation.responseMs) ||
      operation.responseMs < 0 ||
      operation.answeredAt < state.startedAt ||
      operation.answeredAt > operation.receivedAt ||
      operation.answeredAt > state.endsAt ||
      operation.receivedAt > state.endsAt + 900000 ||
      state.pauses.some((p) => operation.answeredAt >= p.start && operation.answeredAt < p.end) ||
      (state.pauseAt !== null && operation.answeredAt >= state.pauseAt)
    )
      return result("rejected_answer");
    const answer: TimerAnswer = {
      id: operation.id,
      itemId: operation.itemId,
      answeredAt: operation.answeredAt,
      receivedAt: operation.receivedAt,
      responseMs: operation.responseMs,
    };
    return result("accepted", { ...state, answers: [...state.answers, answer] });
  }
  if (state.status === "finished") return result("finished");
  if (!Number.isFinite(operation.at) || operation.at < state.lastOperationAt)
    return result("invalid_operation");
  const advanced = { ...state, lastOperationAt: operation.at };
  if (operation.kind === "pause") {
    if (!operation.validated) return result("untrusted_pause");
    if (
      state.status !== "active" ||
      operation.at > state.endsAt ||
      state.answers.some((a) => a.answeredAt >= operation.at)
    )
      return result("invalid_operation");
    return result("paused", { ...advanced, status: "paused", pauseAt: operation.at });
  }
  if (operation.kind === "resume") {
    if (state.pauseAt === null || operation.at < state.pauseAt) return result("invalid_operation");
    const pause = operation.at - state.pauseAt;
    if (state.resumeCount >= 2 || state.pausedMs + pause > 1200000) return finish(operation.at);
    return result("resumed", {
      ...advanced,
      status: "active",
      pauseAt: null,
      resumeCount: state.resumeCount + 1,
      pausedMs: state.pausedMs + pause,
      endsAt: state.endsAt + pause,
      pauses: [...state.pauses, { start: state.pauseAt, end: operation.at }],
    });
  }
  if (state.pauseAt !== null) {
    if (operation.at < state.pauseAt) return result("invalid_operation");
    if (operation.at - state.pauseAt <= 1200000 - state.pausedMs)
      return result("deferred", advanced);
    return finish(operation.at);
  }
  if (operation.kind === "tick" && operation.at <= state.endsAt + 900000)
    return result("deferred", advanced);
  return finish(operation.at);
}
