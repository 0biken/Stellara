import { beforeEach, describe, expect, it } from "vitest";

import { RuntimeError } from "../src/contracts.js";
import {
  executeDeletion,
  processExportRequest,
  requestDataDeletion,
  requestDataExport,
} from "../src/data-rights.js";
import { submitResponses } from "../src/responses-submit.js";
import { startSet } from "../src/set-start.js";
import { ManualClock, sequentialIds } from "../src/testing/fixtures.js";
import { MemoryStore } from "../src/testing/memory-store.js";
import { SAMPLE_PRACTICE_ITEMS } from "../src/testing/sample-content.js";

import type { ChildRecord, RuntimeDeps } from "../src/ports.js";

const GUARDIAN_A = "00000000-0000-4000-8000-00000000a001";
const GUARDIAN_B = "00000000-0000-4000-8000-00000000b001";
const CHILD_A = "00000000-0000-4000-8000-00000000c001";
const CHILD_B = "00000000-0000-4000-8000-00000000c002";
const P4_FRACTIONS = "00000000-0000-4000-8000-000400000001";

describe("data export and restricted deletion worker across mixed-child partitions", () => {
  let store: MemoryStore;
  let deps: RuntimeDeps;
  let capturedArchive: string | null = null;
  const T0 = 1_700_000_000_000;

  beforeEach(async () => {
    store = new MemoryStore();
    capturedArchive = null;
    deps = {
      store,
      clock: new ManualClock(T0),
      ids: sequentialIds(),
      rng: { next: () => 0.5 },
      packStorage: {
        putPack: async (id, bytes) => {
          capturedArchive = Buffer.from(bytes).toString("utf8");
          return `https://storage.stellara.local/private/exports/${id}.json?expires=24h`;
        },
      },
    };

    const childA: ChildRecord = {
      id: CHILD_A,
      guardian_id: GUARDIAN_A,
      first_name: "Tolu",
      avatar_key: "butterfly",
      timezone: "Africa/Lagos",
      exam_date: "2026-04-20",
      status: "active",
      term_id: "term-1",
      year: "P4",
      last_active_at: T0,
      pin_hash: "argon2id$super_secret_pin_hash",
    };
    const childB: ChildRecord = {
      id: CHILD_B,
      guardian_id: GUARDIAN_B,
      first_name: "Ada",
      avatar_key: "owl",
      timezone: "Africa/Lagos",
      exam_date: "2026-04-20",
      status: "active",
      term_id: "term-1",
      year: "P4",
      last_active_at: T0,
      pin_hash: "argon2id$other_family_pin_hash",
    };

    store.addChild(childA);
    store.addChild(childB);
    store.addItems(SAMPLE_PRACTICE_ITEMS.filter((i) => i.topic_id === P4_FRACTIONS));

    await store.putConsent({
      id: "consent-A",
      guardian_id: GUARDIAN_A,
      child_id: CHILD_A,
      notice_version: "2026-11-v1",
      method: "declaration_v0",
      given_at: T0 - 10_000,
      withdrawn_at: null,
      retain_until: T0 + 6 * 365 * 86_400_000,
    });

    // Seed learning records for BOTH Child A and Child B in the same shared attempts/ledger arrays
    const setA = await startSet(
      deps,
      { child_id: CHILD_A },
      { kind: "practice", topic_ids: [P4_FRACTIONS] },
    );
    const setB = await startSet(
      deps,
      { child_id: CHILD_B },
      { kind: "practice", topic_ids: [P4_FRACTIONS] },
    );

    await submitResponses(
      deps,
      { child_id: CHILD_A },
      {
        responses: [
          {
            client_id: "00000000-0000-4000-8000-00000000e001",
            set_id: setA.set_id,
            item_id: setA.items[0]!.id,
            item_version: setA.items[0]!.version,
            response: { choice: "a" },
            hint_shown: false,
            response_ms: 3000,
            recorded_at: new Date(T0 + 1000).toISOString(),
            key_on_device: false,
          },
        ],
        device_clock: new Date(T0 + 2000).toISOString(),
      },
    );

    await submitResponses(
      deps,
      { child_id: CHILD_B },
      {
        responses: [
          {
            client_id: "00000000-0000-4000-8000-00000000e002",
            set_id: setB.set_id,
            item_id: setB.items[0]!.id,
            item_version: setB.items[0]!.version,
            response: { choice: "a" },
            hint_shown: false,
            response_ms: 3000,
            recorded_at: new Date(T0 + 1000).toISOString(),
            key_on_device: false,
          },
        ],
        device_clock: new Date(T0 + 2000).toISOString(),
      },
    );
  });

  it("denies cross-family export and deletion requests", async () => {
    await expect(
      requestDataExport(deps, { guardian_id: GUARDIAN_B }, CHILD_A, "exp-1"),
    ).rejects.toThrow(RuntimeError);

    await expect(
      requestDataDeletion(deps, { guardian_id: GUARDIAN_B }, CHILD_A, "DELETE Tolu", "del-1"),
    ).rejects.toThrow(RuntimeError);
  });

  it("creates idempotent export, excludes PIN hashes and secrets, and issues a 24-hour signed URL", async () => {
    const req1 = await requestDataExport(deps, { guardian_id: GUARDIAN_A }, CHILD_A, "exp-key-1");
    const req2 = await requestDataExport(deps, { guardian_id: GUARDIAN_A }, CHILD_A, "exp-key-1");
    expect(req2.id).toBe(req1.id);
    expect(req1.due_at).toBe(T0 + 7 * 86_400_000);

    const processed = await processExportRequest(deps, req1.id);
    expect(processed.status).toBe("ready");
    expect(processed.download_url).toContain("https://");
    expect(processed.download_expires_at).toBe(T0 + 24 * 3_600_000);

    // Idempotent re-process returns the same ready record
    const processedAgain = await processExportRequest(deps, req1.id);
    expect(processedAgain).toEqual(processed);

    await expect(processExportRequest(deps, "missing-req")).rejects.toThrow(RuntimeError);

    expect(capturedArchive).not.toBeNull();
    expect(capturedArchive).toContain("Tolu");
    expect(capturedArchive).not.toContain("pin_hash");
    expect(capturedArchive).not.toContain("super_secret_pin_hash");
  });

  it("requires typed confirmation, deletes only Child A across shared partitions, preserves Child B, and retains detached 6-year consent", async () => {
    await expect(
      requestDataDeletion(deps, { guardian_id: GUARDIAN_A }, CHILD_A, "DELETE wrong", "del-key-1"),
    ).rejects.toThrow(/confirmation/i);

    const delReq = await requestDataDeletion(
      deps,
      { guardian_id: GUARDIAN_A },
      CHILD_A,
      "DELETE Tolu",
      "del-key-1",
    );
    expect(delReq.status).toBe("pending");
    expect(delReq.due_at).toBe(T0 + 30 * 86_400_000);

    // Immediately marked deletion_pending and sessions revoked
    expect((await store.getChild(CHILD_A))?.status).toBe("deletion_pending");
    expect(await store.isChildAccessRevoked(CHILD_A, T0 - 1)).toBe(true);

    const delReq2 = await requestDataDeletion(
      deps,
      { guardian_id: GUARDIAN_A },
      CHILD_A,
      "DELETE Tolu",
      "del-key-1",
    );
    expect(delReq2.id).toBe(delReq.id);

    // Execute restricted deletion worker
    const result = await executeDeletion(deps, delReq.id);
    expect(result.status).toBe("completed");

    // Idempotent re-execution and missing request check
    const resultAgain = await executeDeletion(deps, delReq.id);
    expect(resultAgain.status).toBe("completed");
    await expect(executeDeletion(deps, "missing-del-req")).rejects.toThrow(RuntimeError);

    // Child A profile & learning records deleted
    expect(await store.getChild(CHILD_A)).toBeNull();
    expect(store.t.attempts.filter((a) => a.child_id === CHILD_A)).toHaveLength(0);
    expect(await store.getStardust(CHILD_A)).toBeNull();

    // Child B records in the SAME shared attempts/ledger tables are untouched!
    expect(await store.getChild(CHILD_B)).not.toBeNull();
    expect(store.t.attempts.filter((a) => a.child_id === CHILD_B)).toHaveLength(1);

    // Minimal consent evidence retained for 6 years, detached from deleted child profile
    const consents = await store.listConsents();
    const retained = consents.find((c) => c.id === "consent-A");
    expect(retained).toBeDefined();
    expect(retained?.child_id).toBeNull();
    expect(retained?.detached).toBe(true);
    expect(retained?.retain_until).toBeGreaterThanOrEqual(T0 + 6 * 365 * 86_400_000);
  });
});
