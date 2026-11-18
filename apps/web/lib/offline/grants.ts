import type { OfflineGrantRecord, StellaraOfflineDB } from "./db";

export const OFFLINE_GRANT_MAX_MS = 72 * 60 * 60 * 1000; // 72 hours

export interface IssueOfflineGrantInput {
  childId: string;
  profile: unknown;
  sessionExpiresAt: number;
  signature: string;
  now?: number;
}

export interface OfflineAccessCheck {
  allowed: boolean;
  reason?: "NO_GRANT" | "NOT_LAST_CHILD" | "EXPIRED";
  grant?: OfflineGrantRecord;
}

export async function issueOfflineGrant(
  db: StellaraOfflineDB,
  input: IssueOfflineGrantInput,
): Promise<OfflineGrantRecord> {
  const now = input.now ?? Date.now();
  const expiresAt = Math.min(now + OFFLINE_GRANT_MAX_MS, input.sessionExpiresAt);
  const record: OfflineGrantRecord = {
    child_id: input.childId,
    granted_at: now,
    expires_at: expiresAt,
    signature: input.signature,
    profile: input.profile,
  };

  await db.transaction("rw", db.offline_grants, async () => {
    await db.offline_grants.clear();
    await db.offline_grants.put(record);
  });

  return record;
}

export async function checkOfflineAccess(
  db: StellaraOfflineDB,
  childId: string,
  now = Date.now(),
): Promise<OfflineAccessCheck> {
  const grants = await db.offline_grants.toArray();
  if (grants.length === 0) {
    return { allowed: false, reason: "NO_GRANT" };
  }
  const match = grants.find((g) => g.child_id === childId);
  if (!match) {
    return { allowed: false, reason: "NOT_LAST_CHILD" };
  }
  if (now >= match.expires_at) {
    return { allowed: false, reason: "EXPIRED", grant: match };
  }
  return { allowed: true, grant: match };
}

export function canSyncOutbox(
  tabSession: { childId: string; accessToken: string } | null | undefined,
): boolean {
  return Boolean(tabSession && tabSession.childId && tabSession.accessToken);
}

export async function logoutChildOffline(db: StellaraOfflineDB, childId: string): Promise<void> {
  await db.transaction(
    "rw",
    db.offline_grants,
    db.downloaded_packs,
    db.cached_lessons,
    async () => {
      await db.offline_grants.delete(childId);
      await db.downloaded_packs.where("child_id").equals(childId).delete();
      await db.cached_lessons.where("child_id").equals(childId).delete();
    },
  );
}

export async function purgeChildLocalData(db: StellaraOfflineDB, childId: string): Promise<void> {
  await db.transaction(
    "rw",
    [
      db.offline_grants,
      db.downloaded_packs,
      db.cached_lessons,
      db.child_drafts,
      db.outbox,
      db.confirmed_progress,
    ],
    async () => {
      await db.offline_grants.delete(childId);
      await db.downloaded_packs.where("child_id").equals(childId).delete();
      await db.cached_lessons.where("child_id").equals(childId).delete();
      await db.child_drafts.where("child_id").equals(childId).delete();
      await db.outbox.where("child_id").equals(childId).delete();
      await db.confirmed_progress.where("child_id").equals(childId).delete();
    },
  );
}
