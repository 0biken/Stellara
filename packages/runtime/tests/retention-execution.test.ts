import { beforeEach, describe, expect, it } from "vitest";

import { requestDataDeletion, requestDataExport } from "../src/data-rights.js";
import { executeRetentionPurge, processPendingDataRequests } from "../src/jobs/index.js";
import { ManualClock, sequentialIds } from "../src/testing/fixtures.js";
import { MemoryStore } from "../src/testing/memory-store.js";

import type { ChildRecord, RuntimeDeps } from "../src/ports.js";

describe("retention purge execution and bounded batch data request processing", () => {
  let store: MemoryStore;
  let deps: RuntimeDeps;
  const NOW = Date.UTC(2026, 10, 18, 0, 0, 0); // 2026-11-18T00:00:00Z (01:00 Lagos)
  const THIRTEEN_MONTHS_AGO = NOW - 400 * 86_400_000;
  const TWO_MONTHS_AGO = NOW - 60 * 86_400_000;
  const SEVEN_YEARS_AGO = NOW - 7 * 365 * 86_400_000;

  beforeEach(() => {
    store = new MemoryStore();
    deps = {
      store,
      clock: new ManualClock(NOW),
      ids: sequentialIds(),
      rng: { next: () => 0.5 },
    };
  });

  it("purges 12m inactive learning data using last_active_at or created_at fallback, 6y consent, and 24h expired exports", async () => {
    const inactiveByActivity: ChildRecord = {
      id: "child-inactive-act",
      guardian_id: "g1",
      first_name: "Old",
      timezone: "Africa/Lagos",
      exam_date: null,
      status: "active",
      term_id: "t1",
      last_active_at: THIRTEEN_MONTHS_AGO,
      created_at: THIRTEEN_MONTHS_AGO,
    };
    const inactiveByCreation: ChildRecord = {
      id: "child-inactive-created",
      guardian_id: "g1",
      first_name: "NeverActive",
      timezone: "Africa/Lagos",
      exam_date: null,
      status: "active",
      term_id: "t1",
      last_active_at: null,
      created_at: THIRTEEN_MONTHS_AGO,
    };
    const activeChild: ChildRecord = {
      id: "child-active",
      guardian_id: "g2",
      first_name: "Active",
      timezone: "Africa/Lagos",
      exam_date: null,
      status: "active",
      term_id: "t1",
      last_active_at: TWO_MONTHS_AGO,
      created_at: THIRTEEN_MONTHS_AGO,
    };

    store.addChild(inactiveByActivity);
    store.addChild(inactiveByCreation);
    store.addChild(activeChild);

    await store.putConsent({
      id: "consent-expired",
      guardian_id: "g1",
      child_id: null,
      notice_version: "2020-v1",
      method: "declaration_v0",
      given_at: SEVEN_YEARS_AGO,
      withdrawn_at: null,
      retain_until: NOW - 1000, // Past 6-year period
      detached: true,
    });
    await store.putConsent({
      id: "consent-valid",
      guardian_id: "g2",
      child_id: "child-active",
      notice_version: "2026-v1",
      method: "declaration_v0",
      given_at: TWO_MONTHS_AGO,
      withdrawn_at: null,
      retain_until: NOW + 5 * 365 * 86_400_000,
    });

    await store.putDataRequest({
      id: "exp-expired",
      guardian_id: "g2",
      child_id: "child-active",
      kind: "export",
      status: "ready",
      idempotency_key: "exp-old",
      requested_at: TWO_MONTHS_AGO,
      due_at: TWO_MONTHS_AGO + 7 * 86_400_000,
      completed_at: TWO_MONTHS_AGO + 1000,
      download_url: "https://storage.stellara.local/private/exports/old.json",
      download_expires_at: NOW - 1000, // Expired 24h link
    });

    const res1 = await executeRetentionPurge(deps, { batchSize: 10 });
    expect(res1.processed_children).toBe(2);
    expect(res1.purged_consents).toBe(1);
    expect(res1.expired_exports).toBe(1);

    expect(await store.getChild("child-inactive-act")).toBeNull();
    expect(await store.getChild("child-inactive-created")).toBeNull();
    expect(await store.getChild("child-active")).not.toBeNull();

    const consents = await store.listConsents();
    expect(consents.map((c) => c.id)).toEqual(["consent-valid"]);

    const exp = await store.getDataRequest("exp-expired");
    expect(exp?.download_url).toBeUndefined();

    // Repeated run is idempotent and produces the same final state
    const res2 = await executeRetentionPurge(deps, { batchSize: 10 });
    expect(res2.processed_children).toBe(0);
    expect(res2.purged_consents).toBe(0);
    expect(res2.expired_exports).toBe(0);
  });

  it("processes pending export and deletion requests in bounded batches idempotently", async () => {
    store.addChild({
      id: "c-exp",
      guardian_id: "g1",
      first_name: "Ada",
      timezone: "Africa/Lagos",
      exam_date: null,
      status: "active",
      term_id: "t1",
      last_active_at: NOW,
    });
    store.addChild({
      id: "c-del",
      guardian_id: "g1",
      first_name: "Bola",
      timezone: "Africa/Lagos",
      exam_date: null,
      status: "active",
      term_id: "t1",
      last_active_at: NOW,
    });

    const expReq = await requestDataExport(deps, { guardian_id: "g1" }, "c-exp", "k1");
    const delReq = await requestDataDeletion(deps, { guardian_id: "g1" }, "c-del", "DELETE Bola", "k2");

    // Batch size 1 processes one item, second run processes the remaining item
    const batch1 = await processPendingDataRequests(deps, { batchSize: 1 });
    expect(batch1.processed).toBe(1);

    const batch2 = await processPendingDataRequests(deps, { batchSize: 1 });
    expect(batch2.processed).toBe(1);

    // Third run finds nothing left
    const batch3 = await processPendingDataRequests(deps, { batchSize: 1 });
    expect(batch3.processed).toBe(0);

    expect((await store.getDataRequest(expReq.id))?.status).toBe("ready");
    expect((await store.getDataRequest(delReq.id))?.status).toBe("completed");
    expect(await store.getChild("c-del")).toBeNull();
  });
});
