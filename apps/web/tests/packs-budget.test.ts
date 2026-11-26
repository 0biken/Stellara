import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";

import {
  createOfflineDb,
  type DownloadedPackRecord,
  type StellaraOfflineDB,
} from "../lib/offline/db";
import { enqueueAnswer } from "../lib/offline/outbox";
import {
  MAX_DEVICE_BYTES,
  MAX_PACK_BYTES,
  MAX_PACKS_PER_CHILD,
  PackBudgetError,
  storeDownloadedPack,
} from "../lib/offline/packs";

describe("client-side pack budgets and LRU eviction", () => {
  let db: StellaraOfflineDB;

  beforeEach(async () => {
    db = createOfflineDb(`stellara_pack_budget_${Date.now()}_${Math.random()}`);
    await db.open();
  });

  const makePack = (
    id: string,
    childId: string,
    lastAccessedAt: number,
    sizeBytes = 50_000,
    setIds = [`set-${id}-1`, `set-${id}-2`, `set-${id}-3`],
  ): DownloadedPackRecord => ({
    id,
    child_id: childId,
    topic_id: `topic-${id}`,
    created_at: lastAccessedAt,
    last_accessed_at: lastAccessedAt,
    size_bytes: sizeBytes,
    manifest: { set_ids: setIds },
    pack_data: { set_ids: setIds, items: [] },
  });

  it("rejects packs exceeding the 120 KB pack budget", async () => {
    const oversized = makePack("p-huge", "child-1", 1000, MAX_PACK_BYTES + 1);
    await expect(storeDownloadedPack(db, oversized)).rejects.toThrow(PackBudgetError);
  });

  it("evicts the least-recently-used pack when reaching the 3-pack limit if no pending work depends on it", async () => {
    await storeDownloadedPack(db, makePack("p1", "child-1", 1000));
    await storeDownloadedPack(db, makePack("p2", "child-1", 2000));
    await storeDownloadedPack(db, makePack("p3", "child-1", 3000));

    expect(await db.downloaded_packs.where("child_id").equals("child-1").count()).toBe(
      MAX_PACKS_PER_CHILD,
    );

    // Adding a 4th pack evicts p1 (oldest last_accessed_at)
    await storeDownloadedPack(db, makePack("p4", "child-1", 4000));

    const remaining = await db.downloaded_packs.where("child_id").equals("child-1").toArray();
    expect(remaining.map((p) => p.id).sort()).toEqual(["p2", "p3", "p4"]);
  });

  it("protects packs with pending outbox entries from LRU eviction and throws when all packs are pinned", async () => {
    await storeDownloadedPack(db, makePack("p1", "child-1", 1000));
    await storeDownloadedPack(db, makePack("p2", "child-1", 2000));
    await storeDownloadedPack(db, makePack("p3", "child-1", 3000));

    // Pin p1 via a pending outbox entry referencing set-p1-1
    await enqueueAnswer(db, "child-1", {
      client_id: "cid-1",
      set_id: "set-p1-1",
      item_id: "item-1",
      item_version: 1,
      response: { choice: "a" },
      hint_shown: false,
      response_ms: 1500,
      recorded_at: "2026-11-18T00:00:00.000Z",
      key_on_device: true,
    });

    // Adding p4 should skip p1 and evict p2 instead
    await storeDownloadedPack(db, makePack("p4", "child-1", 4000));
    const remaining = await db.downloaded_packs.where("child_id").equals("child-1").toArray();
    expect(remaining.map((p) => p.id).sort()).toEqual(["p1", "p3", "p4"]);

    // Now pin p3 and p4 as well
    await enqueueAnswer(db, "child-1", {
      client_id: "cid-2",
      set_id: "set-p3-1",
      item_id: "item-2",
      item_version: 1,
      response: { choice: "a" },
      hint_shown: false,
      response_ms: 1500,
      recorded_at: "2026-11-18T00:00:00.000Z",
      key_on_device: true,
    });
    await enqueueAnswer(db, "child-1", {
      client_id: "cid-3",
      set_id: "set-p4-1",
      item_id: "item-3",
      item_version: 1,
      response: { choice: "a" },
      hint_shown: false,
      response_ms: 1500,
      recorded_at: "2026-11-18T00:00:00.000Z",
      key_on_device: true,
    });

    await expect(storeDownloadedPack(db, makePack("p5", "child-1", 5000))).rejects.toThrow(
      PackBudgetError,
    );
  });

  it("enforces the 25 MB device budget", async () => {
    // Seed cached lesson taking almost 25 MB
    await db.cached_lessons.put({
      topic_id: "t-big",
      version: 1,
      child_id: "child-other",
      lesson: { blob: "x".repeat(MAX_DEVICE_BYTES - 10_000) },
      updated_at: 1000,
    });

    const newPack = makePack("p-over-device", "child-1", 2000, 20_000);
    await expect(storeDownloadedPack(db, newPack)).rejects.toThrow(PackBudgetError);
  });
});
