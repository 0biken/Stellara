import type { JobRunRecord, RuntimeDeps } from "../ports.js";
import type { CronJobName } from "./schedule.js";

export interface JobExecutionOutput {
  readonly processed: number;
  readonly checkpoint?: string | null;
}

/**
 * Executes a scheduled job under an exclusive advisory lock and persists a
 * durable `JobRunRecord` so overlapping, repeated, or interrupted runs never
 * duplicate work.
 */
export async function runJobWithLock(
  deps: RuntimeDeps,
  jobName: CronJobName,
  fn: (checkpoint: string | null) => Promise<JobExecutionOutput>,
): Promise<JobRunRecord> {
  const holderId = deps.ids.uuid();
  const acquired = await deps.store.tryAcquireJobLock(jobName, holderId);
  const startedAt = deps.clock.now();

  if (!acquired) {
    return {
      id: holderId,
      job_name: jobName,
      status: "skipped_locked",
      started_at: startedAt,
      finished_at: startedAt,
      processed: 0,
      checkpoint: null,
    };
  }

  const priorRuns = await deps.store.listJobRuns(jobName);
  const lastCompleted = [...priorRuns].reverse().find((r) => r.status === "completed");
  const initialCheckpoint = lastCompleted?.checkpoint ?? null;

  const running: JobRunRecord = {
    id: holderId,
    job_name: jobName,
    status: "running",
    started_at: startedAt,
    finished_at: null,
    processed: 0,
    checkpoint: initialCheckpoint,
  };
  await deps.store.putJobRun(running);

  try {
    const out = await fn(initialCheckpoint);
    const finished: JobRunRecord = {
      ...running,
      status: "completed",
      finished_at: deps.clock.now(),
      processed: out.processed,
      checkpoint: out.checkpoint !== undefined ? out.checkpoint : initialCheckpoint,
    };
    await deps.store.putJobRun(finished);
    return finished;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const failed: JobRunRecord = {
      ...running,
      status: "failed",
      finished_at: deps.clock.now(),
      error: message,
    };
    await deps.store.putJobRun(failed);
    throw error;
  } finally {
    await deps.store.releaseJobLock(jobName, holderId);
  }
}
