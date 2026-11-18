#!/usr/bin/env node
import { pathToFileURL } from "node:url";

export const SCHEDULED_JOBS = [
  { name: "retention-purge", lagos: "Daily 01:00", cron_utc: "0 0 * * *" },
  { name: "close-learning-day", lagos: "Daily 03:05", cron_utc: "5 2 * * *" },
  { name: "schedule-due-reviews", lagos: "Daily 03:15", cron_utc: "15 2 * * *" },
  { name: "process-data-requests", lagos: "Every 5 minutes", cron_utc: "*/5 * * * *" },
];

export function summarizeJobRuns(runs, scheduledJobs = SCHEDULED_JOBS) {
  return scheduledJobs.map((job) => {
    const matching = runs
      .filter((r) => r.job_name === job.name)
      .sort((a, b) => a.started_at - b.started_at);
    const last = matching[matching.length - 1];
    const failureCount = matching.filter((r) => r.status === "failed").length;
    return {
      job_name: job.name,
      lagos: job.lagos,
      cron_utc: job.cron_utc,
      last_status: last ? last.status : "never_run",
      last_run_at: last ? last.started_at : null,
      failure_count: failureCount,
      total_runs: matching.length,
    };
  });
}

export function findOverdueDataRequests(requests, now = Date.now()) {
  return requests
    .filter((r) => r.status === "pending" && r.due_at < now)
    .map((r) => ({
      ...r,
      overdue_ms: now - r.due_at,
    }));
}

export function generatePgCronSql(scheduledJobs = SCHEDULED_JOBS) {
  const header = [
    "-- Environment-specific pg_cron registration (store secrets in Supabase Vault, never in migrations).",
    "-- Assumes Vault secrets 'stellara_project_url' and 'stellara_worker_secret' are provisioned per environment.",
  ].join("\n");

  const blocks = scheduledJobs.map(
    (job) => `select cron.schedule(
  '${job.name}',
  '${job.cron_utc}',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'stellara_project_url') || '/functions/v1/${job.name}',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'stellara_worker_secret')
    ),
    body := jsonb_build_object('scheduled_at', now())
  ) as request_id;
  $$
);`,
  );

  return `${header}\n\n${blocks.join("\n\n")}\n`;
}

function main(argv) {
  const [command = "status", ...rest] = argv;
  const nowFlag = rest.find((a) => a.startsWith("--now="));
  const now = nowFlag ? Date.parse(nowFlag.slice("--now=".length)) : Date.now();

  if (command === "status") {
    console.log(JSON.stringify(summarizeJobRuns([]), null, 2));
    return;
  }
  if (command === "overdue") {
    console.log(JSON.stringify(findOverdueDataRequests([], now), null, 2));
    return;
  }
  if (command === "schedule-sql") {
    console.log(generatePgCronSql());
    return;
  }
  console.error(`Unknown command: ${command}. Expected: status | overdue | schedule-sql`);
  process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2));
}
