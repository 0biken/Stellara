import { describe, expect, it } from "vitest";

import { toDraftBatch } from "../src/batch.js";
import { findTopic, loadCurriculum } from "../src/curriculum.js";

import { modelDraft } from "./fixtures.js";

export const authorId = "40000000-0000-4000-8000-000000000001";
export function counterId() {
  let n = 0;
  return () => `90000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;
}
export function buildBatch(draft = modelDraft) {
  const curriculum = loadCurriculum();
  return toDraftBatch({
    draft,
    topic: findTopic(curriculum, "mathematics.s1.t1"),
    topicCode: "mathematics.s1.t1",
    authorId,
    model: "claude-opus-5-5",
    briefSha256: "0".repeat(64),
    now: new Date("2026-11-26T10:00:00Z"),
    newId: counterId(),
  });
}

describe("toDraftBatch", () => {
  it("finds the place value topic", () => {
    expect(findTopic(loadCurriculum(), "mathematics.s1.t1").id).toBe(
      "72000000-0000-4000-8000-000000000004",
    );
  });
  it("throws for an unknown topic code", () => {
    expect(() => findTopic(loadCurriculum(), "mathematics.s9.t9")).toThrow(
      "Unknown topic code: mathematics.s9.t9",
    );
  });
  it("maps the synthetic draft into four draft items and a lesson", () => {
    const batch = buildBatch();
    expect(batch.items).toHaveLength(4);
    for (const item of batch.items) {
      expect(item).toMatchObject({
        status: "draft",
        version: 1,
        topic_id: "72000000-0000-4000-8000-000000000004",
        author_id: authorId,
      });
    }
    const checkItem = batch.items.find((item) => item.purpose === "lesson_check");
    const checkCard = batch.lesson.cards?.find((card) => card.kind === "check");
    expect(checkCard).toEqual({ kind: "check", item_id: checkItem?.id });
    expect(batch.notes[checkItem?.id ?? ""]?.key).toBe("c1");
    expect(batch.drafting).toMatchObject({ model: "claude-opus-5-5", prompt_version: "pilot-1" });
  });
  it("maps a numeric answer to a canonical value", () => {
    const numeric = buildBatch().items.find((item) => item.type === "numeric");
    expect(numeric?.answer).toEqual({ value: "6049" });
  });
  it("rejects a card that references an undefined key", () => {
    const draft = structuredClone(modelDraft);
    draft.lesson.cards[2] = { kind: "check", body: null, steps: [], item_keys: ["zz"] };
    expect(() => buildBatch(draft)).toThrow(/unknown item key.*zz/);
  });
  it("rejects duplicate item keys", () => {
    const draft = structuredClone(modelDraft);
    draft.items[1] = { ...draft.items[1]!, key: "p1" };
    expect(() => buildBatch(draft)).toThrow(/duplicate item key.*p1/);
  });
});
