import { initialStardust, initialStreak } from "@stellara/rules";
import { describe, expect, it } from "vitest";

import { submitResponses } from "../src/responses-submit.js";
import { startSet } from "../src/set-start.js";
import { child, memoryDeps, topicItems } from "../src/testing/index.js";

import {
  answer,
  batch,
  CHILD,
  DAY,
  HOUR,
  OTHER_CHILD,
  T0,
  TOPIC_A,
  TOPIC_B,
  TOPIC_C,
  TOPIC_D,
} from "./helpers.js";

import type { RuntimeError } from "../src/contracts.js";
import type { RuntimeDeps } from "../src/ports.js";

function setup() {
  const env = memoryDeps(T0);
  env.store.addChild(child(CHILD));
  env.store.addChild(child(OTHER_CHILD));
  env.store.addItems(topicItems(TOPIC_A, 15, 0x1a));
  env.store.addItems(topicItems(TOPIC_B, 15, 0x1b));
  env.store.addItems(topicItems(TOPIC_C, 15, 0x1c, () => ({ difficulty: "hard" })));
  env.store.addItems(topicItems(TOPIC_D, 12, 0x1d));
  return env;
}

const ctx = { child_id: CHILD };

async function practice(deps: RuntimeDeps, topic: string, kind = "practice") {
  const set = await startSet(deps, ctx, { kind, topic_ids: [topic] });
  return { setId: set.set_id, itemIds: set.items.map((i) => i.id) };
}

const code = async (p: Promise<unknown>) => {
  try {
    await p;
  } catch (e) {
    return (e as RuntimeError).code;
  }
  return "ok";
};

