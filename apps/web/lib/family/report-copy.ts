import { formatDate, formatMessage, getCatalogue } from "@stellara/i18n";

import type { MonthlySummaryBody, ParentReport, WeeklyReportBody } from "./types";

/**
 * Turns a stored report into the sentences the parent reads. Every sentence
 * comes from a catalogue template selected by the rule output (FAM-04 AC1);
 * the only inserted values are the child's first name, topic titles, counts
 * and dates.
 */

const periodFormat: Intl.DateTimeFormatOptions = {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
};

function list(titles: readonly string[]): string {
  return new Intl.ListFormat("en-NG", { style: "long", type: "conjunction" }).format(titles);
}

function titlesFor(ids: readonly string[], topics: Readonly<Record<string, string>>): string[] {
  return ids.flatMap((id) => (topics[id] ? [topics[id]] : []));
}

export interface WeeklyReportCopy {
  kind: "weekly";
  title: string;
  period: string;
  stats: string[];
  celebrate: string;
  next: string[];
  nextEmpty: string | null;
  coverage: { label: string; share: number; practised: number; total: number }[];
  coverageEmpty: string | null;
  coverageDisclaimer: string;
  notAffiliated: string;
  note: string;
}

export interface MonthlySummaryCopy {
  kind: "monthly";
  title: string;
  period: string;
  stats: string[];
  mastered: string[];
  workingOn: string[];
  note: string;
}

export type ReportCopy = WeeklyReportCopy | MonthlySummaryCopy;

function weeklyCopy(
  report: WeeklyReportBody,
  topics: Readonly<Record<string, string>>,
  name: string,
  period: string,
): WeeklyReportCopy {
  const copy = getCatalogue("en-NG");
  const c = report.celebrate;
  const celebrate =
    c.key === "topic_gain" && topics[c.values.topicId]
      ? formatMessage("report.celebrateGain", {
          topic: topics[c.values.topicId] ?? "",
          gain: c.values.gain,
        })
      : c.key === "longest_run"
        ? formatMessage("report.celebrateRun", { name, days: c.values.days })
        : c.key === "practised_days"
          ? formatMessage("report.celebrateDays", { name, days: c.values.days })
          : // No practice, or a gain whose topic title is missing.
            copy["report.celebrateNone"];
  const next = titlesFor(report.next, topics);
  const noteTopics = list(titlesFor(report.note.values.topicIds, topics));
  const note =
    report.note.key === "gentle_ten_minutes"
      ? copy["report.noteGentle"]
      : !noteTopics
        ? formatMessage("report.notePractiseAny", { name })
        : report.note.key === "celebrate_and_review"
          ? formatMessage("report.noteReview", { name, topics: noteTopics })
          : formatMessage("report.notePractise", { name, topics: noteTopics });
  return {
    kind: "weekly",
    title: copy["report.title"],
    period,
    stats: [
      formatMessage("report.statMastered", { count: report.stats.mastered }),
      formatMessage("report.statInProgress", { count: report.stats.inProgress }),
      formatMessage("report.statActiveTerm", { count: report.stats.activeDaysTerm }),
    ],
    celebrate,
    next,
    nextEmpty: next.length ? null : formatMessage("report.nextEmpty", { name }),
    coverage: report.coverage.map((row) => ({
      label: formatMessage("report.coverageRow", {
        paper: row.paper,
        practised: row.practised,
        total: row.total,
      }),
      share: row.share,
      practised: row.practised,
      total: row.total,
    })),
    coverageEmpty: report.coverage.length ? null : copy["report.coverageEmpty"],
    coverageDisclaimer: copy["report.coverageDisclaimer"],
    notAffiliated: copy["report.notAffiliated"],
    note,
  };
}

function monthlyCopy(
  summary: MonthlySummaryBody,
  topics: Readonly<Record<string, string>>,
  name: string,
  period: string,
): MonthlySummaryCopy {
  const copy = getCatalogue("en-NG");
  const mastered = titlesFor(summary.newlyMastered, topics);
  const workingOn = titlesFor(summary.workingOn, topics);
  const days = summary.stats.activeDays;
  const note =
    summary.note.key === "month_mastered" && mastered.length
      ? formatMessage("report.monthMastered", { name, topics: list(mastered) })
      : summary.note.key === "month_quiet" || days === 0
        ? copy["report.monthQuiet"]
        : workingOn.length
          ? formatMessage("report.monthPractised", { name, days, topics: list(workingOn) })
          : formatMessage("report.monthPractisedAny", { name, days });
  return {
    kind: "monthly",
    title: copy["report.monthlyTitle"],
    period,
    stats: [
      formatMessage("report.statActiveMonth", { count: days }),
      formatMessage("report.statMastered", { count: summary.stats.mastered }),
      formatMessage("report.statInProgress", { count: summary.stats.inProgress }),
    ],
    mastered,
    workingOn,
    note,
  };
}

export function reportCopy(
  report: ParentReport,
  name: string,
  timezone = "Africa/Lagos",
): ReportCopy {
  const payload = report.payload;
  if (payload.kind === "monthly") {
    // The month label is the Lagos calendar month the summary covers.
    const period = formatDate(
      Date.parse(`${payload.month}-15T12:00:00Z`),
      { month: "long", year: "numeric" },
      "en-NG",
      timezone,
    );
    return monthlyCopy(payload.summary, payload.topics, name, period);
  }
  const period = formatMessage("report.period", {
    start: formatDate(report.period_start, periodFormat, "en-NG", timezone),
    end: formatDate(report.period_end, periodFormat, "en-NG", timezone),
  });
  return weeklyCopy(payload.report, payload.topics, name, period);
}

/** Every sentence in a report, for the forbidden-phrase and template checks. */
export function reportText(copy: ReportCopy): string[] {
  if (copy.kind === "monthly")
    return [copy.title, copy.period, ...copy.stats, ...copy.mastered, ...copy.workingOn, copy.note];
  return [
    copy.title,
    copy.period,
    ...copy.stats,
    copy.celebrate,
    ...copy.next,
    ...(copy.nextEmpty ? [copy.nextEmpty] : []),
    ...copy.coverage.map((c) => c.label),
    ...(copy.coverageEmpty ? [copy.coverageEmpty] : []),
    copy.coverageDisclaimer,
    copy.notAffiliated,
    copy.note,
  ];
}
