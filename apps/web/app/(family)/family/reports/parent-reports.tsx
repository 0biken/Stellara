"use client";

import { formatMessage, getCatalogue } from "@stellara/i18n";
import { Button, ProgressBar, ReportBlock, buttonClasses } from "@stellara/ui";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { getFamilyApi, type ChildSummary, type ParentReport } from "../../../../lib/family";
import { reportCopy, type ReportCopy } from "../../../../lib/family/report-copy";

type State =
  | { status: "loading" }
  | { status: "error" }
  | { status: "missing" }
  | { status: "ready"; child: ChildSummary; reports: ParentReport[]; preview: boolean };

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/**
 * Records `opened_at` the first time a report is shown (the open-rate metric
 * in 12 §2) and clears its "New" badge locally. The server keeps the first time.
 */
function markOpened(childId: string, reports: ParentReport[], id: string | undefined) {
  const target = reports.find((r) => r.id === id);
  if (!target || target.opened_at !== null) return reports;
  getFamilyApi()
    .markReportOpened?.(childId, target.id)
    ?.catch(() => {
      // Reading the report must not fail because the receipt did not save.
    });
  const openedAt = Date.now();
  return reports.map((r) => (r.id === target.id ? { ...r, opened_at: openedAt } : r));
}

/** FAM-04: the parent's weekly reports and monthly summaries for one child. */
export function ParentReports() {
  const copy = getCatalogue("en-NG");
  const childId = useSearchParams().get("id");
  const [state, setState] = useState<State>({ status: "loading" });
  const [selected, setSelected] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let live = true;
    const api = getFamilyApi();
    api
      .listChildren()
      .then(async (children) => {
        const child = children.find((c) => c.id === childId);
        if (!child) {
          if (live) setState({ status: "missing" });
          return;
        }
        const reports = (await api.listReports?.(child.id)) ?? [];
        if (live)
          setState({
            status: "ready",
            child,
            reports: markOpened(child.id, reports, reports[0]?.id),
            preview: api.mode === "preview",
          });
      })
      .catch(() => {
        if (live) setState({ status: "error" });
      });
    return () => {
      live = false;
    };
  }, [childId, attempt]);

  const current =
    state.status === "ready"
      ? (state.reports.find((r) => r.id === selected) ?? state.reports[0])
      : undefined;

  const back = (
    <a href={`${basePath}/family/`} className={buttonClasses("text", "adult", "self-start")}>
      {copy["report.back"]}
    </a>
  );

  if (state.status === "loading") {
    return (
      <div role="status" className="h-40 rounded-3xl bg-sunk motion-safe:animate-pulse">
        <span className="sr-only">{copy["shell.loading"]}</span>
      </div>
    );
  }
  if (state.status === "missing") {
    return (
      <div className="flex flex-col gap-4">
        <p className="m-0 text-base">{copy["report.unknownChild"]}</p>
        {back}
      </div>
    );
  }
  if (state.status === "error") {
    return (
      <div
        role="alert"
        className="flex flex-col items-start gap-4 rounded-3xl border border-line bg-surface p-8"
      >
        <p className="m-0 text-base">{copy["report.loadError"]}</p>
        <Button variant="quiet" size="adult" onClick={() => setAttempt((n) => n + 1)}>
          {copy["family.tryAgain"]}
        </Button>
      </div>
    );
  }

  const { child, reports } = state;
  const name = child.first_name;
  const zone = child.timezone ?? "Africa/Lagos";
  const shown = current ? reportCopy(current, name, zone) : null;
  const earlier = reports.filter((r) => r.id !== current?.id);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        {back}
        <h1 className="m-0 font-heading text-[32px] leading-[38px] font-extrabold tracking-[-0.02em]">
          {formatMessage("report.pageTitle", { name })}
        </h1>
        {state.preview && (
          <p className="m-0 text-[15px] text-muted">{copy["report.previewNote"]}</p>
        )}
      </div>

      {shown ? (
        <ReportView copy={shown} />
      ) : (
        <section className="flex flex-col items-start gap-4 rounded-3xl border border-line bg-surface p-8 sm:flex-row sm:items-center">
          <img
            src={`${basePath}/assets/auntie-stella/auntie-stella-smiling.svg`}
            alt=""
            width={96}
            height={96}
            className="st-illustration size-24 shrink-0"
          />
          <p className="m-0 text-base">{formatMessage("report.empty", { name })}</p>
        </section>
      )}

      {earlier.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="m-0 font-heading text-xl font-bold">{copy["report.earlier"]}</h2>
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {earlier.map((report) => {
              const item = reportCopy(report, name, zone);
              return (
                <li key={report.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelected(report.id);
                      setState({
                        ...state,
                        reports: markOpened(child.id, reports, report.id),
                      });
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="flex min-h-12 w-full flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-md border border-line bg-surface px-4 py-3 text-left text-base transition-colors hover:bg-sunk focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    <span className="font-medium">{item.title}</span>
                    <span className="flex items-center gap-2 text-[15px] text-muted">
                      {item.period}
                      {report.opened_at === null && (
                        <span className="rounded-full bg-hint px-2 py-0.5 text-[13px] font-medium text-text">
                          {copy["report.new"]}
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}

function ReportView({ copy: report }: { copy: ReportCopy }) {
  const copy = getCatalogue("en-NG");
  return (
    <article className="flex flex-col gap-4" aria-labelledby="report-heading">
      <header className="flex flex-col gap-1">
        <h2 id="report-heading" className="m-0 font-heading text-[22px] leading-7 font-bold">
          {report.title}
        </h2>
        <p className="m-0 text-[15px] text-muted">{report.period}</p>
      </header>
      <div className="grid gap-4 sm:grid-cols-2">
        <ReportBlock
          kind="stat"
          title={copy[report.kind === "weekly" ? "report.statTitle" : "report.monthStatTitle"]}
        >
          <ul className="m-0 flex list-none flex-col gap-1 p-0">
            {report.stats.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </ReportBlock>
        {report.kind === "weekly" ? (
          <>
            <ReportBlock kind="celebrate" title={copy["report.celebrateTitle"]}>
              {report.celebrate}
            </ReportBlock>
            <ReportBlock kind="practise-next" title={copy["report.nextTitle"]}>
              {report.next.length ? (
                <ul className="m-0 flex list-disc flex-col gap-1 pl-5">
                  {report.next.map((title) => (
                    <li key={title}>{title}</li>
                  ))}
                </ul>
              ) : (
                report.nextEmpty
              )}
            </ReportBlock>
            <ReportBlock
              kind="coverage"
              title={copy["report.coverageTitle"]}
              disclaimer={`${report.coverageDisclaimer}. ${report.notAffiliated}`}
            >
              {report.coverage.length ? (
                <div className="flex flex-col gap-3">
                  {report.coverage.map((row) => (
                    <div key={row.label} className="flex flex-col gap-1">
                      <span>{row.label}</span>
                      <ProgressBar
                        value={row.practised}
                        max={row.total}
                        label={row.label}
                        valueText={formatMessage("progress.count", {
                          current: row.practised,
                          total: row.total,
                        })}
                        tone="primary"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                report.coverageEmpty
              )}
            </ReportBlock>
          </>
        ) : (
          <>
            <ReportBlock kind="celebrate" title={copy["report.masteredTitle"]}>
              {report.mastered.length ? report.mastered.join(", ") : copy["report.noneYet"]}
            </ReportBlock>
            <ReportBlock kind="practise-next" title={copy["report.workingOnTitle"]}>
              {report.workingOn.length ? report.workingOn.join(", ") : copy["report.noneYet"]}
            </ReportBlock>
          </>
        )}
        <ReportBlock kind="note" title={copy["report.noteTitle"]} className="sm:col-span-2">
          {report.note}
        </ReportBlock>
      </div>
    </article>
  );
}
