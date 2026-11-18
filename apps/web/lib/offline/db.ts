import Dexie, { type EntityTable, type Table } from "dexie";
import type { SubmittedAnswer } from "../learning/types";

export interface ChildDraftRecord {
  child_id: string;
  kind: string;
  data: unknown;
  updated_at: number;
}

export interface OutboxRecord {
  id: string;
  child_id: string;
  client_id: string;
  answer: SubmittedAnswer;
  status: "pending" | "sending" | "sent" | "actionable_error";
  attempts: number;
  next_retry_at: number;
  created_at: number;
  error?: string;
}

export interface DownloadedPackRecord {
  id: string;
  child_id: string;
  topic_id: string;
  created_at: number;
  size_bytes: number;
  manifest: unknown;
  pack_data: unknown;
  last_accessed_at: number;
}

export interface CachedLessonRecord {
  topic_id: string;
  version: number;
  child_id: string;
  lesson: unknown;
  updated_at: number;
}

export interface OfflineGrantRecord {
  child_id: string;
  granted_at: number;
  expires_at: number;
  signature: string;
  profile: unknown;
}

export interface WorkerLeaseRecord {
  key: string;
  holder_id: string;
  expires_at: number;
}

export interface ConfirmedProgressRecord {
  child_id: string;
  topic_id: string;
  level: string;
  stardust_today: number;
  updated_at: number;
}

export class StellaraOfflineDB extends Dexie {
  child_drafts!: Table<ChildDraftRecord, [string, string]>;
  outbox!: EntityTable<OutboxRecord, "id">;
  downloaded_packs!: EntityTable<DownloadedPackRecord, "id">;
  cached_lessons!: Table<CachedLessonRecord, [string, number]>;
  offline_grants!: EntityTable<OfflineGrantRecord, "child_id">;
  worker_leases!: EntityTable<WorkerLeaseRecord, "key">;
  confirmed_progress!: Table<ConfirmedProgressRecord, [string, string]>;

  constructor(dbName = "stellara_offline") {
    super(dbName);
    this.version(1).stores({
      child_drafts: "[child_id+kind], child_id, kind, updated_at",
      outbox: "id, child_id, status, attempts, next_retry_at, created_at",
      downloaded_packs: "id, child_id, topic_id, created_at, size_bytes, last_accessed_at",
      cached_lessons: "[topic_id+version], child_id, topic_id, version, updated_at",
      offline_grants: "child_id, granted_at, expires_at",
      worker_leases: "key, holder_id, expires_at",
      confirmed_progress: "[child_id+topic_id], child_id, topic_id, updated_at",
    });
  }
}

export function createOfflineDb(dbName = "stellara_offline"): StellaraOfflineDB {
  return new StellaraOfflineDB(dbName);
}

let defaultDb: StellaraOfflineDB | null = null;
export function getOfflineDb(): StellaraOfflineDB {
  if (!defaultDb) {
    defaultDb = createOfflineDb();
  }
  return defaultDb;
}

export async function migrateLocalStorageDrafts(
  db: StellaraOfflineDB,
  storage?: Storage,
): Promise<number> {
  const store = storage ?? (typeof window !== "undefined" ? window.localStorage : undefined);
  if (!store) return 0;

  const prefix = "stellara.draft.";
  const candidates: { key: string; child_id: string; kind: string; data: unknown }[] = [];

  for (let i = 0; i < store.length; i++) {
    const key = store.key(i);
    if (!key || !key.startsWith(prefix)) continue;

    const parts = key.slice(prefix.length).split(".");
    if (parts.length < 2) continue;
    const child_id = parts[0]!;
    const kind = parts.slice(1).join(".");

    const raw = store.getItem(key);
    if (!raw) continue;
    try {
      const data = JSON.parse(raw);
      candidates.push({ key, child_id, kind, data });
    } catch {
      // Ignore corrupt keys, leave them in localStorage
    }
  }

  if (candidates.length === 0) return 0;

  // Transactionally insert into child_drafts
  await db.transaction("rw", db.child_drafts, async () => {
    const now = Date.now();
    for (const c of candidates) {
      await db.child_drafts.put({
        child_id: c.child_id,
        kind: c.kind,
        data: c.data,
        updated_at: now,
      });
    }
  });

  // Only remove from localStorage once transaction has committed successfully
  for (const c of candidates) {
    store.removeItem(c.key);
  }

  return candidates.length;
}

export async function saveChildDraft(
  db: StellaraOfflineDB,
  childId: string,
  kind: string,
  data: unknown,
): Promise<void> {
  await db.child_drafts.put({
    child_id: childId,
    kind,
    data,
    updated_at: Date.now(),
  });
}

export async function loadChildDraft<T>(
  db: StellaraOfflineDB,
  childId: string,
  kind: string,
): Promise<T | null> {
  const record = await db.child_drafts.get([childId, kind]);
  return record ? (record.data as T) : null;
}

export async function clearChildDraft(
  db: StellaraOfflineDB,
  childId: string,
  kind: string,
): Promise<void> {
  await db.child_drafts.delete([childId, kind]);
}
