import { describe, expect, it } from "vitest";
import {
  TOPICS_BY_YEAR,
  SAMPLE_TOPICS,
  SAMPLE_ITEMS,
  SAMPLE_LESSONS,
  KEYS,
} from "../lib/learning/preview-content";

describe("P4-P6 sample maths content", () => {
  it("provides fractions and shapes for P4, fractions and angles for P5, fractions and area for P6", () => {
    expect(TOPICS_BY_YEAR.P4).toHaveLength(2);
    expect(TOPICS_BY_YEAR.P5).toHaveLength(2);
    expect(TOPICS_BY_YEAR.P6).toHaveLength(2);

    const p4Titles = TOPICS_BY_YEAR.P4.map((t) => t.title.toLowerCase());
    expect(p4Titles.some((t) => t.includes("fraction"))).toBe(true);
    expect(p4Titles.some((t) => t.includes("shape"))).toBe(true);

    const p5Titles = TOPICS_BY_YEAR.P5.map((t) => t.title.toLowerCase());
    expect(p5Titles.some((t) => t.includes("fraction"))).toBe(true);
    expect(p5Titles.some((t) => t.includes("angle"))).toBe(true);

    const p6Titles = TOPICS_BY_YEAR.P6.map((t) => t.title.toLowerCase());
    expect(p6Titles.some((t) => t.includes("fraction"))).toBe(true);
    expect(p6Titles.some((t) => t.includes("area"))).toBe(true);
  });

  it("provides exactly 30 practice questions per topic and 3 check questions per lesson", () => {
    for (const topic of SAMPLE_TOPICS) {
      const topicPractice = SAMPLE_ITEMS.filter(
        (i) => i.topic_id === topic.id && i.purpose === "practice",
      );
      expect(topicPractice).toHaveLength(30);

      const topicChecks = SAMPLE_ITEMS.filter(
        (i) => i.topic_id === topic.id && i.purpose === "lesson_check",
      );
      expect(topicChecks).toHaveLength(3);

      // Verify each item has an answer key
      for (const item of [...topicPractice, ...topicChecks]) {
        expect(KEYS.has(item.id)).toBe(true);
      }
    }
  });

  it("provides a published lesson for each topic containing check and try_it cards", () => {
    for (const topic of SAMPLE_TOPICS) {
      const lesson = SAMPLE_LESSONS.find((l) => l.topic_id === topic.id);
      expect(lesson).toBeDefined();
      if (!lesson) continue;

      expect(lesson.status).toBe("published");
      expect(lesson.cards.length).toBeGreaterThanOrEqual(3);
      expect(lesson.cards.some((c) => c.kind === "check")).toBe(true);
      expect(lesson.cards.some((c) => c.kind === "try_it")).toBe(true);
    }
  });
});
