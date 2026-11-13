import { addCalendarDays, learningDayBounds } from "./time.js";
export interface StreakOutage {
  readonly start: number;
  readonly end: number;
}
export interface StreakState {
  readonly termId: string;
  readonly run: number;
  readonly clouds: number;
  readonly qualifyingDays: number;
  readonly restUses: number;
  readonly repairUsed: boolean;
  readonly lastDay: string | null;
  readonly rest: { readonly start: string; readonly end: string } | null;
  readonly ended: {
    readonly at: number;
    readonly formerRun: number;
    readonly subsequentQualifying: number;
  } | null;
  readonly eventIds: readonly string[];
}
export interface StreakDay {
  readonly id: string;
  readonly day: string;
  readonly scored: number;
  readonly completedReview: boolean;
  readonly outages: readonly StreakOutage[];
}
export function initialStreak(termId: string): StreakState {
  return {
    termId,
    run: 0,
    clouds: 2,
    qualifyingDays: 0,
    restUses: 0,
    repairUsed: false,
    lastDay: null,
    rest: null,
    ended: null,
    eventIds: [],
  };
}
export function outageDuration(
  day: string,
  timezone: string,
  intervals: readonly StreakOutage[],
): number {
  if (intervals.length === 0) return 0;
  const bounds = learningDayBounds(day, timezone);
  const clipped = intervals
    .map((i) => ({ start: Math.max(i.start, bounds.start), end: Math.min(i.end, bounds.end) }))
    .filter((i) => i.end > i.start)
    .sort((a, b) => a.start - b.start);
  let total = 0,
    end = bounds.start;
  for (const interval of clipped) {
    total += Math.max(0, interval.end - Math.max(end, interval.start));
    end = Math.max(end, interval.end);
  }
  return total;
}
export function processStreakDay(
  state: StreakState,
  input: StreakDay,
  timezone: string,
): StreakState {
  if (state.eventIds.includes(input.id)) return state;
  addCalendarDays(input.day, 0);
  if (state.lastDay !== null && addCalendarDays(state.lastDay, 1) !== input.day)
    throw new RangeError("Days must be consecutive and chronological");
  const qualified = input.scored >= 5 || input.completedReview;
  const qualifyingDays = state.qualifyingDays + (qualified ? 1 : 0);
  let run = state.run,
    clouds = state.clouds,
    ended = state.ended;
  if (qualified) {
    run++;
    if (qualifyingDays % 5 === 0) clouds = Math.min(3, clouds + 1);
    if (ended) ended = { ...ended, subsequentQualifying: ended.subsequentQualifying + 1 };
  } else if (
    (state.rest && input.day >= state.rest.start && input.day <= state.rest.end) ||
    outageDuration(input.day, timezone, input.outages) > 7200000
  ) {
    /* excused */
  } else if (run > 0) {
    if (clouds > 0) clouds--;
    else {
      ended = {
        at: learningDayBounds(input.day, timezone).end,
        formerRun: run,
        subsequentQualifying: 0,
      };
      run = 0;
    }
  }
  return {
    ...state,
    run,
    clouds,
    qualifyingDays,
    ended,
    lastDay: input.day,
    eventIds: [...state.eventIds, input.id],
  };
}
export function startRest(state: StreakState, start: string, days: number): StreakState {
  if (!Number.isInteger(days) || days < 1 || days > 14 || state.restUses >= 2)
    throw new RangeError("Rest quota exceeded");
  if (state.lastDay !== null && start <= state.lastDay)
    throw new RangeError("Rest must begin on an unprocessed day");
  return {
    ...state,
    restUses: state.restUses + 1,
    rest: { start, end: addCalendarDays(start, days - 1) },
  };
}
export function repairStreak(
  state: StreakState,
  event: { readonly id: string; readonly at: number; readonly completedReview: boolean },
): StreakState {
  if (!Number.isFinite(event.at) || !Number.isFinite(new Date(event.at).getTime()))
    throw new RangeError("Invalid repair timestamp");
  if (state.eventIds.includes(event.id)) return state;
  if (state.lastDay !== null) addCalendarDays(state.lastDay, 0);
  if (
    state.ended &&
    (!Number.isFinite(state.ended.at) || !Number.isFinite(new Date(state.ended.at).getTime()))
  )
    throw new RangeError("Invalid run ending timestamp");
  if (
    state.repairUsed ||
    !state.ended ||
    !event.completedReview ||
    event.at < state.ended.at ||
    event.at - state.ended.at > 48 * 3600000
  )
    throw new RangeError("Repair unavailable");
  return {
    ...state,
    run: state.ended.formerRun + state.ended.subsequentQualifying,
    ended: null,
    repairUsed: true,
    eventIds: [...state.eventIds, event.id],
  };
}
export function rolloverStreakTerm(state: StreakState, termId: string): StreakState {
  return termId === state.termId
    ? state
    : { ...state, termId, restUses: 0, repairUsed: false, rest: null, ended: null };
}
