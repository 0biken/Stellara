import { mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { claudeDraftModel, DraftError, draftTopic, type DraftModel } from "../src/drafter.js";
import { buildPrompt } from "../src/prompt.js";

import { brief, modelDraft } from "./fixtures.js";
import { authorId } from "./helpers.js";

import type Anthropic from "@anthropic-ai/sdk";

let root: string;
let briefPath: string;
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "stellara-pipeline-"));
  briefPath = join(root, "brief.json");
  writeFileSync(briefPath, JSON.stringify({ ...brief, filled_by: "PRIVATE-REF-9" }));
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

const fakeModel: DraftModel = async () => structuredClone(modelDraft);
const outRoot = () => join(root, "out");

describe("buildPrompt", () => {
  it("prompt never contains filled_by", () => {
    const prompt = buildPrompt({ ...brief, filled_by: "PRIVATE-REF-9" }, "Place value");
    expect(prompt.system + prompt.user).not.toContain("PRIVATE-REF-9");
    for (const objective of brief.objectives) expect(prompt.user).toContain(objective);
    for (const entry of brief.common_mistakes) expect(prompt.user).toContain(entry.mistake);
  });
});

describe("draftTopic", () => {
  it("draftTopic writes batch and check files", async () => {
    const { dir, report } = await draftTopic({
      briefPath,
      authorId,
      outRoot: outRoot(),
      model: fakeModel,
    });
    expect(report.ok).toBe(true);
    expect(existsSync(join(dir, "batch.json"))).toBe(true);
    expect(JSON.parse(readFileSync(join(dir, "check.json"), "utf8")).ok).toBe(true);
  });
  it("draftTopic refuses when review.json exists", async () => {
    const { dir } = await draftTopic({ briefPath, authorId, outRoot: outRoot(), model: fakeModel });
    const before = readFileSync(join(dir, "batch.json"));
    writeFileSync(join(dir, "review.json"), "{}");
    await expect(
      draftTopic({ briefPath, authorId, outRoot: outRoot(), model: fakeModel }),
    ).rejects.toThrow("review already started");
    expect(readFileSync(join(dir, "batch.json")).equals(before)).toBe(true);
  });
  it("draftTopic writes nothing when the model throws DraftError", async () => {
    const failing: DraftModel = async () => {
      throw new DraftError("refused");
    };
    await expect(
      draftTopic({ briefPath, authorId, outRoot: outRoot(), model: failing }),
    ).rejects.toThrow(DraftError);
    expect(existsSync(join(outRoot(), brief.topic_code))).toBe(false);
  });
  it("flags a stem already used in another topic folder", async () => {
    mkdirSync(join(outRoot(), "other"), { recursive: true });
    const { dir } = await draftTopic({ briefPath, authorId, outRoot: outRoot(), model: fakeModel });
    writeFileSync(join(outRoot(), "other", "batch.json"), readFileSync(join(dir, "batch.json")));
    rmSync(dir, { recursive: true });
    const { report } = await draftTopic({
      briefPath,
      authorId,
      outRoot: outRoot(),
      model: fakeModel,
    });
    expect(report.ok).toBe(false);
  });
});

describe("claudeDraftModel", () => {
  const stub = (response: object) =>
    ({ beta: { messages: { parse: async () => response } } }) as unknown as Anthropic;
  it("claudeDraftModel throws DraftError on refusal and on max_tokens", async () => {
    const prompt = { system: "s", user: "u" };
    await expect(
      claudeDraftModel(
        stub({ stop_reason: "refusal", stop_details: { category: "cyber" }, parsed_output: null }),
      )(prompt),
    ).rejects.toThrow(/refusal.*cyber/);
    await expect(
      claudeDraftModel(stub({ stop_reason: "max_tokens", parsed_output: null }))(prompt),
    ).rejects.toThrow(DraftError);
    await expect(
      claudeDraftModel(stub({ stop_reason: "end_turn", parsed_output: null }))(prompt),
    ).rejects.toThrow(DraftError);
  });
  it("returns the parsed draft", async () => {
    const draft = await claudeDraftModel(
      stub({ stop_reason: "end_turn", parsed_output: modelDraft }),
    )({
      system: "s",
      user: "u",
    });
    expect(draft.items).toHaveLength(4);
  });
});
