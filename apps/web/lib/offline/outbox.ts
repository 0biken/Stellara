import { LearningError, type LearningApi, type SubmittedAnswer } from "../learning/types";
import type { OutboxRecord, StellaraOfflineDB } from "./db";

const LEASE_KEY = "outbox_drain";
const DEFAULT_LEASE_TTL_MS = 15_000;
const MAX_BACKOFF_MS = 300_000;
const BATCH_SIZE = 20;

export interface OutboxLease {
  acquired: boolean;
  release: () => Promise<void>;
}

export interface OutboxDrainOptions {
  childId?: string;
  holderId?: string;
  now?: number;
  leaseTtlMs?: number;
}

export interface OutboxDrainResult {
  sentCount: number;
  failedCount: number;
  actionableErrorCount: number;
  skippedDueToLease: boolean;
}

export function computeBackoffMs(attempts: number, retryAfterSeconds?: number): number {
  if (typeof retryAfterSeconds === "number" && Number.isFinite(retryAfterSeconds) && retryAfterSeconds >= 0) {
    return Math.min(MAX_BACKOFF_MS, Math.round(retryAfterSeconds * 1000));
  }
  const exp = Math.min(MAX_BACKOFF_MS, 1000 * Math.pow(2, Math.max(0, attempts)));
  const jitter = Math.floor(Math.random() * Math.min(5000, exp * 0.02));
  return Math.max(1000, exp - jitter);
}

export async function acquireOutboxLease(
  db: StellaraOfflineDB,
  holderId: string,
  now = Date.now(),
  ttlMs = DEFAULT_LEASE_TTL_MS,
): Promise<OutboxLease> {
  let acquired = false;

  await db.transaction("rw", db.worker_leases, async () => {
    const existing = await db.worker_leases.get(LEASE_KEY);
    if (existing && existing.expires_at > now && existing.holder_id !== holderId) {
      acquired = false;
      return;
    }
    await db.worker_leases.put({
      key: LEASE_KEY,
      holder_id: holderId,
      expires_at: now + ttlMs,
    });
    acquired = true;
  });

  return {
    acquired,
    release: async () => {
      if (!acquired) return;
      await db.transaction("rw", db.worker_leases, async () => {
        const current = await db.worker_leases.get(LEASE_KEY);
        if (current?.holder_id === holderId) {
          await db.worker_leases.delete(LEASE_KEY);
        }
      });
    },
  };
}

export async function enqueueAnswer(
  db: StellaraOfflineDB,
  childId: string,
  answer: SubmittedAnswer,
  now = Date.now(),
): Promise<string> {
  const id = `${childId}:${answer.client_id}`;
  const record: OutboxRecord = {
    id,
    child_id: childId,
    client_id: answer.client_id,
    answer,
    status: "pending",
    attempts: 0,
    next_retry_at: 0,
    created_at: now,
  };
  await db.outbox.put(record);
  return id;
}

interface ErrorInfo {
  permanent: boolean;
  retryAfterSeconds?: number;
  message: string;
}

function classifyError(error: unknown): ErrorInfo {
  const err = error as {
    message?: string;
    status?: number;
    permanent?: boolean;
    retryAfterSeconds?: number;
    retryable?: boolean;
    code?: string;
  };
  const message = err?.message ?? String(error);

  if (err?.status === 429) {
    return {
      permanent: false,
      ...(typeof err.retryAfterSeconds === "number"
        ? { retryAfterSeconds: err.retryAfterSeconds }
        : {}),
      message,
    };
  }

  if (err?.permanent === true) {
    return { permanent: true, message };
  }

  if (error instanceof LearningError && !error.retryable) {
    return { permanent: true, message };
  }

  if (typeof err?.status === "number" && err.status >= 400 && err.status < 500) {
    return { permanent: true, message };
  }

  return {
    permanent: false,
    ...(typeof err?.retryAfterSeconds === "number"
      ? { retryAfterSeconds: err.retryAfterSeconds }
      : {}),
    message,
  };
}

