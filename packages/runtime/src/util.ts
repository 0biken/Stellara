import { masteryCodes, type MasteryCode } from "./contracts.js";

import type { Rng } from "./ports.js";
import type { PublishedItem } from "@stellara/content-schema/server";
import type { MasteryState } from "@stellara/rules";

/** Deterministic mulberry32 generator for tests and reproducible assembly. */
export function seededRng(seed: number): Rng {
  let a = seed >>> 0;
  return {
    next() {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
  };
}

export function shuffle<T>(values: readonly T[], rng: Rng): T[] {
  const out = [...values];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

/** Takes from each group in turn until `count` values are taken or all groups are empty. */
export function roundRobin<T>(groups: readonly (readonly T[])[], count: number): T[] {
  const queues = groups.map((g) => [...g]);
  const out: T[] = [];
  while (out.length < count && queues.some((q) => q.length > 0)) {
    for (const queue of queues) {
      const next = queue.shift();
      if (next !== undefined && out.length < count) out.push(next);
    }
  }
  return out;
}

export const masteryCode = (level: number): MasteryCode => masteryCodes[level] ?? "not_assessed";

/** Item tags carry the rule flags: `application` (02 §3.1 Level 4) and `quick` (02 §2). */
export const isApplication = (item: Pick<PublishedItem, "tags">) =>
  item.tags.includes("application");
export const isQuick = (item: Pick<PublishedItem, "tags">) => item.tags.includes("quick");

export const DAY_MS = 86_400_000;

/** Every item the mastery states say the child answered within the last 30 days. */
export function recentlySeen(states: readonly (MasteryState | null)[], now: number): Set<string> {
  const seen = new Set<string>();
  for (const state of states)
    for (const attempt of state?.priorAttempts ?? [])
      if (now - attempt.answeredAt < 30 * DAY_MS) seen.add(attempt.itemId);
  return seen;
}
