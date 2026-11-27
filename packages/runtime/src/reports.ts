import {
  buildMonthlySummary,
  buildWeeklyReport,
  learningDay,
  longestPractisedRun,
  monthWindow,
  reportWindow,
  selectDueTopics,
  type MonthlyOutput,
  type ReportOutput,
} from "@stellara/rules";

import type { ChildRecord, MasteryEventRecord, RuntimeDeps } from "./ports.js";

/** Bump when the stored payload shape or the copy templates it selects change. */
export const REPORT_TEMPLATE_VERSION = "report-v1";

export type ReportKind = "weekly" | "monthly";

export interface ReportTopicTitle {
  readonly id: string;
  readonly title: string;
}

export interface WeeklyReportPayload {
  readonly kind: "weekly";
  readonly report: ReportOutput;
  /** Titles for every topic id the report names, resolved when it was built. */
  readonly topics: Readonly<Record<string, string>>;
}

export interface MonthlyReportPayload {
  readonly kind: "monthly";
  /** `YYYY-MM` in Lagos time. */
  readonly month: string;
  readonly summary: MonthlyOutput;
  readonly topics: Readonly<Record<string, string>>;
}

export type ReportPayload = WeeklyReportPayload | MonthlyReportPayload;

/** Mirrors `stellara_private.reports`; instants are UTC epoch milliseconds. */
export interface ReportRecord {
  readonly id: string;
  readonly child_id: string;
  readonly kind: ReportKind;
  readonly period_start: number;
  readonly period_end: number;
  readonly payload: ReportPayload;
  readonly template_version: string;
  readonly created_at: number;
  readonly opened_at: number | null;
}

export interface ReportBlueprint {
  readonly paper: string;
  readonly topicIds: readonly string[];
}

/**
 * Read and write access the report jobs need beyond `RuntimeStore`. The
 * Postgres adapter implements it in `supabase/functions/_shared/store.js`.
 */
export interface ReportStore {
  listMasteryLevels(
    childId: string,
  ): Promise<readonly { readonly topic_id: string; readonly level: number }[]>;
  masteryEventsBetween(
    childId: string,
    start: number,
    end: number,
  ): Promise<readonly MasteryEventRecord[]>;
  /** Distinct learning days with at least one scored answer in `[start, end)`. */
  scoredDaysBetween(childId: string, start: number, end: number): Promise<readonly string[]>;
  /** Topics on the child's school-year pathway: the family-only "current assignment". */
  pathwayTopicIds(year: string): Promise<readonly string[]>;
  topicTitles(topicIds: readonly string[]): Promise<readonly ReportTopicTitle[]>;
  /** Approved practice-test blueprints only. Empty until the 2027 format is verified. */
  reportBlueprints(): Promise<readonly ReportBlueprint[]>;
  findReport(childId: string, kind: ReportKind, periodEnd: number): Promise<ReportRecord | null>;
  insertReport(report: ReportRecord): Promise<void>;
}

export type ReportDeps = RuntimeDeps & { readonly reports: ReportStore };

export interface ReportJobResult {
  readonly processed: number;
  readonly created: number;
}

/** Gain per topic: last level in the window minus the level it started from. */
function gains(events: readonly MasteryEventRecord[]): Map<string, number> {
  const ordered = [...events].sort(
    (a, b) => a.created_at - b.created_at || a.id.localeCompare(b.id),
  );
  const span = new Map<string, { from: number; to: number }>();
  for (const event of ordered) {
    const from = span.get(event.topic_id)?.from ?? event.from_level;
    span.set(event.topic_id, { from, to: event.to_level });
  }
  return new Map([...span].map(([topic, { from, to }]) => [topic, to - from]));
}

async function titles(deps: ReportDeps, ids: readonly string[]) {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return {};
  const rows = await deps.reports.topicTitles(unique);
  return Object.fromEntries(rows.map((row) => [row.id, row.title]));
}

