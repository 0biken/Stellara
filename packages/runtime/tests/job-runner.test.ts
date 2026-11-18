import { beforeEach, describe, expect, it } from "vitest";

import { CRON_JOBS } from "../src/jobs/schedule.js";
import { runJobWithLock } from "../src/jobs/runner.js";
import { ManualClock, sequentialIds } from "../src/testing/fixtures.js";
import { MemoryStore } from "../src/testing/memory-store.js";

import type { RuntimeDeps } from "../src/ports.js";

describe("durable job runner, advisory locks, and pg_cron schedules", () => {
  let store: MemoryStore;
  let deps: RuntimeDeps;
  const T0 = 1_700_000_000_000;

  beforeEach(() => {
    store = new MemoryStore();
    deps = {
      store,
      clock: new ManualClock(T0),
      ids: sequentialIds(),
      rng: { next: () => 0.5 },
    };
  });

  it("registers required cron schedules for retention, day closure, due reviews, and 5m data requests", () => {
    const byName = Object.fromEntries(CRON_JOBS.map((j) => [j.name, j]));
    expect(byName["retention-purge"]?.cron_utc).toBe("0 0 * * *"); // 01:00 Lagos
    expect(byName["close-learning-day"]?.cron_utc).toBe("5 2 * * *"); // 03:05 Lagos
    expect(byName["schedule-due-reviews"]?.cron_utc).toBe("15 2 * * *"); // 03:15 Lagos
    expect(byName["process-data-requests"]?.cron_utc).toBe("*/5 * * * *"); // Every 5 minutes
  });

  it("creates durable job_runs records and prevents overlapping runs via advisory lock", async () => {
    let overlapResult: Awaited<ReturnType<typeof runJobWithLock>> | null = null;

    const firstRun = await runJobWithLock(deps, "retention-purge", async () => {
      // Simulate an overlapping worker trying to run the same job while lock is held
      overlapResult = await runJobWithLock(deps, "retention-purge", async () => ({
        processed: 999,
      }));
      return { processed: 5, checkpoint: "cursor-5" };
    });

    expect(firstRun.status).toBe("completed");
    expect(firstRun.processed).toBe(5);
    expect(firstRun.checkpoint).toBe("cursor-5");

    expect(overlapResult).not.toBeNull();
    expect(overlapResult!.status).toBe("skipped_locked");
    expect(overlapResult!.processed).toBe(0);

    const runs = await store.listJobRuns("retention-purge");
    expect(runs).toHaveLength(1);
    expect(runs[0]?.status).toBe("completed");

    // After lock release, a subsequent run succeeds cleanly
    const secondRun = await runJobWithLock(deps, "retention-purge", async () => ({
      processed: 2,
    }));
    expect(secondRun.status).toBe("completed");
    expect(await store.listJobRuns("retention-purge")).toHaveLength(2);
  });

  it("records failed status and releases advisory lock when job throws", async () => {
    await expect(
      runJobWithLock(deps, "close-learning-day", async () => {
        throw new Error("DB_TIMEOUT");
      }),
    ).rejects.toThrow("DB_TIMEOUT");

    const runs = await store.listJobRuns("close-learning-day");
    expect(runs).toHaveLength(1);
    expect(runs[0]?.status).toBe("failed");
    expect(runs[0]?.error).toContain("DB_TIMEOUT");

    // Lock was released in finally block, so next run can acquire it
    const retry = await runJobWithLock(deps, "close-learning-day", async () => ({
      processed: 1,
    }));
    expect(retry.status).toBe("completed");
  });
});
