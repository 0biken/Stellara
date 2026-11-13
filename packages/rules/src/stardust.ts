export type StardustEvent = { readonly id: string; readonly day: string } & (
  | {
      readonly kind: "response";
      readonly correct: boolean;
      readonly scored: boolean;
      readonly dueReview: boolean;
    }
  | { readonly kind: "review" }
  | { readonly kind: "test"; readonly answered: number; readonly total: number }
  | { readonly kind: "level"; readonly topicId: string; readonly level: number }
);
export interface StardustState {
  readonly total: number;
  readonly byDay: Readonly<Record<string, number>>;
  readonly highwater: Readonly<Record<string, number>>;
  readonly ledger: readonly {
    readonly id: string;
    readonly day: string;
    readonly amount: number;
  }[];
}
export function initialStardust(): StardustState {
  return { total: 0, byDay: {}, highwater: {}, ledger: [] };
}
export function awardStardust(
  state: StardustState,
  event: StardustEvent,
): { state: StardustState; awarded: number } {
  if (state.ledger.some((e) => e.id === event.id)) return { state, awarded: 0 };
  let desired = 0;
  let highwater = state.highwater;
  switch (event.kind) {
    case "response":
      desired = event.correct && event.scored ? 10 + (event.dueReview ? 5 : 0) : 0;
      break;
    case "review":
      desired = 20;
      break;
    case "test":
      desired = event.total > 0 && event.answered >= event.total * 0.8 ? 30 : 0;
      break;
    case "level": {
      if (!Number.isInteger(event.level) || event.level < 0 || event.level > 5)
        throw new RangeError("Invalid level");
      const prior = state.highwater[event.topicId] ?? 0;
      desired = event.level > prior ? 25 : 0;
      highwater = { ...highwater, [event.topicId]: Math.max(prior, event.level) };
      break;
    }
  }
  const awarded = Math.min(desired, Math.max(0, 200 - (state.byDay[event.day] ?? 0)));
  return {
    awarded,
    state: {
      total: state.total + awarded,
      byDay: { ...state.byDay, [event.day]: (state.byDay[event.day] ?? 0) + awarded },
      highwater,
      ledger: [...state.ledger, { id: event.id, day: event.day, amount: awarded }],
    },
  };
}
export function stardustName(
  total: number,
): "Spark" | "Glow" | "Beam" | "Comet" | "Nebula" | "Galaxy" {
  if (total >= 12000) return "Galaxy";
  if (total >= 7000) return "Nebula";
  if (total >= 3500) return "Comet";
  if (total >= 1500) return "Beam";
  if (total >= 500) return "Glow";
  return "Spark";
}
