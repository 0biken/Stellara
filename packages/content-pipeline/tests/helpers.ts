import { toDraftBatch } from "../src/batch.js";
import { findTopic, loadCurriculum } from "../src/curriculum.js";

import { modelDraft } from "./fixtures.js";

export const authorId = "40000000-0000-4000-8000-000000000001";
export function counterId() {
  let n = 0;
  return () => `90000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;
}
export function buildBatch(draft = modelDraft) {
  return toDraftBatch({
    draft,
    topic: findTopic(loadCurriculum(), "mathematics.s1.t1"),
    topicCode: "mathematics.s1.t1",
    authorId,
    model: "claude-opus-5-5",
    briefSha256: "0".repeat(64),
    now: new Date("2026-11-26T10:00:00Z"),
    newId: counterId(),
  });
}
