import { describe, expect, it } from "vitest";

import { createPreviewFamilyApi, previewReports } from "../lib/family/preview";
import { reportCopy, reportText } from "../lib/family/report-copy";

import type { ParentReport, WeeklyReportBody } from "../lib/family/types";

const START = Date.parse("2027-01-10T17:00:00Z");
const END = Date.parse("2027-01-17T17:00:00Z");
const topics = { a: "Fractions", b: "Ratios", c: "Place value" };

function weekly(report: Partial<WeeklyReportBody>): ParentReport {
  return {
    id: "r1",
    child_id: "c1",
    kind: "weekly",
    period_start: START,
    period_end: END,
    template_version: "report-v1",
    opened_at: null,
    payload: {
      kind: "weekly",
      topics,
      report: {
        stats: { mastered: 1, inProgress: 2, activeDaysTerm: 1 },
        celebrate: { key: "topic_gain", values: { topicId: "a", gain: 1 } },
        next: ["b", "c"],
        coverage: [],
        note: { key: "celebrate_and_review", values: { topicIds: ["b", "c"] } },
        ...report,
      },
    },
  };
}

// FAM-04 AC2 and docs/md/16: never a predicted score, readiness, ranking or comparison.
const forbidden =
  /predict(?!ed score)|ready for|\bready\b|rank|classmate|better than|behind|weak|fail|streak|%/i;

describe("reportCopy (weekly)", () => {
  it("renders every block from its rule template", () => {
    const copy = reportCopy(weekly({}), "Tolu");
    if (copy.kind !== "weekly") throw new Error("expected weekly");
    expect(copy.title).toBe("Weekly report");
    expect(copy.period).toBe("Sun, 10 Jan, 18:00 – Sun, 17 Jan, 18:00");
    expect(copy.stats).toEqual([
      "1 topic mastered",
      "2 topics in progress",
      "1 active day this term",
    ]);
    expect(copy.celebrate).toBe("Fractions grew by one level this week.");
    expect(copy.next).toEqual(["Ratios", "Place value"]);
    expect(copy.note).toBe(
      "Tolu is doing well. A short review of Ratios and Place value this week will help it stay strong.",
    );
    expect(copy.coverageEmpty).toBe(
      "Coverage appears here once the 2027 exam papers are confirmed.",
    );
    expect(copy.coverageDisclaimer).toBe("Share of the syllabus practised, not a predicted score");
    expect(copy.notAffiliated).toMatch(/not affiliated with NECO/);
  });

  it("covers each celebration and note fallback", () => {
    const run = reportCopy(
      weekly({
        celebrate: { key: "longest_run", values: { days: 3 } },
        next: [],
        note: { key: "celebrate_and_practise", values: { topicIds: [] } },
      }),
      "Tolu",
    );
    if (run.kind !== "weekly") throw new Error("expected weekly");
    expect(run.celebrate).toBe("Tolu practised 3 days in a row.");
    expect(run.nextEmpty).toBe("Nothing is due. Any topic in Tolu’s sky is a good choice.");
    expect(run.note).toBe("Tolu is doing well. Any topic in the sky is a good next step.");

    const days = reportCopy(
      weekly({
        celebrate: { key: "practised_days", values: { days: 1 } },
        note: { key: "celebrate_and_practise", values: { topicIds: ["b"] } },
      }),
      "Tolu",
    );
    expect(days.kind === "weekly" && days.celebrate).toBe("Tolu practised on 1 day.");
    expect(days.note).toBe("Tolu is doing well. Ten minutes on Ratios is a good next step.");

    const none = reportCopy(
      weekly({
        celebrate: { key: "no_practice", values: { suggestedMinutes: 10 } },
        note: { key: "gentle_ten_minutes", values: { topicIds: [] } },
      }),
      "Tolu",
    );
    expect(none.kind === "weekly" && none.celebrate).toBe(
      "No practice this week. One 10-minute set is a good place to start.",
    );
    expect(none.note).toBe(
      "A quiet week is fine. Ten minutes together is an easy way to start again.",
    );
  });

  it("shows coverage as topics practised, never as a score", () => {
    const copy = reportCopy(
      weekly({
        coverage: [
          {
            paper: "Paper I",
            practised: 9,
            total: 30,
            share: 0.3,
            label: "syllabus_practised_not_predicted_score",
          },
        ],
      }),
      "Tolu",
    );
    if (copy.kind !== "weekly") throw new Error("expected weekly");
    expect(copy.coverage[0]?.label).toBe("Paper I: 9 of 30 topics practised");
    for (const line of reportText(copy)) expect(line).not.toMatch(forbidden);
  });
});

describe("reportCopy (monthly)", () => {
  it("names the month and its notes", () => {
    const monthly = previewReports("c1", Date.parse("2027-02-03T10:00:00Z")).find(
      (r) => r.kind === "monthly",
    );
    if (!monthly || monthly.payload.kind !== "monthly") throw new Error("expected monthly");
    const copy = reportCopy(monthly, "Tolu");
    if (copy.kind !== "monthly") throw new Error("expected monthly");
    expect(copy.period).toBe("January 2027");
    expect(copy.stats[0]).toBe("12 active days");
    expect(copy.note).toBe("Tolu mastered Fractions this month. Wonderful work.");
    for (const line of reportText(copy)) expect(line).not.toMatch(forbidden);

    const practised = reportCopy(
      {
        ...monthly,
        payload: {
          ...monthly.payload,
          summary: {
            ...monthly.payload.summary,
            newlyMastered: [],
            note: { key: "month_practised", values: { topicIds: ["preview-ratios"] } },
          },
        },
      },
      "Tolu",
    );
    expect(practised.note).toBe(
      "Tolu practised on 12 days this month and is working on Ratios and Place value.",
    );
    const quiet = reportCopy(
      {
        ...monthly,
        payload: {
          ...monthly.payload,
          summary: {
            stats: { activeDays: 0, mastered: 0, inProgress: 0 },
            newlyMastered: [],
            workingOn: [],
            note: { key: "month_quiet", values: { topicIds: [] } },
          },
        },
      },
      "Tolu",
    );
    expect(quiet.note).toBe(
      "A quiet month is fine. Ten minutes together is an easy way to start again.",
    );
  });
});

describe("preview reports", () => {
  it("returns labelled examples only for this family's children", async () => {
    const storage = new Map<string, string>();
    const local = {
      getItem: (k: string) => storage.get(k) ?? null,
      setItem: (k: string, v: string) => void storage.set(k, v),
      removeItem: (k: string) => void storage.delete(k),
    } as unknown as Storage;
    const now = Date.parse("2027-01-20T10:00:00Z");
    const api = createPreviewFamilyApi(local, () => now);
    expect(await api.listReports?.("nobody")).toEqual([]);
    await api.giveConsent({
      core_learning: true,
      progress_messages: false,
      product_research: false,
    });
    const child = await api.addChild({
      first_name: "Tolu",
      year: "P5",
      exam_date: null,
      avatar_key: "sun",
      pin: ["sun", "moon", "leaf", "fish"],
    });
    const reports = (await api.listReports?.(child.id)) ?? [];
    expect(reports.map((r) => r.kind)).toEqual(["weekly", "monthly"]);
    expect(reports[0]?.period_end).toBe(Date.parse("2027-01-17T17:00:00Z"));
    expect(reports[0]?.opened_at).toBeNull();
    await api.markReportOpened?.(child.id, reports[0]?.id ?? "");
    expect((await api.listReports?.(child.id))?.[0]?.opened_at).toBe(now);
  });
});
