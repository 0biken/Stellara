import type {
  AnswerResult,
  ChildResponse,
  StartedSet,
  SubmitOutcome,
  SubmittedAnswer,
} from "./types";
import type { StarLevel } from "@stellara/ui";

/**
 * The practice flow as a pure state machine (KID-03):
 * answer → checking → correct, or "Not quite" with one hint → second try →
 * correct or worked answer → next. A lost connection keeps the answer saved
 * on this phone and moves on without a mark (09 §3 rules 3–4).
 */
export type Phase = "answer" | "checking" | "correct" | "notQuite" | "worked" | "saved" | "done";

export interface PracticeState {
  set: StartedSet;
  topicId: string;
  topicTitle: string;
  index: number;
  phase: Phase;
  attempt: 1 | 2;
  selected: ChildResponse | null;
  /** The first answer that was not right, kept marked while the child tries again. */
  missed: ChildResponse | null;
  hint: string | null;
  hintShown: boolean;
  explanation: string | null;
  questionShownAt: number;
  inARow: number;
  firstTryCorrect: number;
  stardust: number;
  stardustToday: number;
  /** Saved before sending; removed when the server answers. */
  pending: SubmittedAnswer[];
  levelChange: { from: StarLevel; to: StarLevel } | null;
}

export type PracticeEvent =
  | { type: "select"; response: ChildResponse }
  | { type: "check"; answer: SubmittedAnswer }
  | { type: "result"; result: AnswerResult; outcome: SubmitOutcome; allowRetry?: boolean }
  | { type: "offline" }
  | { type: "synced"; outcome: SubmitOutcome; clientIds: string[] }
  | { type: "hint" }
  | { type: "next"; at: number };

export function startPractice(
  set: StartedSet,
  topic: { id: string; title: string },
  at: number,
): PracticeState {
  return {
    set,
    topicId: topic.id,
    topicTitle: topic.title,
    index: 0,
    phase: set.items.length ? "answer" : "done",
    attempt: 1,
    selected: null,
    missed: null,
    hint: null,
    hintShown: false,
    explanation: null,
    questionShownAt: at,
    inARow: 0,
    firstTryCorrect: 0,
    stardust: 0,
    stardustToday: 0,
    pending: [],
    levelChange: null,
  };
}

function absorb(state: PracticeState, outcome: SubmitOutcome): PracticeState {
  const change = outcome.mastery_changes.filter((c) => c.topic_id === state.topicId).at(-1);
  return {
    ...state,
    stardustToday: outcome.stardust_today,
    levelChange: change
      ? { from: state.levelChange?.from ?? change.from, to: change.to }
      : state.levelChange,
  };
}

export function practiceReducer(state: PracticeState, event: PracticeEvent): PracticeState {
  switch (event.type) {
    case "select":
      if (state.phase !== "answer" && state.phase !== "notQuite") return state;
      return { ...state, selected: event.response };
    case "check":
      if (!state.selected || (state.phase !== "answer" && state.phase !== "notQuite")) return state;
      return { ...state, phase: "checking", pending: [...state.pending, event.answer] };
    case "hint":
      return { ...state, hintShown: true };
    case "offline":
      return state.phase === "checking" ? { ...state, phase: "saved" } : state;
    case "synced":
      return absorb(
        {
          ...state,
          pending: state.pending.filter((p) => !event.clientIds.includes(p.client_id)),
          stardust: state.stardust + event.outcome.results.reduce((n, r) => n + r.stardust, 0),
        },
        event.outcome,
      );
    case "result": {
      if (state.phase !== "checking") return state;
      const { result } = event;
      const base = absorb(
        {
          ...state,
          pending: state.pending.filter((p) => p.client_id !== result.client_id),
          stardust: state.stardust + result.stardust,
          explanation: result.explanation_html,
        },
        event.outcome,
      );
      if (result.is_correct)
        return {
          ...base,
          phase: "correct",
          inARow: state.attempt === 1 ? state.inARow + 1 : 0,
          firstTryCorrect: state.firstTryCorrect + (state.attempt === 1 ? 1 : 0),
        };
      if (state.attempt === 1 && event.allowRetry !== false)
        return {
          ...base,
          phase: "notQuite",
          attempt: 2,
          missed: state.selected,
          selected: null,
          hint: result.hint_html ?? null,
          inARow: 0,
        };
      return { ...base, phase: "worked", inARow: 0 };
    }
    case "next": {
      if (!["correct", "worked", "saved"].includes(state.phase)) return state;
      const index = state.index + 1;
      return {
        ...state,
        index,
        phase: index >= state.set.items.length ? "done" : "answer",
        attempt: 1,
        selected: null,
        missed: null,
        hint: null,
        hintShown: false,
        explanation: null,
        questionShownAt: event.at,
      };
    }
  }
}

/** Builds the answer to save and send for the current question. */
export function answerFor(
  state: PracticeState,
  clientId: string,
  at: number,
): SubmittedAnswer | null {
  const item = state.set.items[state.index];
  if (!item || !state.selected) return null;
  return {
    client_id: clientId,
    set_id: state.set.set_id,
    item_id: item.id,
    item_version: item.version,
    response: state.selected,
    hint_shown: state.hintShown,
    response_ms: Math.max(0, Math.round(at - state.questionShownAt)),
    recorded_at: new Date(at).toISOString(),
    key_on_device: false,
  };
}

/** Rotates the correct lines; after 3 first-try answers in a row it counts them (16 §6.1). */
export function correctLine(state: PracticeState):
  | { key: "answer.correct" | "practice.correctYes" | "practice.correctExactly" }
  | {
      key: "practice.inARow";
      count: number;
    } {
  if (state.inARow >= 3) return { key: "practice.inARow", count: state.inARow };
  const lines = ["answer.correct", "practice.correctYes", "practice.correctExactly"] as const;
  return { key: lines[state.index % lines.length]! };
}

/* ---------- Draft: saved before every network call, so a set can resume ---------- */

const draftKey = (childId: string, slot: string) => `stellara.draft.${childId}.${slot}`;

export function saveDraft<T>(childId: string, slot: string, state: T) {
  try {
    window.localStorage.setItem(draftKey(childId, slot), JSON.stringify(state));
  } catch {
    /* No storage: the set still works, it just cannot resume after a reload. */
  }
}
export function loadDraft<T>(childId: string, slot: string): T | null {
  try {
    const raw = window.localStorage.getItem(draftKey(childId, slot));
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
export function clearDraft(childId: string, slot: string) {
  try {
    window.localStorage.removeItem(draftKey(childId, slot));
  } catch {
    /* Nothing to clear. */
  }
}
