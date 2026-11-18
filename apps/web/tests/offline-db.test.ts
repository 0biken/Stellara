import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";

import {
  createOfflineDb,
  migrateLocalStorageDrafts,
  saveChildDraft,
  loadChildDraft,
  clearChildDraft,
  type StellaraOfflineDB,
} from "../lib/offline/db";

describe("Dexie offline stores and localStorage draft migration", () => {
  let db: StellaraOfflineDB;

  beforeEach(async () => {
    window.localStorage.clear();
    db = createOfflineDb(`stellara_test_${Date.now()}_${Math.random()}`);
    await db.open();
  });

  it("initializes child_drafts, outbox, downloaded_packs, cached_lessons, and offline_grants stores", () => {
    expect(db.child_drafts).toBeDefined();
    expect(db.outbox).toBeDefined();
    expect(db.downloaded_packs).toBeDefined();
    expect(db.cached_lessons).toBeDefined();
    expect(db.offline_grants).toBeDefined();
  });

  it("migrates existing localStorage drafts transactionally and deletes old keys only upon commit", async () => {
    const draft1 = { index: 3, pending: [{ client_id: "c1" }] };
    const draft2 = { index: 0, pending: [] };

    window.localStorage.setItem("stellara.draft.child-1.practice", JSON.stringify(draft1));
    window.localStorage.setItem("stellara.draft.child-2.placement", JSON.stringify(draft2));
    window.localStorage.setItem("other.unrelated.key", "preserved");

    const count = await migrateLocalStorageDrafts(db, window.localStorage);
    expect(count).toBe(2);

    // Drafts exist in Dexie store
    const stored1 = await db.child_drafts.get(["child-1", "practice"]);
    expect(stored1).toBeDefined();
    expect(stored1?.data).toEqual(draft1);

    const stored2 = await db.child_drafts.get(["child-2", "placement"]);
    expect(stored2).toBeDefined();
    expect(stored2?.data).toEqual(draft2);

    // Old localStorage draft keys removed, unrelated keys preserved
    expect(window.localStorage.getItem("stellara.draft.child-1.practice")).toBeNull();
    expect(window.localStorage.getItem("stellara.draft.child-2.placement")).toBeNull();
    expect(window.localStorage.getItem("other.unrelated.key")).toBe("preserved");
  });

  it("preserves localStorage keys if migration encounters invalid json", async () => {
    window.localStorage.setItem("stellara.draft.child-corrupt.practice", "NOT_JSON");
    const count = await migrateLocalStorageDrafts(db, window.localStorage);
    expect(count).toBe(0);
    // Corrupt key is kept for safety
    expect(window.localStorage.getItem("stellara.draft.child-corrupt.practice")).toBe("NOT_JSON");
  });

  it("supports saveChildDraft, loadChildDraft, and clearChildDraft", async () => {
    await saveChildDraft(db, "child-3", "practice", { index: 5 });
    const loaded = await loadChildDraft<{ index: number }>(db, "child-3", "practice");
    expect(loaded).toEqual({ index: 5 });

    await clearChildDraft(db, "child-3", "practice");
    const afterClear = await loadChildDraft(db, "child-3", "practice");
    expect(afterClear).toBeNull();
  });
});
