import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";

import { createOfflineDb, type StellaraOfflineDB } from "../lib/offline/db";
import {
  canSyncOutbox,
  checkOfflineAccess,
  issueOfflineGrant,
  logoutChildOffline,
  OFFLINE_GRANT_MAX_MS,
  purgeChildLocalData,
} from "../lib/offline/grants";
import { enqueueAnswer } from "../lib/offline/outbox";
import { storeDownloadedPack } from "../lib/offline/packs";

describe("72-hour offline grant, sibling isolation, logout, and withdrawal purge", () => {
  let db: StellaraOfflineDB;
  const T0 = 1_700_000_000_000;

  beforeEach(async () => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    db = createOfflineDb(`stellara_grant_test_${Date.now()}_${Math.random()}`);
    await db.open();
  });

  const sampleAnswer = (clientId: string) => ({
    client_id: clientId,
    set_id: "00000000-0000-4000-8000-000000000001",
    item_id: "00000000-0000-4000-8000-000000000002",
    item_version: 1,
    response: { choice: "a" },
    hint_shown: false,
    response_ms: 2000,
    recorded_at: new Date(T0).toISOString(),
    key_on_device: true,
  });

  it("permits reopening offline for the last signed-in child for 72h bounded by session absolute expiry", async () => {
    const sessionExpiryShort = T0 + 10 * 60 * 60 * 1000; // 10 hours
    const grant = await issueOfflineGrant(db, {
      childId: "child-A",
      profile: { id: "child-A", first_name: "Tolu" },
      sessionExpiresAt: sessionExpiryShort,
      signature: "sig-A",
      now: T0,
    });

    expect(grant.expires_at).toBe(sessionExpiryShort);

    // Within window: allowed
    expect((await checkOfflineAccess(db, "child-A", T0 + 5 * 60 * 60 * 1000)).allowed).toBe(true);

    // After session expiry: blocked
    const expired = await checkOfflineAccess(db, "child-A", sessionExpiryShort + 1);
    expect(expired.allowed).toBe(false);
    expect(expired.reason).toBe("EXPIRED");

    // Long session expiry is capped at 72h
    const grant72 = await issueOfflineGrant(db, {
      childId: "child-B",
      profile: { id: "child-B", first_name: "Ada" },
      sessionExpiresAt: T0 + 365 * 24 * 60 * 60 * 1000,
      signature: "sig-B",
      now: T0,
    });
    expect(grant72.expires_at).toBe(T0 + OFFLINE_GRANT_MAX_MS);

    // Child A is no longer the last signed-in child
    const childAStatus = await checkOfflineAccess(db, "child-A", T0 + 1000);
    expect(childAStatus.allowed).toBe(false);
    expect(childAStatus.reason).toBe("NOT_LAST_CHILD");
  });

  it("blocks new offline work at expiry while retaining pending outbox answers, and requires tab-scoped auth before sync", async () => {
    await issueOfflineGrant(db, {
      childId: "child-A",
      profile: { id: "child-A", first_name: "Tolu" },
      sessionExpiresAt: T0 + 1000,
      signature: "sig-A",
      now: T0,
    });

    await enqueueAnswer(db, "child-A", sampleAnswer("cid-pending-1"), T0 + 500);

    // Grant expires
    const access = await checkOfflineAccess(db, "child-A", T0 + 2000);
    expect(access.allowed).toBe(false);

    // Pending answers remain in outbox
    const pending = await db.outbox.where("child_id").equals("child-A").toArray();
    expect(pending).toHaveLength(1);

    // Without tab-scoped bearer credential (simulating browser close & reopen), sync is blocked
    expect(canSyncOutbox(null)).toBe(false);
    expect(canSyncOutbox({ childId: "child-A", accessToken: "tok-123" })).toBe(true);
  });

  it("logout removes offline access and downloaded packs, while isolating unsent answers until same child re-authenticates", async () => {
    await issueOfflineGrant(db, {
      childId: "child-A",
      profile: { id: "child-A", first_name: "Tolu" },
      sessionExpiresAt: T0 + OFFLINE_GRANT_MAX_MS,
      signature: "sig-A",
      now: T0,
    });

    await storeDownloadedPack(db, {
      id: "pack-A",
      child_id: "child-A",
      topic_id: "topic-1",
      created_at: T0,
      last_accessed_at: T0,
      size_bytes: 10_000,
      manifest: { set_ids: ["s1"] },
      pack_data: {},
    });

    await db.cached_lessons.put({
      topic_id: "topic-1",
      version: 1,
      child_id: "child-A",
      lesson: {},
      updated_at: T0,
    });

    await enqueueAnswer(db, "child-A", sampleAnswer("cid-unsent"), T0 + 100);

    await logoutChildOffline(db, "child-A");

    // Offline access and downloaded content removed
    expect((await checkOfflineAccess(db, "child-A", T0 + 200)).allowed).toBe(false);
    expect(await db.downloaded_packs.where("child_id").equals("child-A").count()).toBe(0);
    expect(await db.cached_lessons.where("child_id").equals("child-A").count()).toBe(0);

    // Unsent answers remain isolated for child-A
    const outboxA = await db.outbox.where("child_id").equals("child-A").toArray();
    expect(outboxA).toHaveLength(1);
    expect(outboxA[0]?.client_id).toBe("cid-unsent");
  });

  it("confirmed withdrawal or deletion purges all local data for that child without affecting siblings", async () => {
    await enqueueAnswer(db, "child-A", sampleAnswer("cid-A"), T0);
    await enqueueAnswer(db, "child-B", sampleAnswer("cid-B"), T0);
    await db.child_drafts.put({ child_id: "child-A", kind: "practice", data: {}, updated_at: T0 });
    await db.child_drafts.put({ child_id: "child-B", kind: "practice", data: {}, updated_at: T0 });

    await purgeChildLocalData(db, "child-A");

    expect(await db.outbox.where("child_id").equals("child-A").count()).toBe(0);
    expect(await db.child_drafts.where("child_id").equals("child-A").count()).toBe(0);

    // Sibling B untouched
    expect(await db.outbox.where("child_id").equals("child-B").count()).toBe(1);
    expect(await db.child_drafts.where("child_id").equals("child-B").count()).toBe(1);
  });
});
