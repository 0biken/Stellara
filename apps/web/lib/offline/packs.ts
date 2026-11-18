import type { DownloadedPackRecord, StellaraOfflineDB } from "./db";

export const MAX_PACK_BYTES = 120 * 1024; // 120 KB
export const MAX_PACKS_PER_CHILD = 3;
export const MAX_DEVICE_BYTES = 25 * 1024 * 1024; // 25 MB

export class PackBudgetError extends Error {
  constructor(
    readonly code: "PACK_TOO_LARGE" | "PACK_LIMIT_LOCKED" | "DEVICE_QUOTA_EXCEEDED",
    message: string,
  ) {
    super(message);
    this.name = "PackBudgetError";
  }
}

function packSetIds(pack: DownloadedPackRecord): string[] {
  const manifest = pack.manifest as { set_ids?: unknown } | null | undefined;
  return Array.isArray(manifest?.set_ids)
    ? manifest.set_ids.filter((id): id is string => typeof id === "string")
    : [];
}

function estimateLessonBytes(lesson: unknown): number {
  try {
    return new TextEncoder().encode(JSON.stringify(lesson)).byteLength;
  } catch {
    return 0;
  }
}

export async function storeDownloadedPack(
  db: StellaraOfflineDB,
  pack: DownloadedPackRecord,
): Promise<void> {
  if (pack.size_bytes > MAX_PACK_BYTES) {
    throw new PackBudgetError(
      "PACK_TOO_LARGE",
      `Pack ${pack.id} (${pack.size_bytes} B) exceeds 120 KB budget`,
    );
  }

  await db.transaction(
    "rw",
    db.downloaded_packs,
    db.outbox,
    db.child_drafts,
    db.cached_lessons,
    async () => {
      const pendingOutbox = await db.outbox
        .where("status")
        .anyOf(["pending", "sending", "actionable_error"])
        .toArray();
      const pinnedSetIds = new Set<string>(pendingOutbox.map((e) => e.answer.set_id));

      const allDrafts = await db.child_drafts.toArray();
      for (const draft of allDrafts) {
        const data = draft.data as { set?: { set_id?: string } } | null | undefined;
        if (typeof data?.set?.set_id === "string") {
          pinnedSetIds.add(data.set.set_id);
        }
      }

      const isPinned = (p: DownloadedPackRecord) =>
        packSetIds(p).some((setId) => pinnedSetIds.has(setId));

      let allPacks = await db.downloaded_packs.toArray();
      // Remove existing copy of same pack id if re-downloading
      allPacks = allPacks.filter((p) => p.id !== pack.id);

      let childPacks = allPacks
        .filter((p) => p.child_id === pack.child_id)
        .sort((a, b) => a.last_accessed_at - b.last_accessed_at);

      while (childPacks.length >= MAX_PACKS_PER_CHILD) {
        const candidate = childPacks.find((p) => !isPinned(p));
        if (!candidate) {
          throw new PackBudgetError(
            "PACK_LIMIT_LOCKED",
            "All 3 downloaded packs have pending unsynced work.",
          );
        }
        await db.downloaded_packs.delete(candidate.id);
        childPacks = childPacks.filter((p) => p.id !== candidate.id);
        allPacks = allPacks.filter((p) => p.id !== candidate.id);
      }

      const cachedLessons = await db.cached_lessons.toArray();
      const lessonBytes = cachedLessons.reduce((sum, l) => sum + estimateLessonBytes(l.lesson), 0);
      let packBytes = allPacks.reduce((sum, p) => sum + p.size_bytes, 0);

      const evictableDevicePacks = [...allPacks].sort(
        (a, b) => a.last_accessed_at - b.last_accessed_at,
      );

      while (lessonBytes + packBytes + pack.size_bytes > MAX_DEVICE_BYTES) {
        const candidate = evictableDevicePacks.find((p) => !isPinned(p));
        if (!candidate) {
          throw new PackBudgetError(
            "DEVICE_QUOTA_EXCEEDED",
            "Device 25 MB offline storage budget is full.",
          );
        }
        await db.downloaded_packs.delete(candidate.id);
        packBytes -= candidate.size_bytes;
        const idx = evictableDevicePacks.indexOf(candidate);
        if (idx >= 0) evictableDevicePacks.splice(idx, 1);
      }

      await db.downloaded_packs.put(pack);
    },
  );
}
