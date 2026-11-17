import {
  addCalendarDays,
  initialStreak,
  learningDay,
  learningDayBounds,
  outageDuration,
  processStreakDay,
  rolloverStreakTerm,
  selectDueTopics,
} from "@stellara/rules";

import { DAY_MS } from "../util.js";

import type { ActivityDay, CreditedBy, RuntimeDeps } from "../ports.js";

export * from "./schedule.js";

/** At most this many missed days are caught up in one run (a stalled cron). */
const MAX_CATCH_UP_DAYS = 14;

export interface JobReport {
  readonly processed: number;
}

/**
 * Daily 03:05: closes every learning day that has ended for each active child.
 * Applies streaks, clouds, Rest Mode and outage excuses, and records how each
 * day was credited.
 */
export async function closeLearningDay(deps: RuntimeDeps): Promise<JobReport> {
  const now = deps.clock.now();
  let processed = 0;
  for (const child of await deps.store.listActiveChildren()) {
    await deps.store.transaction(async () => {
      const yesterday = addCalendarDays(learningDay(now, child.timezone), -1);
      let state = rolloverStreakTerm(
        (await deps.store.getStreak(child.id)) ?? initialStreak(child.term_id),
        child.term_id,
      );
      const earliest = addCalendarDays(yesterday, -MAX_CATCH_UP_DAYS);
      let day = state.lastDay === null ? yesterday : addCalendarDays(state.lastDay, 1);
      // A gap beyond the catch-up window is not replayed; processing resumes at its edge.
      if (day < earliest) {
        day = earliest;
        state = { ...state, lastDay: addCalendarDays(earliest, -1) };
      }
      for (; day <= yesterday; day = addCalendarDays(day, 1)) {
        const bounds = learningDayBounds(day, child.timezone);
        const activity = await deps.store.getActivityDay(child.id, day);
        const outages = await deps.store.outagesBetween(bounds.start, bounds.end);
        const before = state;
        state = processStreakDay(
          state,
          {
            id: `day:${child.id}:${day}`,
            day,
            scored: activity?.scored_count ?? 0,
            completedReview: (activity?.review_sets_done ?? 0) > 0,
            outages,
          },
          child.timezone,
        );
        let credited: CreditedBy | null = null;
        if (state.run > before.run) credited = "activity";
        else if (before.run > 0 && state.clouds < before.clouds) credited = "cloud";
        else if (before.rest && day >= before.rest.start && day <= before.rest.end)
          credited = "rest";
        else if (outageDuration(day, child.timezone, outages) > 2 * 3_600_000) credited = "outage";
        const next: ActivityDay = {
          child_id: child.id,
          learning_day: day,
          scored_count: activity?.scored_count ?? 0,
          review_sets_done: activity?.review_sets_done ?? 0,
          qualifying: activity?.qualifying ?? false,
          credited_by: credited,
        };
        await deps.store.putActivityDay(next);
        processed++;
      }
      await deps.store.putStreak(child.id, state);
    });
  }
  return { processed };
}

/** Daily 03:15: materialises each child's due topics for today. Missed reviews do not pile up. */
export async function scheduleDueReviews(deps: RuntimeDeps): Promise<JobReport> {
  const now = deps.clock.now();
  let processed = 0;
  for (const child of await deps.store.listActiveChildren()) {
    const today = learningDay(now, child.timezone);
    const due = selectDueTopics(await deps.store.listReviews(child.id), today);
    await deps.store.transaction(() => deps.store.putDueQueue(child.id, due));
    processed++;
  }
  return { processed };
}

/** Daily 02:00: folds the last 24 hours of attempts into per-item exposure and p-correct. */
export async function updateItemStats(deps: RuntimeDeps): Promise<JobReport> {
  const now = deps.clock.now();
  const attempts = await deps.store.attemptsReceivedBetween(now - DAY_MS, now);
  const tally = new Map<string, { exposures: number; correct: number }>();
  for (const a of attempts) {
    const t = tally.get(a.item_id) ?? { exposures: 0, correct: 0 };
    tally.set(a.item_id, {
      exposures: t.exposures + 1,
      correct: t.correct + (a.is_correct ? 1 : 0),
    });
  }
  await deps.store.transaction(async () => {
    for (const [item_id, t] of tally) {
      const prior = await deps.store.getItemStats(item_id);
      const exposure_count = (prior?.exposure_count ?? 0) + t.exposures;
      const correct_count = (prior?.correct_count ?? 0) + t.correct;
      await deps.store.putItemStats({
        item_id,
        exposure_count,
        correct_count,
        p_correct: correct_count / exposure_count,
        updated_at: now,
      });
    }
  });
  return { processed: tally.size };
}

export interface PurgePlan {
  /** Children inactive since before this instant lose learning records (aggregates kept anonymised). */
  readonly learning_records_inactive_before: number;
  readonly messages_before: number;
  readonly audit_log_before: number;
  readonly events_before: number;
  readonly raw_ip_before: number;
  readonly children: readonly string[];
}

function minusMonths(at: number, months: number): number {
  const d = new Date(at);
  d.setUTCMonth(d.getUTCMonth() - months);
  return d.getTime();
}

/**
 * Daily 01:00: computes what the retention schedule (docs/md/07 §5) allows to go.
 * The SQL adapter executes it: `attempts` DELETE is revoked, so learning records
 * leave by dropping partitions or writing anonymised copies.
 */
export async function retentionPurgePlan(deps: RuntimeDeps): Promise<PurgePlan> {
  const now = deps.clock.now();
  const learning = minusMonths(now, 12);
  const children = (await deps.store.listActiveChildren())
    .filter((c) => c.last_active_at !== null && c.last_active_at < learning)
    .map((c) => c.id)
    .sort();
  return {
    learning_records_inactive_before: learning,
    messages_before: minusMonths(now, 12),
    audit_log_before: minusMonths(now, 24),
    events_before: minusMonths(now, 25),
    raw_ip_before: now - 30 * DAY_MS,
    children,
  };
}
