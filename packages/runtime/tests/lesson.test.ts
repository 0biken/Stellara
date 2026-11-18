import { beforeEach, describe, expect, it } from "vitest";
import { ManualClock, sequentialIds, AUTHOR, REVIEWER } from "../src/testing/fixtures.js";
import { MemoryStore } from "../src/testing/memory-store.js";
import { getLesson, checkLessonAnswer } from "../src/lesson.js";
import type { PublishedItem, PublishedLesson } from "@stellara/content-schema/server";
import type { RuntimeDeps, ChildRecord } from "../src/ports.js";

const TOPIC_ID = "00000000-0000-4000-8000-000000000001";
const LESSON_ID = "00000000-0000-4000-8000-000000000002";
const ITEM_1 = "00000000-0000-4000-8000-000000000003";
const ITEM_2 = "00000000-0000-4000-8000-000000000004";
const ITEM_3 = "00000000-0000-4000-8000-000000000005";
const CHILD_ID = "00000000-0000-4000-8000-000000000010";

function makeItem(id: string, text: string, answerOpt: string): PublishedItem {
  return {
    id,
    version: 1,
    topic_id: TOPIC_ID,
    type: "single_choice",
    stem: text,
    stimulus_id: null,
    explanation: "Because " + answerOpt + " is correct.",
    hint: "Pick " + answerOpt,
    difficulty: "standard",
    tags: [],
    purpose: "lesson_check",
    curriculum_edition: "revised_2025",
    media: [],
    exposure_count: 0,
    provenance: "original",
    author_id: AUTHOR,
    reviewer_id: REVIEWER,
    answer_verified_at: "2026-11-01T00:00:00Z",
    status: "published",
    options: [
      { id: "a", text: "Option A" },
      { id: "b", text: "Option B" },
    ],
    answer: { option_id: answerOpt },
  };
}

describe("lesson-get and lesson-check runtime", () => {
  let store: MemoryStore;
  let deps: RuntimeDeps;
  const childCtx = { child_id: CHILD_ID };

  beforeEach(() => {
    store = new MemoryStore();
    deps = {
      store,
      clock: new ManualClock(1700000000000),
      ids: sequentialIds(),
      rng: { next: () => 0.5 },
    };

    const child: ChildRecord = {
      id: CHILD_ID,
      timezone: "Africa/Lagos",
      exam_date: "2027-04-20",
      status: "active",
      term_id: "term-1",
      last_active_at: 1700000000000,
    };
    store.addChild(child);

    const item1 = makeItem(ITEM_1, "Check question", "a");
    const item2 = makeItem(ITEM_2, "Try it 1", "b");
    const item3 = makeItem(ITEM_3, "Try it 2", "a");
    store.addItems([item1, item2, item3]);

    const lesson: PublishedLesson = {
      id: LESSON_ID,
      version: 1,
      topic_id: TOPIC_ID,
      title: "Sample Lesson",
      status: "published",
      cards: [
        { kind: "explain", body: "Explanation text" },
        { kind: "worked_example", body: "Example", steps: ["Step 1", "Step 2"] },
        { kind: "check", item_id: ITEM_1 },
        { kind: "try_it", item_ids: [ITEM_2, ITEM_3] },
        { kind: "summary", body: "Summary text" },
      ],
    };
    store.putLesson(lesson);
  });

  it("returns published lesson cards with safe items and no answer keys", async () => {
    const lesson = await getLesson(deps, childCtx, TOPIC_ID);
    expect(lesson.id).toBe(LESSON_ID);
    expect(lesson.cards).toHaveLength(5);

    const checkCard = lesson.cards.find((c) => c.kind === "check");
    expect(checkCard).toBeDefined();
    if (checkCard && checkCard.kind === "check") {
      expect(checkCard.item.id).toBe(ITEM_1);
      expect((checkCard.item as any).answer).toBeUndefined();
      expect((checkCard.item as any).explanation).toBeUndefined();
    }

    const tryCard = lesson.cards.find((c) => c.kind === "try_it");
    expect(tryCard).toBeDefined();
    if (tryCard && tryCard.kind === "try_it") {
      expect(tryCard.items).toHaveLength(2);
      expect((tryCard.items[0] as any).answer).toBeUndefined();
    }
  });

  it("checks answers without altering mastery, streak, or stardust ledger", async () => {
    const correctRes = await checkLessonAnswer(deps, childCtx, {
      lesson_id: LESSON_ID,
      item_id: ITEM_1,
      item_version: 1,
      response: { choice: "a" },
    });
    expect(correctRes.is_correct).toBe(true);
    expect(correctRes.explanation_html).toContain("Because a is correct.");

    const wrongRes = await checkLessonAnswer(deps, childCtx, {
      lesson_id: LESSON_ID,
      item_id: ITEM_1,
      item_version: 1,
      response: { choice: "b" },
    });
    expect(wrongRes.is_correct).toBe(false);
    expect(wrongRes.explanation_html).toContain("Because a is correct.");

    // Verify unscored
    const mastery = await store.getMastery(CHILD_ID, TOPIC_ID);
    expect(mastery).toBeNull();
    const stardust = await store.getStardust(CHILD_ID);
    expect(stardust).toBeNull();
    const streak = await store.getStreak(CHILD_ID);
    expect(streak).toBeNull();
  });

  it("rejects checks when item version does not match", async () => {
    await expect(
      checkLessonAnswer(deps, childCtx, {
        lesson_id: LESSON_ID,
        item_id: ITEM_1,
        item_version: 99,
        response: { choice: "a" },
      }),
    ).rejects.toMatchObject({ code: "ITEM_VERSION_MISMATCH" });
  });

  it("rejects getLesson when lesson does not exist or is not published", async () => {
    await expect(
      getLesson(deps, childCtx, "00000000-0000-4000-8000-999999999999"),
    ).rejects.toMatchObject({ code: "LESSON_NOT_FOUND" });
  });
});
