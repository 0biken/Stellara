import { initialMasteryState, initialStardust, initialStreak } from "@stellara/rules";

import { child, singleChoiceItem, uuidFrom } from "./fixtures.js";

import type { RuntimeStore, ChildRecord, AttemptRecord, SetRecord } from "../ports.js";
import type { PublishedItem } from "@stellara/content-schema/server";
import type { StreakOutage } from "@stellara/rules";

export interface StoreHarness {
  store: RuntimeStore;
  reset(): Promise<void>;
  seedChild(value: ChildRecord): Promise<void>;
  seedItems(values: readonly PublishedItem[], strands?: Record<string, string>): Promise<void>;
  seedOutage(value: StreakOutage): Promise<void>;
}
function equal(actual: unknown, expected: unknown) {
  // Canonicalize keys so database JSON object ordering is irrelevant.
  const canonical = (value: unknown): unknown =>
    Array.isArray(value)
      ? value.map(canonical)
      : value !== null && typeof value === "object"
        ? Object.fromEntries(
            Object.entries(value)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([k, v]) => [k, canonical(v)]),
          )
        : value;
  if (JSON.stringify(canonical(actual)) !== JSON.stringify(canonical(expected)))
    throw new Error(
      `Store contract mismatch: ${JSON.stringify(actual)} != ${JSON.stringify(expected)}`,
    );
}
async function rejects(fn: () => Promise<unknown>) {
  let failed = false;
  try {
    await fn();
  } catch {
    failed = true;
  }
  equal(failed, true);
}
const c = uuidFrom(1, 1),
  t = uuidFrom(2, 1),
  i = uuidFrom(3, 1),
  s = uuidFrom(4, 1);
