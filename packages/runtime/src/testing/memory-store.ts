import type {
  ActivityDay,
  AttemptRecord,
  ChildRecord,
  ConsentEvidenceRecord,
  DataRequestServerRecord,
  ItemStats,
  LedgerRow,
  MasteryEventRecord,
  RuntimeStore,
  SetKind,
  SetRecord,
} from "../ports.js";
import type { DraftLesson, PublishedItem, PublishedLesson } from "@stellara/content-schema/server";
import type {
  MasteryState,
  ReviewDueTopic,
  StardustState,
  StreakOutage,
  StreakState,
} from "@stellara/rules";

interface Tables {
  children: Map<string, ChildRecord>;
  items: Map<string, PublishedItem>;
  lessons: Map<string, PublishedLesson | DraftLesson>;
  strands: Map<string, string>;
  sets: Map<string, SetRecord>;
  attempts: AttemptRecord[];
  mastery: Map<string, MasteryState>;
  masteryEvents: MasteryEventRecord[];
  stardust: Map<string, StardustState>;
  ledger: LedgerRow[];
  activity: Map<string, ActivityDay>;
  streaks: Map<string, StreakState>;
  reviews: Map<string, readonly ReviewDueTopic[]>;
  dueQueue: Map<string, readonly ReviewDueTopic[]>;
  outages: StreakOutage[];
  itemStats: Map<string, ItemStats>;
  exposedKeys: Set<string>;
  consents: Map<string, ConsentEvidenceRecord>;
  revokedAt: Map<string, number>;
  dataRequests: Map<string, DataRequestServerRecord>;
}

const empty = (): Tables => ({
  children: new Map(),
  items: new Map(),
  lessons: new Map(),
  strands: new Map(),
  sets: new Map(),
  attempts: [],
  mastery: new Map(),
  masteryEvents: [],
  stardust: new Map(),
  ledger: [],
  activity: new Map(),
  streaks: new Map(),
  reviews: new Map(),
  dueQueue: new Map(),
  outages: [],
  itemStats: new Map(),
  exposedKeys: new Set(),
  consents: new Map(),
  revokedAt: new Map(),
  dataRequests: new Map(),
});

const key = (...parts: (string | number)[]) => parts.join("|");

/**
 * Reference `RuntimeStore` for tests and local demos. `transaction` snapshots every
 * table and restores it if the callback throws, matching a database rollback.
 */
export class MemoryStore implements RuntimeStore {
  t: Tables = empty();
  /** Test hook: throw inside a write to prove rollback. */
  failOn: keyof RuntimeStore | null = null;

  private check(op: keyof RuntimeStore) {
    if (this.failOn === op) throw new Error(`Injected failure in ${op}`);
  }

  // Seeding helpers.
  addChild(child: ChildRecord) {
    this.t.children.set(child.id, child);
  }
  addItems(items: readonly PublishedItem[]) {
    for (const item of items) this.t.items.set(key(item.id, item.version), item);
  }
  addStrand(topicId: string, strandId: string) {
    this.t.strands.set(topicId, strandId);
  }
  addOutage(outage: StreakOutage) {
    this.t.outages.push(outage);
  }

  async transaction<T>(fn: () => Promise<T>): Promise<T> {
    const snapshot = structuredClone(this.t);
    try {
      return await fn();
    } catch (error) {
      this.t = snapshot;
      throw error;
    }
  }

  async getChild(childId: string) {
    return this.t.children.get(childId) ?? null;
  }
  async listActiveChildren() {
    return [...this.t.children.values()].filter((c) => c.status === "active");
  }
  async publishedItems(topicIds: readonly string[]) {
    const latest = new Map<string, PublishedItem>();
    for (const item of this.t.items.values())
      if (topicIds.includes(item.topic_id) && (latest.get(item.id)?.version ?? 0) < item.version)
        latest.set(item.id, item);
    return [...latest.values()].sort((a, b) => (a.id < b.id ? -1 : 1));
  }
  async getItem(itemId: string, version: number) {
    return this.t.items.get(key(itemId, version)) ?? null;
  }
  async getPublishedLesson(topicId: string): Promise<PublishedLesson | null> {
    for (const lesson of this.t.lessons.values()) {
      if (lesson.topic_id === topicId && lesson.status === "published") {
        return lesson as PublishedLesson;
      }
    }
    return null;
  }
  async putLesson(lesson: PublishedLesson | DraftLesson): Promise<void> {
    this.check("putLesson");
    this.t.lessons.set(lesson.id, lesson);
  }
  async topicStrands(topicIds: readonly string[]) {
    return topicIds
      .filter((t) => this.t.strands.has(t))
      .map((topic_id) => ({ topic_id, strand_id: this.t.strands.get(topic_id)! }));
  }

  async insertSet(set: SetRecord) {
    this.check("insertSet");
    this.t.sets.set(set.id, set);
  }
  async getSet(setId: string) {
    return this.t.sets.get(setId) ?? null;
  }
  async updateSet(set: SetRecord) {
    this.t.sets.set(set.id, set);
  }
  async listChildSets(childId: string, kind?: SetKind) {
    const sets = [...this.t.sets.values()].filter((s) => s.child_id === childId);
    return kind ? sets.filter((s) => s.kind === kind) : sets;
  }

  async findAttempts(clientIds: readonly string[]) {
    return this.t.attempts.filter((a) => clientIds.includes(a.client_id));
  }
  async setAttempts(setId: string) {
    return this.t.attempts.filter((a) => a.set_id === setId);
  }
  async insertAttempts(attempts: readonly AttemptRecord[]) {
    this.check("insertAttempts");
    for (const a of attempts)
      if (this.t.attempts.some((x) => x.client_id === a.client_id))
        throw new Error("attempts.client_id must be unique");
    this.t.attempts.push(...attempts);
  }
  async attemptsReceivedBetween(start: number, end: number) {
    return this.t.attempts.filter((a) => a.received_at >= start && a.received_at < end);
  }

