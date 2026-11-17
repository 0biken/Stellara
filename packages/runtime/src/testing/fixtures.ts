import { seededRng } from "../util.js";

import { MemoryStore } from "./memory-store.js";

import type { ChildRecord, Clock, Ids, RuntimeDeps } from "../ports.js";
import type { PublishedItem } from "@stellara/content-schema/server";

/** Deterministic UUID-shaped ids: prefix nibble plus a counter. */
export function uuidFrom(prefix: number, n: number): string {
  const hex = n.toString(16).padStart(12, "0");
  return `${prefix.toString(16).padStart(8, "0")}-0000-4000-8000-${hex}`;
}

export function sequentialIds(prefix = 0xa): Ids {
  let n = 0;
  return { uuid: () => uuidFrom(prefix, ++n) };
}

export class ManualClock implements Clock {
  constructor(public at: number) {}
  now() {
    return this.at;
  }
  advance(ms: number) {
    this.at += ms;
  }
}

export const REVIEWER = uuidFrom(0xe, 1);
export const AUTHOR = uuidFrom(0xe, 2);

/** A published single-choice item; answer is option "a". */
export function singleChoiceItem(
  id: string,
  topicId: string,
  overrides: Partial<PublishedItem> = {},
): PublishedItem {
  return {
    id,
    version: 1,
    topic_id: topicId,
    type: "single_choice",
    stem: "Which is right?",
    stimulus_id: null,
    explanation: "Because a is right.",
    hint: "Think about a.",
    difficulty: "standard",
    tags: [],
    curriculum_edition: "revised_2025",
    media: [],
    exposure_count: 0,
    provenance: "original",
    author_id: AUTHOR,
    reviewer_id: REVIEWER,
    answer_verified_at: "2026-11-01T00:00:00Z",
    status: "published",
    options: [
      { id: "a", text: "A" },
      { id: "b", text: "B" },
    ],
    answer: { option_id: "a" },
    ...overrides,
  } as PublishedItem;
}

export function topicItems(
  topicId: string,
  count: number,
  prefix: number,
  overrides: (i: number) => Partial<PublishedItem> = () => ({}),
): PublishedItem[] {
  return Array.from({ length: count }, (_, i) =>
    singleChoiceItem(uuidFrom(prefix, i + 1), topicId, overrides(i)),
  );
}

export function child(id: string, overrides: Partial<ChildRecord> = {}): ChildRecord {
  return {
    id,
    timezone: "Africa/Lagos",
    exam_date: null,
    status: "active",
    term_id: "2026-T1",
    last_active_at: null,
    ...overrides,
  };
}

export function memoryDeps(at: number, seed = 7) {
  const store = new MemoryStore();
  const clock = new ManualClock(at);
  const deps: RuntimeDeps = { store, clock, ids: sequentialIds(), rng: seededRng(seed) };
  return { store, clock, deps };
}