const at = Date.parse("2026-11-17T10:00:00.123Z");
export const contractSet: SetRecord = {
  id: s,
  child_id: c,
  kind: "practice",
  topic_ids: [t],
  review_topic_ids: [],
  assignment_id: null,
  items: [{ item_id: i, version: 1, topic_id: t }],
  started_at: at,
  finished_at: null,
  placement: null,
  rules_version: "contract",
};
export const contractAttempt: AttemptRecord = {
  id: uuidFrom(5, 1),
  client_id: uuidFrom(6, 1),
  child_id: c,
  set_id: s,
  item_id: i,
  item_version: 1,
  topic_id: t,
  response: { choice: "a" },
  is_correct: true,
  scored: true,
  confidence: "normal",
  reason: "eligible",
  hint_shown: false,
  response_ms: 4000,
  recorded_at: at,
  received_at: at,
  answered_at: at,
  learning_day: "2026-11-17",
  key_on_device: false,
  rules_version: "contract",
};
export const storeContractCases: readonly { name: string; run(h: StoreHarness): Promise<void> }[] =
  [
    {
      name: "child lookup, active filtering and absent values",
      async run(h) {
        equal(await h.store.getChild(c), null);
        await h.seedChild(child(c));
        await h.seedChild(child(uuidFrom(1, 2), { status: "paused" }));
        equal(await h.store.getChild(c), child(c));
        equal(await h.store.listActiveChildren(), [child(c)]);
        equal(await h.store.getSet(s), null);
        equal(await h.store.getItem(i, 9), null);
        equal(await h.store.getMastery(c, t), null);
        equal(await h.store.getStardust(c), null);
        equal(await h.store.getStreak(c), null);
        equal(await h.store.getActivityDay(c, "2026-11-17"), null);
        equal(await h.store.getItemStats(i), null);
        equal(await h.store.listReviews(c), []);
      },
    },
    {
      name: "highest item versions, sorting and topic isolation",
      async run(h) {
        const one = singleChoiceItem(i, t),
          two = singleChoiceItem(i, t, { version: 2 });
        const other = singleChoiceItem(uuidFrom(3, 2), t);
        await h.seedItems([other, two, one, singleChoiceItem(uuidFrom(3, 3), uuidFrom(2, 2))], {
          [t]: "number",
        });
        equal(await h.store.publishedItems([t]), [two, other]);
        equal(await h.store.publishedItems([]), []);
        equal(await h.store.getItem(i, 1), one);
        equal(await h.store.topicStrands([t]), [{ topic_id: t, strand_id: "number" }]);
      },
    },
    {
      name: "sets, attempts, global client uniqueness and half-open time range",
      async run(h) {
        await h.seedChild(child(c));
        await h.seedItems([singleChoiceItem(i, t)]);
        await h.store.insertSet(contractSet);
        equal(await h.store.getSet(s), contractSet);
        const finished = { ...contractSet, finished_at: at + 5 };
        await h.store.updateSet(finished);
        equal(await h.store.getSet(s), finished);
        await h.store.insertAttempts([contractAttempt]);
        equal(await h.store.findAttempts([contractAttempt.client_id]), [contractAttempt]);
        equal(await h.store.findAttempts([]), []);
        equal(await h.store.setAttempts(s), [contractAttempt]);
        equal(await h.store.attemptsReceivedBetween(at, at + 1), [contractAttempt]);
        equal(await h.store.attemptsReceivedBetween(at - 1, at), []);
        await rejects(() =>
          h.store.insertAttempts([
            { ...contractAttempt, id: uuidFrom(5, 2), received_at: at + 86400000 },
          ]),
        );
      },
    },
    {
      name: "duplicate client IDs within a batch fail atomically",
      async run(h) {
        await h.seedChild(child(c));
        await h.seedItems([singleChoiceItem(i, t)]);
        await h.store.insertSet(contractSet);
        await rejects(() =>
          h.store.insertAttempts([contractAttempt, { ...contractAttempt, id: uuidFrom(5, 2) }]),
        );
        equal(await h.store.findAttempts([contractAttempt.client_id]), []);
      },
    },
    {
      name: "rule state, ledger, activity, reviews and stats round trips",
      async run(h) {
        await h.seedChild(child(c));
        await h.seedItems([singleChoiceItem(i, t)]);
        const mastery = initialMasteryState(t),
          dust = initialStardust(),
          streak = initialStreak("2026-T1");
        await h.store.putMastery(c, mastery);
        equal(await h.store.getMastery(c, t), mastery);
        await h.store.putMastery(c, { ...mastery, level: 1 });
        equal((await h.store.getMastery(c, t))?.level, 1);
        await h.store.putStardust(c, dust);
        equal(await h.store.getStardust(c), dust);
        await h.store.putStreak(c, streak);
        equal(await h.store.getStreak(c), streak);
        const day = {
          child_id: c,
          learning_day: "2026-11-17",
          scored_count: 8,
          review_sets_done: 0,
          qualifying: true,
          credited_by: "activity" as const,
        };
        await h.store.putActivityDay(day);
        equal(await h.store.getActivityDay(c, day.learning_day), day);
        const row = {
          id: uuidFrom(7, 1),
          child_id: c,
          event: "response" as const,
          amount: 10,
          learning_day: day.learning_day,
          ref_id: contractAttempt.id,
          created_at: at,
        };
        await h.store.appendLedger([row]);
        equal(await h.store.ledgerByRefs(c, [row.ref_id]), [row]);
        equal(await h.store.ledgerByRefs(uuidFrom(1, 2), [row.ref_id]), []);
        await h.store.insertMasteryEvents([
          {
            id: uuidFrom(8, 1),
            child_id: c,
            topic_id: t,
            from_level: 0,
            to_level: 1,
            cause: "practice",
            attempt_id: null,
            created_at: at,
          },
        ]);
        const reviews = [
          { topicId: t, dueDay: "2026-11-20" },
          { topicId: t, dueDay: "2026-11-27" },
        ];
        await h.store.putReviews(c, reviews);
        equal(await h.store.listReviews(c), reviews);
        await h.store.putDueQueue(c, reviews);
        equal(await h.store.listReviews(c), reviews);
        await h.store.putReviews(c, []);
        equal(await h.store.listReviews(c), []);
        const stats = {
          item_id: i,
          exposure_count: 8,
          correct_count: 6,
          p_correct: 0.75,
          updated_at: at,
        };
        await h.store.putItemStats(stats);
        equal(await h.store.getItemStats(i), stats);
      },
    },
    {
      name: "outage overlap excludes touching boundaries",
      async run(h) {
        for (const value of [
          { start: 10, end: 20 },
          { start: 20, end: 30 },
          { start: 30, end: 40 },
        ])
          await h.seedOutage(value);
        equal(await h.store.outagesBetween(20, 30), [{ start: 20, end: 30 }]);
      },
    },
    {
      name: "transaction rolls back all writes and remains reusable",
      async run(h) {
        await h.seedChild(child(c));
        await h.seedItems([singleChoiceItem(i, t)]);
        await rejects(() =>
          h.store.transaction(async () => {
            await h.store.insertSet(contractSet);
            await h.store.insertAttempts([contractAttempt]);
            await h.store.putMastery(c, initialMasteryState(t));
            await h.store.putStardust(c, initialStardust());
            await h.store.putStreak(c, initialStreak("2026-T1"));
            await h.store.putReviews(c, [{ topicId: t, dueDay: "2026-11-20" }]);
            throw new Error("rollback sentinel");
          }),
        );
        equal(await h.store.getSet(s), null);
        equal(await h.store.findAttempts([contractAttempt.client_id]), []);
        equal(await h.store.getMastery(c, t), null);
        equal(await h.store.getStardust(c), null);
        equal(await h.store.getStreak(c), null);
        equal(await h.store.listReviews(c), []);
        equal(
          await h.store.transaction(async () => {
            await h.store.insertSet(contractSet);
            return "committed";
          }),
          "committed",
        );
        equal(await h.store.getSet(s), contractSet);
      },
    },
  ];
