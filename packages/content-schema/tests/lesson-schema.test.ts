import { describe, expect, it } from "vitest";

import {
  projectLessonForClient,
  projectItemForClient,
} from "../src/client.js";
import {
  publishedLessonSchema,
  draftLessonSchema,
  publishedItemSchema,
} from "../src/server.js";

const sampleItemId1 = "10000000-0000-4000-8000-000000000001";
const sampleItemId2 = "10000000-0000-4000-8000-000000000002";
const sampleItemId3 = "10000000-0000-4000-8000-000000000003";
const topicId = "20000000-0000-4000-8000-000000000001";
const lessonId = "30000000-0000-4000-8000-000000000001";
const authorId = "40000000-0000-4000-8000-000000000001";
const reviewerId = "40000000-0000-4000-8000-000000000002";

function mockItem(id: string, purpose: "practice" | "lesson_check" | "placement" = "practice") {
  return {
    id,
    version: 1,
    topic_id: topicId,
    type: "single_choice" as const,
    stem: "What is 1/2 + 1/2?",
    stimulus_id: null,
    explanation: "Half plus half equals one whole.",
    hint: "Think about halves.",
    difficulty: "standard" as const,
    tags: ["fractions"],
    purpose,
    curriculum_edition: "revised_2025" as const,
    media: [],
    exposure_count: 0,
    provenance: "original" as const,
    author_id: authorId,
    reviewer_id: reviewerId,
    answer_verified_at: "2026-11-01T00:00:00Z",
    status: "published" as const,
    options: [
      { id: "a", text: "1" },
      { id: "b", text: "2" },
    ],
    answer: { option_id: "a" },
  };
}

describe("versioned lesson schemas and publication validation", () => {
  it("validates draft lessons with flexible fields", () => {
    const draft = draftLessonSchema.parse({
      id: lessonId,
      version: 1,
      topic_id: topicId,
      status: "draft",
    });
    expect(draft.status).toBe("draft");
  });

  it("validates published lessons with strict rules and try_it cards", () => {
    const valid = publishedLessonSchema.parse({
      id: lessonId,
      version: 1,
      topic_id: topicId,
      status: "published",
      cards: [
        { kind: "explain", body: "A fraction is part of a whole." },
        { kind: "worked_example", body: "Adding halves:", steps: ["1/2 + 1/2 = 2/2", "= 1"] },
        { kind: "check", item_id: sampleItemId1 },
        { kind: "try_it", item_ids: [sampleItemId2, sampleItemId3] },
        { kind: "summary", body: "Now you can add like fractions!" },
      ],
    });
    expect(valid.status).toBe("published");
    expect(valid.cards).toHaveLength(5);
  });

  it("rejects published lessons with fewer than 3 cards or no check/try_it cards", () => {
    expect(() =>
      publishedLessonSchema.parse({
        id: lessonId,
        version: 1,
        topic_id: topicId,
        status: "published",
        cards: [
          { kind: "explain", body: "Too short" },
          { kind: "summary", body: "Still too short" },
        ],
      }),
    ).toThrow();

    expect(() =>
      publishedLessonSchema.parse({
        id: lessonId,
        version: 1,
        topic_id: topicId,
        status: "published",
        cards: [
          { kind: "explain", body: "Card 1" },
          { kind: "worked_example", body: "Card 2", steps: ["step 1"] },
          { kind: "summary", body: "Card 3 without check" },
        ],
      }),
    ).toThrow();
  });

  it("projects published lessons safely for client without exposing answers", () => {
    const item1 = mockItem(sampleItemId1, "lesson_check");
    const item2 = mockItem(sampleItemId2, "practice");
    const item3 = mockItem(sampleItemId3, "practice");

    const publishedLesson = {
      id: lessonId,
      version: 1,
      topic_id: topicId,
      title: "Understanding Fractions",
      status: "published" as const,
      cards: [
        { kind: "explain" as const, body: "Intro to fractions" },
        { kind: "check" as const, item_id: sampleItemId1 },
        { kind: "try_it" as const, item_ids: [sampleItemId2, sampleItemId3] },
        { kind: "summary" as const, body: "Wrap-up" },
      ],
    };

    const itemsMap = new Map([
      [sampleItemId1, item1],
      [sampleItemId2, item2],
      [sampleItemId3, item3],
    ]);

    const projected = projectLessonForClient(publishedLesson, itemsMap);
    expect(projected.id).toBe(lessonId);
    expect(projected.cards).toHaveLength(4);

    const checkCard = projected.cards.find((c) => c.kind === "check");
    expect(checkCard).toBeDefined();
    if (checkCard && checkCard.kind === "check") {
      expect(checkCard.item.id).toBe(sampleItemId1);
      expect("answer" in checkCard.item).toBe(false);
      expect("explanation" in checkCard.item).toBe(false);
    }

    const tryItCard = projected.cards.find((c) => c.kind === "try_it");
    expect(tryItCard).toBeDefined();
    if (tryItCard && tryItCard.kind === "try_it") {
      expect(tryItCard.items).toHaveLength(2);
      expect("answer" in tryItCard.items[0]!).toBe(false);
    }
  });

  it("supports explicit purpose metadata on items (practice, lesson_check, placement)", () => {
    const practiceItem = publishedItemSchema.parse(mockItem(sampleItemId1, "practice"));
    expect(practiceItem.purpose).toBe("practice");

    const checkItem = publishedItemSchema.parse(mockItem(sampleItemId2, "lesson_check"));
    expect(checkItem.purpose).toBe("lesson_check");

    const placementItem = publishedItemSchema.parse(mockItem(sampleItemId3, "placement"));
    expect(placementItem.purpose).toBe("placement");

    const clientProjected = projectItemForClient(placementItem);
    expect(clientProjected.purpose).toBe("placement");
  });
});
