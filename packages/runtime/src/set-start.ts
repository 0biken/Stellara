import { projectItemForClient } from "@stellara/content-schema/client";
import { learningDay, rules_version, selectDueTopics } from "@stellara/rules";

import {
  parseRequest,
  RuntimeError,
  setStartRequestSchema,
  type SetStartResponse,
} from "./contracts.js";
import { recentlySeen, roundRobin, shuffle } from "./util.js";

import type { ChildContext, ChildRecord, RuntimeDeps, SetKind, SetRecord } from "./ports.js";
import type { PublishedItem } from "@stellara/content-schema/server";

/** Item counts from docs/md/02 §5. */
export const SET_SIZES = {
  practice: { min: 8, target: 10 },
  review: { min: 3, target: 10, perTopic: 5, maxTopics: 3 },
  topic_assessment: { min: 10, target: 10 },
  placement: { min: 20, target: 20 },
} as const;

export async function loadActiveChild(deps: RuntimeDeps, ctx: ChildContext): Promise<ChildRecord> {
  const child = await deps.store.getChild(ctx.child_id);
  if (!child) throw new RuntimeError("CHILD_NOT_FOUND");
  if (child.status !== "active") throw new RuntimeError("CHILD_INACTIVE");
  return child;
}

/** Unseen items first (so answers can be scored), difficulty interleaved, order seeded. */
function orderForTopic(
  items: readonly PublishedItem[],
  seen: ReadonlySet<string>,
  deps: RuntimeDeps,
): PublishedItem[] {
  const byDifficulty = (pool: readonly PublishedItem[]) =>
    roundRobin(
      (["standard", "easy", "hard"] as const).map((d) =>
        shuffle(
          pool.filter((i) => i.difficulty === d),
          deps.rng,
        ),
      ),
      pool.length,
    );
  return [
    ...byDifficulty(items.filter((i) => !seen.has(i.id))),
    ...byDifficulty(items.filter((i) => seen.has(i.id))),
  ];
}

function groupBy<T>(values: readonly T[], key: (value: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const value of values) map.set(key(value), [...(map.get(key(value)) ?? []), value]);
  return map;
}

/** `set-start`: assembles a set and returns it without keys, explanations or hint bodies. */
export async function startSet(
  deps: RuntimeDeps,
  ctx: ChildContext,
  input: unknown,
): Promise<SetStartResponse> {
  if ((input as { kind?: unknown } | null)?.kind === "practice_test")
    throw new RuntimeError("KIND_NOT_SUPPORTED");
  const request = parseRequest(setStartRequestSchema, input);
  const child = await loadActiveChild(deps, ctx);
  const now = deps.clock.now();
  const kind: SetKind = request.kind;
  const topicIds = [...new Set(request.topic_ids)];

  if ((kind === "practice" || kind === "placement") && topicIds.length === 0)
    throw new RuntimeError("INVALID_REQUEST", "topic_ids is required");
  if (kind === "topic_assessment" && topicIds.length !== 1)
    throw new RuntimeError("INVALID_REQUEST", "A topic assessment covers exactly one topic");

  let reviewTopicIds: string[] = [];
  if (kind === "review") {
    const today = learningDay(now, child.timezone);
    const due = selectDueTopics(await deps.store.listReviews(child.id), today);
    reviewTopicIds = due.slice(0, SET_SIZES.review.maxTopics).map((d) => d.topicId);
    if (reviewTopicIds.length === 0) throw new RuntimeError("NO_REVIEWS_DUE");
  }
  const sourceTopics = kind === "review" ? reviewTopicIds : topicIds;
  const pool = await deps.store.publishedItems(sourceTopics);
  const states = await Promise.all(sourceTopics.map((t) => deps.store.getMastery(child.id, t)));
  const seen = recentlySeen(states, now);
  const byTopic = groupBy(pool, (i) => i.topic_id);
  const ordered = (topics: readonly string[]) =>
    topics.map((t) => orderForTopic(byTopic.get(t) ?? [], seen, deps));

  let chosen: PublishedItem[];
  switch (kind) {
    case "practice":
      chosen = roundRobin(ordered(topicIds), SET_SIZES.practice.target);
      break;
    case "topic_assessment":
      chosen = roundRobin(ordered(topicIds), SET_SIZES.topic_assessment.target);
      break;
    case "review":
      chosen = roundRobin(
        ordered(reviewTopicIds).map((items) => items.slice(0, SET_SIZES.review.perTopic)),
        SET_SIZES.review.target,
      );
      break;
    case "placement": {
      const strands = groupBy(await deps.store.topicStrands(topicIds), (s) => s.strand_id);
      const strandGroups = [...strands.keys()]
        .sort()
        .map((strand) =>
          roundRobin(
            ordered(strands.get(strand)!.map((s) => s.topic_id)),
            Number.POSITIVE_INFINITY,
          ),
        );
      chosen = roundRobin(strandGroups, SET_SIZES.placement.target);
      break;
    }
  }
  if (chosen.length < SET_SIZES[kind].min)
    throw new RuntimeError("NO_ITEMS_AVAILABLE", { available: chosen.length });

  const set: SetRecord = {
    id: deps.ids.uuid(),
    child_id: child.id,
    kind,
    topic_ids: kind === "review" ? reviewTopicIds : topicIds,
    review_topic_ids: reviewTopicIds,
    assignment_id: request.assignment_id,
    items: chosen.map((i) => ({ item_id: i.id, version: i.version, topic_id: i.topic_id })),
    started_at: now,
    finished_at: null,
    placement: null,
    rules_version,
  };
  await deps.store.transaction(() => deps.store.insertSet(set));
  return { set_id: set.id, items: chosen.map(projectItemForClient), rules_version };
}
