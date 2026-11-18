import type { DraftLesson, PublishedItem, PublishedLesson } from "@stellara/content-schema/server";
import type {
  MasteryState,
  ReviewDueTopic,
  ScoringConfidence,
  ScoringReason,
  StardustState,
  StreakOutage,
  StreakState,
} from "@stellara/rules";

/** UTC epoch milliseconds. The runtime never reads the ambient clock. */
export interface Clock {
  now(): number;
}
export interface Ids {
  uuid(): string;
}
/** Returns a float in [0, 1). Seeded in tests so set assembly is deterministic. */
export interface Rng {
  next(): number;
}

export type SetKind = "practice" | "review" | "topic_assessment" | "placement";

export interface ChildRecord {
  readonly id: string;
  readonly timezone: string;
  /** Calendar day `YYYY-MM-DD`, or null when no exam date is known. */
  readonly exam_date: string | null;
  readonly status: "active" | "paused" | "deletion_pending";
  readonly term_id: string;
  /** Last activity instant, used by the retention purge plan. */
  readonly last_active_at: number | null;
}

/** Identity resolved from a verified child JWT by the adapter. */
export interface ChildContext {
  readonly child_id: string;
  /** "Practice with a grown-up" mode: stored as practice, never scored. */
  readonly grownup?: boolean;
}

export interface SetItemRef {
  readonly item_id: string;
  readonly version: number;
  readonly topic_id: string;
}

export interface PlacementStrandResult {
  readonly strand_id: string;
  readonly correct: number;
  readonly answered: number;
  readonly label: "looks_secure_so_far" | "check_this" | "not_yet_measured_enough";
}

export interface SetRecord {
  readonly id: string;
  readonly child_id: string;
  readonly kind: SetKind;
  readonly topic_ids: readonly string[];
  /** Review sets only: the due topics pulled into this set. */
  readonly review_topic_ids: readonly string[];
  readonly assignment_id: string | null;
  readonly items: readonly SetItemRef[];
  readonly started_at: number;
  readonly finished_at: number | null;
  readonly placement: readonly PlacementStrandResult[] | null;
  readonly rules_version: string;
}

/** Append-only. Mirrors `attempts` in docs/md/05 plus the derived scoring reason. */
export interface AttemptRecord {
  readonly id: string;
  readonly client_id: string;
  readonly child_id: string;
  readonly set_id: string;
  readonly item_id: string;
  readonly item_version: number;
  readonly topic_id: string;
  readonly response: Readonly<Record<string, unknown>>;
  readonly is_correct: boolean;
  readonly scored: boolean;
  readonly confidence: ScoringConfidence | null;
  readonly reason: ScoringReason;
  readonly hint_shown: boolean;
  readonly response_ms: number;
  readonly recorded_at: number;
  readonly received_at: number;
  /** The instant credited to the response after the clock-trust rule. */
  readonly answered_at: number;
  readonly learning_day: string;
  readonly key_on_device: boolean;
  readonly rules_version: string;
}

export interface MasteryEventRecord {
  readonly id: string;
  readonly child_id: string;
  readonly topic_id: string;
  readonly from_level: number;
  readonly to_level: number;
  readonly cause: string;
  readonly attempt_id: string | null;
  readonly created_at: number;
}

export interface LedgerRow {
  readonly id: string;
  readonly child_id: string;
  readonly event: "response" | "review" | "test" | "level";
  readonly amount: number;
  readonly learning_day: string;
  readonly ref_id: string;
  readonly created_at: number;
}

export type CreditedBy = "activity" | "cloud" | "rest" | "outage" | "repair";
export interface ActivityDay {
  readonly child_id: string;
  readonly learning_day: string;
  readonly scored_count: number;
  readonly review_sets_done: number;
  readonly qualifying: boolean;
  readonly credited_by: CreditedBy | null;
}

export interface ItemStats {
  readonly item_id: string;
  readonly exposure_count: number;
  readonly correct_count: number;
  readonly p_correct: number;
  readonly updated_at: number;
}

/**
 * Storage port. The Postgres adapter (after 2A) implements this with the
 * service role inside an Edge Function; `transaction` maps to one database
 * transaction, and a thrown error must leave no partial writes.
 */
export interface RuntimeStore {
  transaction<T>(fn: () => Promise<T>): Promise<T>;

  getChild(childId: string): Promise<ChildRecord | null>;
  listActiveChildren(): Promise<readonly ChildRecord[]>;

  /** Current published version of every item in these topics. Includes keys: server only. */
  publishedItems(topicIds: readonly string[]): Promise<readonly PublishedItem[]>;
  getItem(itemId: string, version: number): Promise<PublishedItem | null>;
  getPublishedLesson(topicId: string): Promise<PublishedLesson | null>;
  putLesson(lesson: PublishedLesson | DraftLesson): Promise<void>;
  topicStrands(
    topicIds: readonly string[],
  ): Promise<readonly { topic_id: string; strand_id: string }[]>;

  insertSet(set: SetRecord): Promise<void>;
  getSet(setId: string): Promise<SetRecord | null>;
  updateSet(set: SetRecord): Promise<void>;

  findAttempts(clientIds: readonly string[]): Promise<readonly AttemptRecord[]>;
  setAttempts(setId: string): Promise<readonly AttemptRecord[]>;
  insertAttempts(attempts: readonly AttemptRecord[]): Promise<void>;
  attemptsReceivedBetween(start: number, end: number): Promise<readonly AttemptRecord[]>;

  getMastery(childId: string, topicId: string): Promise<MasteryState | null>;
  putMastery(childId: string, state: MasteryState): Promise<void>;
  insertMasteryEvents(events: readonly MasteryEventRecord[]): Promise<void>;

  getStardust(childId: string): Promise<StardustState | null>;
  putStardust(childId: string, state: StardustState): Promise<void>;
  appendLedger(rows: readonly LedgerRow[]): Promise<void>;
  ledgerByRefs(childId: string, refIds: readonly string[]): Promise<readonly LedgerRow[]>;

  getActivityDay(childId: string, day: string): Promise<ActivityDay | null>;
  putActivityDay(day: ActivityDay): Promise<void>;

  getStreak(childId: string): Promise<StreakState | null>;
  putStreak(childId: string, state: StreakState): Promise<void>;

  listReviews(childId: string): Promise<readonly ReviewDueTopic[]>;
  putReviews(childId: string, reviews: readonly ReviewDueTopic[]): Promise<void>;
  putDueQueue(childId: string, due: readonly ReviewDueTopic[]): Promise<void>;

  outagesBetween(start: number, end: number): Promise<readonly StreakOutage[]>;

  getItemStats(itemId: string): Promise<ItemStats | null>;
  putItemStats(stats: ItemStats): Promise<void>;
}

export interface RuntimeDeps {
  readonly store: RuntimeStore;
  readonly clock: Clock;
  readonly ids: Ids;
  readonly rng: Rng;
}
