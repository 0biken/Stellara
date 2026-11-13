import { addCalendarDays } from "./time.js";
/** Select the most recently completed Sunday 18:00 Lagos snapshot. */
export function reportWindow(at: number): { start: number; end: number } {
  if (!Number.isFinite(at)) throw new RangeError("Invalid timestamp");
  const lagos = new Date(at + 3600000);
  const date = lagos.toISOString().slice(0, 10);
  const weekday = lagos.getUTCDay();
  let sunday = addCalendarDays(date, -weekday);
  let end = Date.parse(`${sunday}T17:00:00Z`);
  if (at < end) {
    sunday = addCalendarDays(sunday, -7);
    end = Date.parse(`${sunday}T17:00:00Z`);
  }
  return { start: end - 7 * 86400000, end };
}
export interface ReportTopic {
  readonly id: string;
  readonly level: number;
  readonly weeklyGain: number;
  readonly due: boolean;
  readonly assigned: boolean;
}
export interface ReportInput {
  readonly topics: readonly ReportTopic[];
  readonly activeDaysTerm: number;
  readonly practisedDays: number;
  readonly longestRun: number;
  readonly blueprints: readonly { readonly paper: string; readonly topicIds: readonly string[] }[];
}
export type ReportCelebration =
  | {
      readonly key: "topic_gain";
      readonly values: { readonly topicId: string; readonly gain: number };
    }
  | { readonly key: "longest_run"; readonly values: { readonly days: number } }
  | { readonly key: "practised_days"; readonly values: { readonly days: number } }
  | { readonly key: "no_practice"; readonly values: { readonly suggestedMinutes: 10 } };
export interface ReportOutput {
  readonly stats: {
    readonly mastered: number;
    readonly inProgress: number;
    readonly activeDaysTerm: number;
  };
  readonly celebrate: ReportCelebration;
  readonly next: readonly string[];
  readonly coverage: readonly {
    readonly paper: string;
    readonly practised: number;
    readonly total: number;
    readonly share: number;
    readonly label: "syllabus_practised_not_predicted_score";
  }[];
  readonly note: {
    readonly key: "celebrate_and_review" | "celebrate_and_practise" | "gentle_ten_minutes";
    readonly values: { readonly topicIds: readonly string[] };
  };
}
const byId = (a: ReportTopic, b: ReportTopic) => Number(a.id > b.id) - Number(a.id < b.id);
export function buildWeeklyReport(input: ReportInput): ReportOutput {
  const unique = [...new Map(input.topics.map((t) => [t.id, t])).values()];
  const gain = unique
    .filter((t) => t.weeklyGain > 0)
    .sort((a, b) => b.weeklyGain - a.weeklyGain || byId(a, b))[0];
  const celebrate: ReportCelebration = gain
    ? { key: "topic_gain", values: { topicId: gain.id, gain: gain.weeklyGain } }
    : input.longestRun > 0
      ? { key: "longest_run", values: { days: input.longestRun } }
      : input.practisedDays > 0
        ? { key: "practised_days", values: { days: input.practisedDays } }
        : { key: "no_practice", values: { suggestedMinutes: 10 } };
  const due = unique.filter((t) => t.due).sort(byId);
  const assigned = unique
    .filter((t) => t.assigned && !t.due)
    .sort((a, b) => a.level - b.level || byId(a, b));
  const next = [...due, ...assigned].slice(0, 2).map((t) => t.id);
  const levels = new Map(unique.map((t) => [t.id, t.level]));
  return {
    stats: {
      mastered: unique.filter((t) => t.level === 5).length,
      inProgress: unique.filter((t) => t.level >= 2 && t.level <= 4).length,
      activeDaysTerm: input.activeDaysTerm,
    },
    celebrate,
    next,
    coverage: input.blueprints.map((b) => {
      const topics = [...new Set(b.topicIds)];
      const practised = topics.filter((t) => (levels.get(t) ?? 0) >= 2).length;
      return {
        paper: b.paper,
        practised,
        total: topics.length,
        share: topics.length ? practised / topics.length : 0,
        label: "syllabus_practised_not_predicted_score" as const,
      };
    }),
    note: {
      key:
        celebrate.key === "no_practice"
          ? "gentle_ten_minutes"
          : due.length
            ? "celebrate_and_review"
            : "celebrate_and_practise",
      values: { topicIds: next },
    },
  };
}