  async getMastery(childId: string, topicId: string) {
    return this.t.mastery.get(key(childId, topicId)) ?? null;
  }
  async putMastery(childId: string, state: MasteryState) {
    this.t.mastery.set(key(childId, state.topicId), state);
  }
  async insertMasteryEvents(events: readonly MasteryEventRecord[]) {
    this.t.masteryEvents.push(...events);
  }

  async getStardust(childId: string) {
    return this.t.stardust.get(childId) ?? null;
  }
  async putStardust(childId: string, state: StardustState) {
    this.check("putStardust");
    this.t.stardust.set(childId, state);
  }
  async appendLedger(rows: readonly LedgerRow[]) {
    this.t.ledger.push(...rows);
  }
  async ledgerByRefs(childId: string, refIds: readonly string[]) {
    return this.t.ledger.filter((r) => r.child_id === childId && refIds.includes(r.ref_id));
  }

  async getActivityDay(childId: string, day: string) {
    return this.t.activity.get(key(childId, day)) ?? null;
  }
  async putActivityDay(day: ActivityDay) {
    this.t.activity.set(key(day.child_id, day.learning_day), day);
  }

  async getStreak(childId: string) {
    return this.t.streaks.get(childId) ?? null;
  }
  async putStreak(childId: string, state: StreakState) {
    this.t.streaks.set(childId, state);
  }

  async listReviews(childId: string) {
    return this.t.reviews.get(childId) ?? [];
  }
  async putReviews(childId: string, reviews: readonly ReviewDueTopic[]) {
    this.t.reviews.set(childId, reviews);
  }
  async putDueQueue(childId: string, due: readonly ReviewDueTopic[]) {
    this.t.dueQueue.set(childId, due);
  }

  async outagesBetween(start: number, end: number) {
    return this.t.outages.filter((o) => o.end > start && o.start < end);
  }

  async getItemStats(itemId: string) {
    return this.t.itemStats.get(itemId) ?? null;
  }
  async putItemStats(stats: ItemStats) {
    this.t.itemStats.set(stats.item_id, stats);
  }
  async recordKeyExposure(childId: string, itemIds: readonly string[]) {
    for (const itemId of itemIds) {
      this.t.exposedKeys.add(key(childId, itemId));
    }
  }
  async isKeyExposed(childId: string, itemId: string) {
    return this.t.exposedKeys.has(key(childId, itemId));
  }
  async updateChild(child: ChildRecord) {
    this.t.children.set(child.id, child);
  }
  async revokeChildAccess(childId: string, at: number) {
    const prev = this.t.revokedAt.get(childId) ?? 0;
    this.t.revokedAt.set(childId, Math.max(prev, at));
    const child = this.t.children.get(childId);
    if (child) {
      this.t.children.set(childId, { ...child, revoked_before: Math.max(prev, at) });
    }
  }
  async isChildAccessRevoked(childId: string, issuedAt: number) {
    const revokedBefore = this.t.revokedAt.get(childId);
    if (revokedBefore !== undefined && issuedAt < revokedBefore) return true;
    const child = this.t.children.get(childId);
    if (!child || child.status !== "active" || child.consent_withdrawn_at) return true;
    return false;
  }
  async getActiveConsent(guardianId: string, childId?: string) {
    const matching = [...this.t.consents.values()]
      .filter(
        (c) =>
          c.guardian_id === guardianId &&
          c.withdrawn_at === null &&
          (childId === undefined || c.child_id === childId || c.child_id === null),
      )
      .sort((a, b) => b.given_at - a.given_at);
    return matching[0] ?? null;
  }
  async putConsent(consent: ConsentEvidenceRecord) {
    this.t.consents.set(consent.id, consent);
  }
  async listConsents() {
    return [...this.t.consents.values()];
  }
  async deleteConsent(consentId: string) {
    this.t.consents.delete(consentId);
  }
  async putDataRequest(request: DataRequestServerRecord) {
    this.t.dataRequests.set(request.id, request);
  }
  async getDataRequest(requestId: string) {
    return this.t.dataRequests.get(requestId) ?? null;
  }
  async listDataRequests(childId?: string) {
    const all = [...this.t.dataRequests.values()];
    return childId ? all.filter((r) => r.child_id === childId) : all;
  }
  async deleteChildLearningRecords(childId: string) {
    // Restricted deletion across shared partitions/tables: deletes only this child's rows.
    this.t.attempts = this.t.attempts.filter((a) => a.child_id !== childId);
    for (const k of [...this.t.mastery.keys()]) {
      if (k.startsWith(`${childId}|`)) this.t.mastery.delete(k);
    }
    this.t.masteryEvents = this.t.masteryEvents.filter((e) => e.child_id !== childId);
    this.t.stardust.delete(childId);
    this.t.ledger = this.t.ledger.filter((l) => l.child_id !== childId);
    for (const [id, s] of [...this.t.sets.entries()]) {
      if (s.child_id === childId) this.t.sets.delete(id);
    }
    for (const k of [...this.t.activity.keys()]) {
      if (k.startsWith(`${childId}|`)) this.t.activity.delete(k);
    }
    this.t.streaks.delete(childId);
    this.t.reviews.delete(childId);
    this.t.dueQueue.delete(childId);
    for (const k of [...this.t.exposedKeys.values()]) {
      if (k.startsWith(`${childId}|`)) this.t.exposedKeys.delete(k);
    }
    this.t.children.delete(childId);
  }
}
