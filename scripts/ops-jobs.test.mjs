import assert from "node:assert/strict";
import test from "node:test";

import { findOverdueDataRequests, generatePgCronSql, summarizeJobRuns } from "./ops-jobs.mjs";

test("summarizeJobRuns reports last status and failure counts per scheduled job", () => {
  const runs = [
    {
      id: "r1",
      job_name: "retention-purge",
      status: "failed",
      started_at: 1000,
      finished_at: 1100,
      processed: 0,
      checkpoint: null,
      error: "timeout",
    },
    {
      id: "r2",
      job_name: "retention-purge",
      status: "completed",
      started_at: 2000,
      finished_at: 2200,
      processed: 4,
      checkpoint: null,
    },
    {
      id: "r3",
      job_name: "close-learning-day",
      status: "failed",
      started_at: 3000,
      finished_at: 3100,
      processed: 0,
      checkpoint: null,
      error: "lock",
    },
  ];

  const summary = summarizeJobRuns(runs);
  const retention = summary.find((s) => s.job_name === "retention-purge");
  assert.equal(retention?.last_status, "completed");
  assert.equal(retention?.failure_count, 1);
  assert.equal(retention?.total_runs, 2);

  const closure = summary.find((s) => s.job_name === "close-learning-day");
  assert.equal(closure?.last_status, "failed");
  assert.equal(closure?.failure_count, 1);

  const due = summary.find((s) => s.job_name === "schedule-due-reviews");
  assert.equal(due?.last_status, "never_run");
  assert.equal(due?.failure_count, 0);
});

test("findOverdueDataRequests flags pending export (>7d) and deletion (>30d) requests past due_at", () => {
  const NOW = 1_700_000_000_000;
  const requests = [
    {
      id: "req-overdue",
      kind: "export",
      status: "pending",
      due_at: NOW - 3_600_000,
    },
    {
      id: "req-ontime",
      kind: "deletion",
      status: "pending",
      due_at: NOW + 86_400_000,
    },
    {
      id: "req-done",
      kind: "deletion",
      status: "completed",
      due_at: NOW - 86_400_000,
    },
  ];

  const overdue = findOverdueDataRequests(requests, NOW);
  assert.equal(overdue.length, 1);
  assert.equal(overdue[0]?.id, "req-overdue");
  assert.equal(overdue[0]?.overdue_ms, 3_600_000);
});

test("generatePgCronSql emits environment-specific schedules without hardcoded credentials", () => {
  const sql = generatePgCronSql();
  assert.match(sql, /retention-purge/);
  assert.match(sql, /0 0 \* \* \*/);
  assert.match(sql, /5 2 \* \* \*/);
  assert.match(sql, /15 2 \* \* \*/);
  assert.match(sql, /\*\/5 \* \* \* \*/);
  assert.match(sql, /vault\.decrypted_secrets|current_setting/);
  assert.doesNotMatch(sql, /eyJ[A-Za-z0-9_-]{10,}/); // Never embed JWTs
});
