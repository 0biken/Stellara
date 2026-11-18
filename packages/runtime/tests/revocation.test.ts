import { beforeEach, describe, expect, it } from "vitest";

import { RuntimeError } from "../src/contracts.js";
import {
  pauseChild,
  resetChildPin,
  resumeChild,
  updateChildProfile,
  withdrawConsent,
} from "../src/family-admin.js";
import { startSet } from "../src/set-start.js";
import { ManualClock, sequentialIds } from "../src/testing/fixtures.js";
import { MemoryStore } from "../src/testing/memory-store.js";

import type { ChildRecord, RuntimeDeps } from "../src/ports.js";

const GUARDIAN_A = "00000000-0000-4000-8000-00000000a001";
const GUARDIAN_B = "00000000-0000-4000-8000-00000000b001";
const CHILD_A = "00000000-0000-4000-8000-00000000c001";

describe("guardian child management, session revocation, and consent withdrawal", () => {
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

    const childA: ChildRecord = {
      id: CHILD_A,
      guardian_id: GUARDIAN_A,
      first_name: "Tolu",
      avatar_key: "butterfly",
      timezone: "Africa/Lagos",
      exam_date: "2026-04-20",
      status: "active",
      term_id: "term-1",
      year: "P5",
      last_active_at: T0,
      pin_hash: "argon2id$secret_hash",
    };
    store.addChild(childA);
    store.putConsent({
      id: "consent-1",
      guardian_id: GUARDIAN_A,
      child_id: CHILD_A,
      notice_version: "2026-11-v1",
      method: "declaration_v0",
      given_at: T0 - 1000,
      withdrawn_at: null,
      retain_until: T0 + 6 * 365 * 86_400_000,
    });
  });

  it("denies cross-family management attempts", async () => {
    await expect(
      updateChildProfile(deps, { guardian_id: GUARDIAN_B }, CHILD_A, { first_name: "Hacked" }),
    ).rejects.toThrow(RuntimeError);

    await expect(
      resetChildPin(deps, { guardian_id: GUARDIAN_B }, CHILD_A, "new_hash"),
    ).rejects.toThrow(RuntimeError);

    await expect(pauseChild(deps, { guardian_id: GUARDIAN_B }, CHILD_A)).rejects.toThrow(
      RuntimeError,
    );

    await expect(withdrawConsent(deps, { guardian_id: GUARDIAN_B }, CHILD_A)).rejects.toThrow(
      RuntimeError,
    );
  });

  it("updates child profile fields for the owning guardian", async () => {
    const updated = await updateChildProfile(deps, { guardian_id: GUARDIAN_A }, CHILD_A, {
      first_name: "Toluwani",
      avatar_key: "owl",
      year: "P6",
      exam_date: "2026-05-01",
      timezone: "Europe/London",
    });

    expect(updated.first_name).toBe("Toluwani");
    expect(updated.avatar_key).toBe("owl");
    expect(updated.year).toBe("P6");
    expect(updated.exam_date).toBe("2026-05-01");
    expect(updated.timezone).toBe("Europe/London");
  });

  it("revokes child sessions and offline grants on PIN reset, pause, and consent withdrawal", async () => {
    // Session issued before T0 is initially valid
    expect(await store.isChildAccessRevoked(CHILD_A, T0 - 500)).toBe(false);

    await resetChildPin(deps, { guardian_id: GUARDIAN_A }, CHILD_A, "argon2id$new_hash");
    expect(await store.isChildAccessRevoked(CHILD_A, T0 - 500)).toBe(true);
    expect((await store.getChild(CHILD_A))?.pin_hash).toBe("argon2id$new_hash");

    // Advance clock and pause
    (deps.clock as ManualClock).advance(1000);
    const paused = await pauseChild(deps, { guardian_id: GUARDIAN_A }, CHILD_A);
    expect(paused.status).toBe("paused");
    expect(await store.isChildAccessRevoked(CHILD_A, T0 + 500)).toBe(true);

    // Server access stops immediately while paused
    await expect(
      startSet(deps, { child_id: CHILD_A }, { kind: "practice", topic_ids: ["t1"] }),
    ).rejects.toThrow(RuntimeError);

    // Resume works when consent was not withdrawn
    const resumed = await resumeChild(deps, { guardian_id: GUARDIAN_A }, CHILD_A);
    expect(resumed.status).toBe("active");
  });

  it("requires new verified consent to resume after consent withdrawal", async () => {
    await withdrawConsent(deps, { guardian_id: GUARDIAN_A }, CHILD_A);

    const child = await store.getChild(CHILD_A);
    expect(child?.status).toBe("paused");
    expect(child?.consent_withdrawn_at).toBe(T0);
    expect(await store.isChildAccessRevoked(CHILD_A, T0 - 1)).toBe(true);

    // Resuming without new consent fails with CONSENT_REQUIRED
    await expect(resumeChild(deps, { guardian_id: GUARDIAN_A }, CHILD_A)).rejects.toThrow(
      /consent/i,
    );

    // Guardian gives new verified consent
    await store.putConsent({
      id: "consent-2",
      guardian_id: GUARDIAN_A,
      child_id: CHILD_A,
      notice_version: "2026-11-v1",
      method: "declaration_v0",
      given_at: T0 + 5000,
      withdrawn_at: null,
      retain_until: T0 + 5000 + 6 * 365 * 86_400_000,
    });

    const resumed = await resumeChild(deps, { guardian_id: GUARDIAN_A }, CHILD_A);
    expect(resumed.status).toBe("active");
    expect(resumed.consent_withdrawn_at).toBeNull();

    // Unknown child or deletion_pending child cannot be resumed
    await expect(
      resumeChild(deps, { guardian_id: GUARDIAN_A }, "00000000-0000-4000-8000-000000009999"),
    ).rejects.toThrow(RuntimeError);

    await store.updateChild({ ...(await store.getChild(CHILD_A))!, status: "deletion_pending" });
    await expect(resumeChild(deps, { guardian_id: GUARDIAN_A }, CHILD_A)).rejects.toThrow(
      RuntimeError,
    );
  });
});
