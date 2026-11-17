import { initialMasteryState } from "@stellara/rules";
import { describe, expect, it } from "vitest";

import { RuntimeError } from "../src/contracts.js";
import { startSet } from "../src/set-start.js";
import { child, memoryDeps, topicItems, uuidFrom } from "../src/testing/index.js";

import { CHILD, DAY, hasKey, T0, TOPIC_A, TOPIC_B, TOPIC_C, TOPIC_D } from "./helpers.js";

function setup(seed = 7) {
  const env = memoryDeps(T0, seed);
  env.store.addChild(child(CHILD));
  const difficulties = ["easy", "standard", "hard"] as const;
  env.store.addItems(
    topicItems(TOPIC_A, 15, 0x1a, (i) => ({ difficulty: difficulties[i % 3]!, hint: "h" })),
  );
  env.store.addItems(topicItems(TOPIC_B, 15, 0x1b));
  env.store.addItems(topicItems(TOPIC_C, 15, 0x1c));
  env.store.addItems(topicItems(TOPIC_D, 3, 0x1d));
  return env;
}

const code = async (p: Promise<unknown>) => {
  try {
    await p;
  } catch (e) {
    return (e as RuntimeError).code;
  }
  return "ok";
};

describe("startSet", () => {
  it("assembles a 10-item practice set with no keys, explanations or hint bodies", async () => {
    const { deps, store } = setup();
    const res = await startSet(
      deps,
      { child_id: CHILD },
      { kind: "practice", topic_ids: [TOPIC_A] },
    );
    expect(res.items).toHaveLength(10);
    expect(res.rules_version).toBe("v0.1.0");
    for (const name of ["answer", "explanation", "explanation_html", "hint", "author_id"])
      expect(hasKey(res, name)).toBe(false);
    expect(res.items.every((i) => i.hint_available)).toBe(true);
    expect(new Set(res.items.map((i) => i.difficulty)).size).toBe(3);
    const stored = await store.getSet(res.set_id);
    expect(stored?.items).toHaveLength(10);
    expect(stored?.kind).toBe("practice");
  });

  it("is deterministic for a seed and mixes topics", async () => {
    const a = setup(3),
      b = setup(3);
    const req = { kind: "practice", topic_ids: [TOPIC_A, TOPIC_B] };
    const ra = await startSet(a.deps, { child_id: CHILD }, req);
    const rb = await startSet(b.deps, { child_id: CHILD }, req);
    expect(ra.items.map((i) => i.id)).toEqual(rb.items.map((i) => i.id));
    expect(ra.items.filter((i) => i.topic_id === TOPIC_A)).toHaveLength(5);
  });

  it("prefers items not seen in the last 30 days", async () => {
    const { deps, store } = setup();
    const items = await store.publishedItems([TOPIC_B]);
    const seen = items.slice(0, 5).map((i) => ({ itemId: i.id, answeredAt: T0 - DAY }));
    const old = items.slice(5, 7).map((i) => ({ itemId: i.id, answeredAt: T0 - 40 * DAY }));
    await store.putMastery(CHILD, {
      ...initialMasteryState(TOPIC_B),
      priorAttempts: [...seen, ...old],
    });
    const res = await startSet(
      deps,
      { child_id: CHILD },
      { kind: "practice", topic_ids: [TOPIC_B] },
    );
    const chosen = new Set(res.items.map((i) => i.id));
    expect(seen.filter((s) => chosen.has(s.itemId))).toHaveLength(0);
  });

  it("builds a topic assessment of exactly 10 from one topic", async () => {
    const { deps } = setup();
    const res = await startSet(
      deps,
      { child_id: CHILD },
      { kind: "topic_assessment", topic_ids: [TOPIC_C] },
    );
    expect(res.items).toHaveLength(10);
    expect(
      await code(
        startSet(
          deps,
          { child_id: CHILD },
          { kind: "topic_assessment", topic_ids: [TOPIC_A, TOPIC_B] },
        ),
      ),
    ).toBe("INVALID_REQUEST");
  });

  it("pulls at most 3 due topics into a review set of up to 10 items", async () => {
    const { deps, store } = setup();
    await store.putReviews(CHILD, [
      { topicId: TOPIC_A, dueDay: "2027-01-18" },
      { topicId: TOPIC_A, dueDay: "2027-01-19" },
      { topicId: TOPIC_B, dueDay: "2027-01-19" },
      { topicId: TOPIC_C, dueDay: "2027-01-20" },
      { topicId: TOPIC_D, dueDay: "2027-01-20" },
      { topicId: TOPIC_D, dueDay: "2027-02-20" },
    ]);
    const res = await startSet(deps, { child_id: CHILD }, { kind: "review" });
    expect(res.items).toHaveLength(10);
    const topics = new Set(res.items.map((i) => i.topic_id));
    expect([...topics].sort()).toEqual([TOPIC_A, TOPIC_B, TOPIC_C].sort());
    for (const t of topics)
      expect(res.items.filter((i) => i.topic_id === t).length).toBeLessThanOrEqual(5);
    const set = await store.getSet(res.set_id);
    expect(set?.review_topic_ids).toEqual([TOPIC_A, TOPIC_B, TOPIC_C]);
  });

  it("reports when no review is due", async () => {
    const { deps, store } = setup();
    expect(await code(startSet(deps, { child_id: CHILD }, { kind: "review" }))).toBe(
      "NO_REVIEWS_DUE",
    );
    await store.putReviews(CHILD, [{ topicId: TOPIC_A, dueDay: "2027-03-01" }]);
    expect(await code(startSet(deps, { child_id: CHILD }, { kind: "review" }))).toBe(
      "NO_REVIEWS_DUE",
    );
  });

  it("spreads a placement check evenly across strands", async () => {
    const { deps, store } = setup();
    store.addStrand(TOPIC_A, "strand-1");
    store.addStrand(TOPIC_B, "strand-1");
    store.addStrand(TOPIC_C, "strand-2");
    store.addStrand(TOPIC_D, "strand-3");
    const res = await startSet(
      deps,
      { child_id: CHILD },
      { kind: "placement", topic_ids: [TOPIC_A, TOPIC_B, TOPIC_C, TOPIC_D] },
    );
    expect(res.items).toHaveLength(20);
    const count = (t: string[]) => res.items.filter((i) => t.includes(i.topic_id)).length;
    expect(count([TOPIC_D])).toBe(3);
    expect(Math.abs(count([TOPIC_A, TOPIC_B]) - count([TOPIC_C]))).toBeLessThanOrEqual(1);
  });

  it("rejects bad requests, thin pools, practice tests and inactive children", async () => {
    const { deps, store } = setup();
    const ctx = { child_id: CHILD };
    expect(await code(startSet(deps, ctx, { kind: "practice", topic_ids: [TOPIC_D] }))).toBe(
      "NO_ITEMS_AVAILABLE",
    );
    expect(await code(startSet(deps, ctx, { kind: "practice" }))).toBe("INVALID_REQUEST");
    expect(await code(startSet(deps, ctx, { kind: "practice", topic_ids: ["nope"] }))).toBe(
      "INVALID_REQUEST",
    );
    expect(await code(startSet(deps, ctx, { kind: "practice_test" }))).toBe("KIND_NOT_SUPPORTED");
    expect(await code(startSet(deps, ctx, null))).toBe("INVALID_REQUEST");
    expect(await code(startSet(deps, { child_id: uuidFrom(0xc, 9) }, { kind: "review" }))).toBe(
      "CHILD_NOT_FOUND",
    );
    store.addChild(child(CHILD, { status: "paused" }));
    expect(await code(startSet(deps, ctx, { kind: "review" }))).toBe("CHILD_INACTIVE");
  });

  it("serialises errors to the documented envelope", () => {
    expect(new RuntimeError("SET_CLOSED").toEnvelope()).toEqual({
      error: { code: "SET_CLOSED", message: "This set is already finished.", retryable: false },
    });
  });
});