describe("submitResponses", () => {
  it("scores a practice set, moves mastery and writes the ledger and activity day", async () => {
    const { deps, store } = setup();
    const { setId, itemIds } = await practice(deps, TOPIC_A);
    const res = await submitResponses(
      deps,
      ctx,
      batch(
        itemIds.map((id, i) => answer(setId, id, T0 - (10 - i) * 60_000)),
        T0,
      ),
    );
    expect(res.results).toHaveLength(10);
    expect(res.results.every((r) => r.is_correct && r.scored && r.stardust === 10)).toBe(true);
    expect(res.results[0]!.explanation_html).toBe("Because a is right.");
    expect(res.mastery_changes).toEqual([
      { topic_id: TOPIC_A, from: "not_assessed", to: "developing" },
    ]);
    expect(res.stardust_today).toBe(125);
    expect(res.run_length).toBe(0);
    expect((await store.getSet(setId))?.finished_at).toBe(T0);
    expect(await store.getActivityDay(CHILD, "2027-01-20")).toMatchObject({
      scored_count: 10,
      qualifying: true,
      credited_by: "activity",
    });
    expect((await store.listReviews(CHILD)).map((r) => r.dueDay)).toEqual([
      "2027-01-23",
      "2027-01-30",
      "2027-02-19",
    ]);
    expect(store.t.masteryEvents).toHaveLength(1);
    expect(store.t.ledger.filter((r) => r.event === "level")).toHaveLength(1);
  });

  it("is idempotent on client_id: a replayed batch changes nothing", async () => {
    const { deps, store, clock } = setup();
    const { setId, itemIds } = await practice(deps, TOPIC_A);
    const request = batch(
      itemIds.slice(0, 6).map((id) => answer(setId, id, T0 - 60_000)),
      T0,
    );
    const first = await submitResponses(deps, ctx, request);
    const snapshot = structuredClone(store.t);
    clock.advance(HOUR);
    const second = await submitResponses(deps, ctx, request);
    expect(second.results).toEqual(first.results);
    expect(second.mastery_changes).toEqual([]);
    expect(store.t.attempts).toEqual(snapshot.attempts);
    expect(store.t.ledger).toEqual(snapshot.ledger);
    expect(store.t.stardust).toEqual(snapshot.stardust);
  });

  it("collapses duplicate client_ids within one batch", async () => {
    const { deps, store } = setup();
    const { setId, itemIds } = await practice(deps, TOPIC_A);
    const one = answer(setId, itemIds[0]!, T0 - 60_000);
    const res = await submitResponses(deps, ctx, batch([one, one], T0));
    expect(res.results).toHaveLength(2);
    expect(res.results[0]).toEqual(res.results[1]);
    expect(store.t.attempts).toHaveLength(1);
  });

  it("reaches proficient over two sets on two learning days (fixture M-05 path)", async () => {
    const { deps, clock } = setup();
    const day1 = await practice(deps, TOPIC_B);
    const r1 = await submitResponses(
      deps,
      ctx,
      batch(
        day1.itemIds.slice(0, 6).map((id) => answer(day1.setId, id, T0 - 60_000)),
        T0,
      ),
    );
    expect(r1.mastery_changes.at(-1)?.to).toBe("developing");
    clock.advance(DAY);
    const day2 = await practice(deps, TOPIC_B);
    const fresh = day2.itemIds.filter((id) => !day1.itemIds.slice(0, 6).includes(id));
    const r2 = await submitResponses(
      deps,
      ctx,
      batch(
        fresh
          .slice(0, 4)
          .map((id, i) =>
            answer(day2.setId, id, T0 + DAY - 60_000, i < 2 ? {} : { response: { choice: "b" } }),
          ),
        T0 + DAY,
      ),
    );
    expect(r2.results.map((r) => r.is_correct)).toEqual([true, true, false, false]);
    expect(r2.mastery_changes).toEqual([
      { topic_id: TOPIC_B, from: "developing", to: "proficient" },
    ]);
  });

  it("stores but does not score fast, hinted, repeated, grown-up and malformed responses", async () => {
    const { deps, store } = setup();
    const { setId, itemIds } = await practice(deps, TOPIC_A);
    const [a, b, c, d] = itemIds;
    const res = await submitResponses(
      deps,
      ctx,
      batch(
        [
          answer(setId, a!, T0 - 50_000, { response_ms: 1000 }),
          answer(setId, b!, T0 - 40_000, { hint_shown: true }),
          answer(setId, c!, T0 - 30_000),
          answer(setId, c!, T0 - 20_000),
          answer(setId, d!, T0 - 10_000, { response: { value: "7" } }),
        ],
        T0,
      ),
    );
    expect(res.results.map((r) => r.scored)).toEqual([false, false, true, false, false]);
    expect(res.results.map((r) => r.stardust)).toEqual([0, 0, 10, 0, 0]);
    expect(store.t.attempts.map((x) => x.reason)).toEqual([
      "too_fast",
      "hint_shown",
      "eligible",
      "seen_within_30_days",
      "invalid_response",
    ]);
    const grown = await practice(deps, TOPIC_D);
    const g = await submitResponses(
      deps,
      { child_id: CHILD, grownup: true },
      batch([answer(grown.setId, grown.itemIds[0]!, T0 - 1000)], T0),
    );
    expect(g.results[0]?.scored).toBe(false);
  });

  it("scores offline key-on-device answers at low confidence and caps them below Level 3", async () => {
    const { deps, store, clock } = setup();
    for (const day of [0, 1]) {
      clock.at = T0 + day * DAY;
      const set = await practice(deps, TOPIC_D);
      await submitResponses(
        deps,
        ctx,
        batch(
          set.itemIds
            .slice(0, 6)
            .map((id) => answer(set.setId, id, clock.at - HOUR, { key_on_device: true })),
          clock.at,
        ),
      );
    }
    expect(store.t.attempts.filter((a) => a.scored && a.confidence === "low")).toHaveLength(12);
    expect((await store.getMastery(CHILD, TOPIC_D))?.level).toBe(2);
  });

  it("clamps Stardust to the daily cap of 200", async () => {
    const { deps, store } = setup();
    await store.putStardust(CHILD, {
      ...initialStardust(),
      total: 195,
      byDay: { "2027-01-20": 195 },
    });
    const { setId, itemIds } = await practice(deps, TOPIC_A);
    const res = await submitResponses(
      deps,
      ctx,
      batch(
        itemIds.slice(0, 2).map((id) => answer(setId, id, T0 - 60_000)),
        T0,
      ),
    );
    expect(res.results.map((r) => r.stardust)).toEqual([5, 0]);
    expect(res.stardust_today).toBe(200);
    expect(store.t.ledger.map((r) => r.amount)).toEqual([5, 0]);
  });

  it("trusts the device clock only within 72 hours and 10 minutes of drift", async () => {
    const { deps, store } = setup();
    const { setId, itemIds } = await practice(deps, TOPIC_A);
    await submitResponses(deps, ctx, batch([answer(setId, itemIds[0]!, T0 - 2 * DAY)], T0));
    await submitResponses(
      deps,
      ctx,
      batch([answer(setId, itemIds[1]!, T0 - 2 * DAY)], T0 + 20 * 60_000),
    );
    await submitResponses(deps, ctx, batch([answer(setId, itemIds[2]!, T0 - 4 * DAY)], T0));
    expect(store.t.attempts.map((a) => [a.learning_day, a.answered_at])).toEqual([
      ["2027-01-18", T0 - 2 * DAY],
      ["2027-01-20", T0],
      ["2027-01-20", T0],
    ]);
  });

  it("rejects unknown, foreign and finished sets, foreign items and stale versions", async () => {
    const { deps, store } = setup();
    const mine = await practice(deps, TOPIC_A);
    const theirs = await startSet(
      deps,
      { child_id: OTHER_CHILD },
      { kind: "practice", topic_ids: [TOPIC_B] },
    );
    const other = theirs.items[0]!.id;
    const submit = (r: ReturnType<typeof answer>) => submitResponses(deps, ctx, batch([r], T0));
    expect(await code(submit(answer(mine.itemIds[0]!, mine.itemIds[0]!, T0)))).toBe(
      "SET_NOT_FOUND",
    );
    expect(await code(submit(answer(theirs.set_id, other, T0)))).toBe("SET_NOT_OWNED");
    expect(await code(submit(answer(mine.setId, other, T0)))).toBe("ITEM_NOT_IN_SET");
    expect(await code(submit(answer(mine.setId, mine.itemIds[0]!, T0, { item_version: 2 })))).toBe(
      "ITEM_VERSION_MISMATCH",
    );
    expect(await code(submitResponses(deps, ctx, { responses: [] }))).toBe("INVALID_REQUEST");

    const foreign = answer(theirs.set_id, other, T0 - 1000);
    await submitResponses(deps, { child_id: OTHER_CHILD }, batch([foreign], T0));
    expect(await code(submit(foreign))).toBe("SET_NOT_OWNED");

    await submitResponses(
      deps,
      ctx,
      batch(
        mine.itemIds.map((id) => answer(mine.setId, id, T0 - 1000)),
        T0,
      ),
    );
    expect(await code(submit(answer(mine.setId, mine.itemIds[0]!, T0)))).toBe("SET_CLOSED");
    expect(store.t.attempts).toHaveLength(11);
  });

  it("rolls the whole batch back when a write fails", async () => {
    const { deps, store } = setup();
    const { setId, itemIds } = await practice(deps, TOPIC_A);
    const before = structuredClone(store.t);
    store.failOn = "putStardust";
    await expect(
      submitResponses(
        deps,
        ctx,
        batch(
          itemIds.map((id) => answer(setId, id, T0 - 1000)),
          T0,
        ),
      ),
    ).rejects.toThrow("Injected failure");
    expect(store.t).toEqual(before);
  });

  it("judges a topic assessment once all 10 answers are in", async () => {
    const { deps } = setup();
    const { setId, itemIds } = await practice(deps, TOPIC_C, "topic_assessment");
    const part1 = await submitResponses(
      deps,
      ctx,
      batch(
        itemIds.slice(0, 5).map((id) => answer(setId, id, T0 - 60_000)),
        T0,
      ),
    );
    expect(part1.mastery_changes).toEqual([]);
    const part2 = await submitResponses(
      deps,
      ctx,
      batch(
        itemIds
          .slice(5)
          .map((id, i) =>
            answer(setId, id, T0 - 30_000, i === 0 ? { response: { choice: "b" } } : {}),
          ),
        T0,
      ),
    );
    expect(part2.mastery_changes).toEqual([
      { topic_id: TOPIC_C, from: "not_assessed", to: "proficient" },
    ]);
  });

  it("completes a review set: due bonus, +20, clears the due reviews and counts the day", async () => {
    const { deps, store } = setup();
    await store.putReviews(CHILD, [
      { topicId: TOPIC_A, dueDay: "2027-01-19" },
      { topicId: TOPIC_A, dueDay: "2027-02-10" },
    ]);
    const { setId, itemIds } = await practice(deps, TOPIC_A, "review");
    expect(itemIds).toHaveLength(5);
    const res = await submitResponses(
      deps,
      ctx,
      batch(
        itemIds.map((id) => answer(setId, id, T0 - 60_000)),
        T0,
      ),
    );
    expect(res.results.every((r) => r.stardust === 15)).toBe(true);
    expect(res.stardust_today).toBe(75 + 25 + 20);
    expect(await store.listReviews(CHILD)).toEqual([{ topicId: TOPIC_A, dueDay: "2027-02-10" }]);
    expect(await store.getActivityDay(CHILD, "2027-01-20")).toMatchObject({
      scored_count: 5,
      review_sets_done: 1,
      qualifying: true,
    });
  });

  it("returns strand-level placement results and never changes topic mastery", async () => {
    const { deps, store } = setup();
    store.addStrand(TOPIC_A, "s1");
    store.addStrand(TOPIC_B, "s2");
    const set = await startSet(deps, ctx, { kind: "placement", topic_ids: [TOPIC_A, TOPIC_B] });
    const res = await submitResponses(
      deps,
      ctx,
      batch(
        set.items.map((item) =>
          answer(
            set.set_id,
            item.id,
            T0 - 60_000,
            item.topic_id === TOPIC_B ? { response: { choice: "b" } } : {},
          ),
        ),
        T0,
      ),
    );
    expect(res.mastery_changes).toEqual([]);
    expect(res.placement).toEqual([
      { strand_id: "s1", label: "looks_secure_so_far" },
      { strand_id: "s2", label: "check_this" },
    ]);
    expect((await store.getMastery(CHILD, TOPIC_A))?.level).toBe(0);
    expect((await store.getSet(set.set_id))?.placement?.[0]).toMatchObject({
      correct: 10,
      answered: 10,
    });
    expect(res.stardust_today).toBeGreaterThan(0);
  });

  it("reports the current run length from the streak state", async () => {
    const { deps, store } = setup();
    await store.putStreak(CHILD, { ...initialStreak("2026-T1"), run: 4 });
    const { setId, itemIds } = await practice(deps, TOPIC_A);
    const res = await submitResponses(
      deps,
      ctx,
      batch([answer(setId, itemIds[0]!, T0 - 1000)], T0),
    );
    expect(res.run_length).toBe(4);
  });

  it("schedules reviews against the exam date", async () => {
    const { deps, store } = setup();
    store.addChild(child(CHILD, { exam_date: "2027-02-05" }));
    const { setId, itemIds } = await practice(deps, TOPIC_A);
    await submitResponses(
      deps,
      ctx,
      batch(
        itemIds.slice(0, 6).map((id) => answer(setId, id, T0 - 60_000)),
        T0,
      ),
    );
    const due = (await store.listReviews(CHILD)).map((r) => r.dueDay);
    expect(due.every((d) => d <= "2027-02-02")).toBe(true);
  });
});