/** Builds one child's weekly report for the snapshot that ended at `end` (02 §8). */
export async function buildChildWeeklyReport(
  deps: ReportDeps,
  child: ChildRecord,
  window: { start: number; end: number },
): Promise<WeeklyReportPayload> {
  const levels = await deps.reports.listMasteryLevels(child.id);
  const gained = gains(await deps.reports.masteryEventsBetween(child.id, window.start, window.end));
  // Reviews due on the report's last learning day are "due" for practise-next.
  const lastDay = learningDay(window.end - 1, child.timezone);
  const due = new Set(
    selectDueTopics(await deps.store.listReviews(child.id), lastDay).map((r) => r.topicId),
  );
  const assigned = new Set(child.year ? await deps.reports.pathwayTopicIds(child.year) : []);
  const known = new Map(levels.map((row) => [row.topic_id, row.level]));
  for (const topic of [...assigned, ...due]) if (!known.has(topic)) known.set(topic, 0);
  const days = await deps.reports.scoredDaysBetween(child.id, window.start, window.end);
  const streak = await deps.store.getStreak(child.id);
  const report = buildWeeklyReport({
    topics: [...known].map(([id, level]) => ({
      id,
      level,
      weeklyGain: Math.max(0, gained.get(id) ?? 0),
      due: due.has(id),
      assigned: assigned.has(id),
    })),
    activeDaysTerm: streak && streak.termId === child.term_id ? streak.qualifyingDays : 0,
    practisedDays: days.length,
    longestRun: longestPractisedRun(days),
    blueprints: await deps.reports.reportBlueprints(),
  });
  const named = [
    ...report.next,
    ...(report.celebrate.key === "topic_gain" ? [report.celebrate.values.topicId] : []),
  ];
  return { kind: "weekly", report, topics: await titles(deps, named) };
}

/** Builds one child's monthly in-app summary for the Lagos calendar month. */
export async function buildChildMonthlySummary(
  deps: ReportDeps,
  child: ChildRecord,
  window: { start: number; end: number; month: string },
): Promise<MonthlyReportPayload> {
  const levels = await deps.reports.listMasteryLevels(child.id);
  const events = await deps.reports.masteryEventsBetween(child.id, window.start, window.end);
  const reached = new Set(events.filter((e) => e.to_level === 5).map((e) => e.topic_id));
  const days = await deps.reports.scoredDaysBetween(child.id, window.start, window.end);
  const summary = buildMonthlySummary({
    activeDays: days.length,
    topics: levels.map((row) => ({
      id: row.topic_id,
      level: row.level,
      masteredInMonth: reached.has(row.topic_id),
    })),
  });
  return {
    kind: "monthly",
    month: window.month,
    summary,
    topics: await titles(deps, [...summary.newlyMastered, ...summary.workingOn]),
  };
}

async function generate(
  deps: ReportDeps,
  kind: ReportKind,
  window: { start: number; end: number },
  build: (child: ChildRecord) => Promise<ReportPayload>,
): Promise<ReportJobResult> {
  let processed = 0;
  let created = 0;
  for (const child of await deps.store.listActiveChildren()) {
    processed++;
    // Children added after the period ended get their first report next time.
    if (child.created_at !== undefined && child.created_at >= window.end) continue;
    const made = await deps.store.transaction(async () => {
      if (await deps.reports.findReport(child.id, kind, window.end)) return false;
      await deps.reports.insertReport({
        id: deps.ids.uuid(),
        child_id: child.id,
        kind,
        period_start: window.start,
        period_end: window.end,
        payload: await build(child),
        template_version: REPORT_TEMPLATE_VERSION,
        created_at: deps.clock.now(),
        opened_at: null,
      });
      return true;
    });
    if (made) created++;
  }
  return { processed, created };
}

/**
 * Sunday 18:00 Lagos: one weekly report per active child for the snapshot that
 * just ended. Re-running is safe; an existing report for the period is kept.
 */
export function reportWeekly(deps: ReportDeps): Promise<ReportJobResult> {
  const window = reportWindow(deps.clock.now());
  return generate(deps, "weekly", window, (child) => buildChildWeeklyReport(deps, child, window));
}

/** 1st of the month, 18:00 Lagos: the in-app monthly summary for the month just ended. */
export function reportMonthly(deps: ReportDeps): Promise<ReportJobResult> {
  const window = monthWindow(deps.clock.now());
  return generate(deps, "monthly", window, (child) =>
    buildChildMonthlySummary(deps, child, window),
  );
}
