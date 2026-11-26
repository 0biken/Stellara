import { describe, expect, it } from "vitest";

import { modelDraftSchema, topicBriefSchema } from "../src/schemas.js";

import { brief, modelDraft } from "./fixtures.js";

describe("brief and model draft schemas", () => {
  it("accepts the synthetic place-value brief", () => {
    expect(topicBriefSchema.parse(brief).topic_code).toBe("mathematics.s1.t1");
  });
  it("rejects a brief with fewer than two common mistakes", () => {
    const [first] = brief.common_mistakes;
    expect(topicBriefSchema.safeParse({ ...brief, common_mistakes: [first] }).success).toBe(false);
  });
  it("rejects a malformed topic code", () => {
    expect(topicBriefSchema.safeParse({ ...brief, topic_code: "Maths 1" }).success).toBe(false);
  });
  it("accepts the synthetic model draft", () => {
    expect(modelDraftSchema.parse(modelDraft).items.length).toBe(4);
  });
});