export async function drainOutbox(
  db: StellaraOfflineDB,
  api: Pick<LearningApi, "submit">,
  options: OutboxDrainOptions = {},
): Promise<OutboxDrainResult> {
  const now = options.now ?? Date.now();
  const holderId =
    options.holderId ??
    (typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `holder-${Math.random().toString(36).slice(2)}`);

  const lease = await acquireOutboxLease(
    db,
    holderId,
    now,
    options.leaseTtlMs ?? DEFAULT_LEASE_TTL_MS,
  );
  if (!lease.acquired) {
    return {
      sentCount: 0,
      failedCount: 0,
      actionableErrorCount: 0,
      skippedDueToLease: true,
    };
  }

  let sentCount = 0;
  let failedCount = 0;
  let actionableErrorCount = 0;

  try {
    const allPending = await db.outbox.where("status").equals("pending").toArray();
    const ready = allPending
      .filter(
        (r) =>
          r.next_retry_at <= now &&
          (options.childId === undefined || r.child_id === options.childId),
      )
      .sort((a, b) => a.created_at - b.created_at);

    for (let i = 0; i < ready.length; i += BATCH_SIZE) {
      const batch = ready.slice(i, i + BATCH_SIZE);
      try {
        await api.submit({
          responses: batch.map((b) => b.answer),
          device_clock: new Date(now).toISOString(),
        });
        await db.transaction("rw", db.outbox, async () => {
          for (const entry of batch) {
            await db.outbox.update(entry.id, { status: "sent" });
          }
        });
        sentCount += batch.length;
      } catch (error) {
        const info = classifyError(error);
        await db.transaction("rw", db.outbox, async () => {
          for (const entry of batch) {
            const nextAttempts = entry.attempts + 1;
            if (info.permanent) {
              await db.outbox.update(entry.id, {
                status: "actionable_error",
                attempts: nextAttempts,
                error: info.message,
              });
            } else {
              const delay = computeBackoffMs(entry.attempts, info.retryAfterSeconds);
              await db.outbox.update(entry.id, {
                status: "pending",
                attempts: nextAttempts,
                next_retry_at: now + delay,
                error: info.message,
              });
            }
          }
        });
        if (info.permanent) {
          actionableErrorCount += batch.length;
        } else {
          failedCount += batch.length;
        }
      }
    }
  } finally {
    await lease.release();
  }

  return {
    sentCount,
    failedCount,
    actionableErrorCount,
    skippedDueToLease: false,
  };
}

export function startOutboxSyncLoop(
  db: StellaraOfflineDB,
  api: Pick<LearningApi, "submit">,
  options: { childId?: string; intervalMs?: number } = {},
): () => void {
  const trigger = () => {
    if (typeof navigator !== "undefined" && navigator.onLine === false) return;
    void drainOutbox(db, api, options.childId ? { childId: options.childId } : {});
  };

  const onOnline = () => {
    trigger();
    if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.ready
        .then((reg) => {
          const syncReg = reg as ServiceWorkerRegistration & {
            sync?: { register: (tag: string) => Promise<void> };
          };
          return syncReg.sync?.register("stellara-outbox-sync");
        })
        .catch(() => {});
    }
  };

  const onVisibility = () => {
    if (typeof document !== "undefined" && document.visibilityState === "visible") {
      trigger();
    }
  };

  if (typeof window !== "undefined") {
    window.addEventListener("online", onOnline);
  }
  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", onVisibility);
  }
  const timer = setInterval(trigger, options.intervalMs ?? 30_000);

  return () => {
    if (typeof window !== "undefined") {
      window.removeEventListener("online", onOnline);
    }
    if (typeof document !== "undefined") {
      document.removeEventListener("visibilitychange", onVisibility);
    }
    clearInterval(timer);
  };
}
