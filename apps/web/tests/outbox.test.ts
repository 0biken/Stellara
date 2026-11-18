import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createOfflineDb, type StellaraOfflineDB } from "../lib/offline/db";
import {
  acquireOutboxLease,
  computeBackoffMs,
  drainOutbox,
  enqueueAnswer,
} from "../lib/offline/outbox";

import type { SubmitOutcome, SubmittedAnswer } from "../lib/learning/types";

describe("multi-tab outbox queue with lock lease and exponential backoff", () => {
  let db: StellaraOfflineDB;

  beforeEach(async () => {
    db = createOfflineDb(`stellara_outbox_test_${Date.now()}_${Math.random()}`);
    await db.open();
  });

  const makeAnswer = (clientId: string): SubmittedAnswer => ({
    client_id: clientId,
    set_id: "00000000-0000-4000-8000-000000000001",
    item_id: "00000000-0000-4000-8000-000000000002",
    item_version: 1,
    response: { choice: "a" },
    hint_shown: false,
    response_ms: 1500,
    recorded_at: "2026-11-18T00:00:00.000Z",
    key_on_device: false,
  });

  it("enqueues answers before sending and drains them successfully", async () => {
    const answer = makeAnswer("c1");
    const id = await enqueueAnswer(db, "child-1", answer);
    expect(id).toBeDefined();

    const record = await db.outbox.get(id);
    expect(record?.status).toBe("pending");
    expect(record?.attempts).toBe(0);

    const mockApi = {
      submit: vi.fn().mockResolvedValue({
        results: [{ client_id: "c1", is_correct: true, scored: true, stardust: 10, explanation_html: "" }],
        mastery_changes: [],
        stardust_today: 10,
        run_length: 1,
      } as SubmitOutcome),
    };

    const result = await drainOutbox(db, mockApi, { now: 1000 });
    expect(result.sentCount).toBe(1);
    expect(mockApi.submit).toHaveBeenCalledTimes(1);

    const updated = await db.outbox.get(id);
    expect(updated?.status).toBe("sent");
  });

  it("prevents competing tabs from draining simultaneously using an IndexedDB lock lease", async () => {
    const lease1 = await acquireOutboxLease(db, "tab-1", 1000, 5000);
    expect(lease1.acquired).toBe(true);

    // Second tab tries to acquire while tab 1 holds active lease
    const lease2 = await acquireOutboxLease(db, "tab-2", 2000, 5000);
    expect(lease2.acquired).toBe(false);

    // After tab 1 releases lease
    await lease1.release();

    const lease3 = await acquireOutboxLease(db, "tab-2", 2500, 5000);
    expect(lease3.acquired).toBe(true);
    await lease3.release();
  });

  it("retries transient failures with exponential backoff capped at 5 minutes", async () => {
    const answer = makeAnswer("c-transient");
    const id = await enqueueAnswer(db, "child-1", answer);

    const mockApi = {
      submit: vi.fn().mockRejectedValue(new Error("NETWORK_FAILURE")),
    };

    // First drain attempt at t=1000
    const res1 = await drainOutbox(db, mockApi, { now: 1000 });
    expect(res1.failedCount).toBe(1);

    const record1 = await db.outbox.get(id);
    expect(record1?.status).toBe("pending");
    expect(record1?.attempts).toBe(1);
    expect(record1?.next_retry_at).toBeGreaterThan(1000);

    // Verify backoff computation is capped at 5 minutes (300,000 ms)
    const backoffHigh = computeBackoffMs(10);
    expect(backoffHigh).toBeLessThanOrEqual(300_000);
    expect(backoffHigh).toBeGreaterThanOrEqual(290_000);
  });

  it("honours Retry-After header for 429 rate limit errors", async () => {
    const answer = makeAnswer("c-rate-limit");
    const id = await enqueueAnswer(db, "child-1", answer);

    const rateLimitError = Object.assign(new Error("TOO_MANY_REQUESTS"), {
      status: 429,
      retryAfterSeconds: 45,
    });
    const mockApi = {
      submit: vi.fn().mockRejectedValue(rateLimitError),
    };

    await drainOutbox(db, mockApi, { now: 5000 });

    const record = await db.outbox.get(id);
    expect(record?.attempts).toBe(1);
    expect(record?.next_retry_at).toBe(5000 + 45_000);
  });

  it("retains permanent errors with actionable_error status without retrying indefinitely", async () => {
    const answer = makeAnswer("c-permanent");
    const id = await enqueueAnswer(db, "child-1", answer);

    const permanentError = Object.assign(new Error("CHILD_INACTIVE"), {
      permanent: true,
    });
    const mockApi = {
      submit: vi.fn().mockRejectedValue(permanentError),
    };

    const res = await drainOutbox(db, mockApi, { now: 1000 });
    expect(res.actionableErrorCount).toBe(1);

    const record = await db.outbox.get(id);
    expect(record?.status).toBe("actionable_error");
    expect(record?.error).toContain("CHILD_INACTIVE");

    // Subsequent drain does not attempt actionable_error records
    mockApi.submit.mockClear();
    await drainOutbox(db, mockApi, { now: 10_000 });
    expect(mockApi.submit).not.toHaveBeenCalled();
  });
});
