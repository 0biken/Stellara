import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";

import { toDraftBatch } from "./batch.js";
import { checkBatch, type CheckReport } from "./checks.js";
import { findTopic, loadCurriculum } from "./curriculum.js";
import { otherStems, readJson, writeJson } from "./files.js";
import { buildPrompt } from "./prompt.js";
import { modelDraftSchema, topicBriefSchema, type ModelDraft } from "./schemas.js";

export const MODEL = "claude-opus-5-5";
export type DraftModel = (prompt: { system: string; user: string }) => Promise<ModelDraft>;

export class DraftError extends Error {
  override name = "DraftError";
}

/**
 * Calls Claude with structured outputs; the server retries on another model after a refusal.
 * Uses create, not parse: parse throws its own JSON error before the stop reason can be read.
 */
export function claudeDraftModel(client?: Anthropic): DraftModel {
  return async ({ system, user }) => {
    const api = client ?? new Anthropic();
    const response = await api.beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "high", format: betaZodOutputFormat(modelDraftSchema) },
      system,
      messages: [{ role: "user", content: user }],
    });
    if (response.stop_reason === "refusal") {
      const category = response.stop_details?.category ?? "unknown";
      throw new DraftError(`Claude stopped with refusal (category ${category})`);
    }
    if (response.stop_reason === "max_tokens")
      throw new DraftError("Claude stopped with max_tokens before finishing the draft");
    const text = response.content
      .flatMap((block) => (block.type === "text" ? [block.text] : []))
      .join("");
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      throw new DraftError(`Claude returned invalid JSON (stop reason ${response.stop_reason})`);
    }
    const parsed = modelDraftSchema.safeParse(json);
    if (!parsed.success)
      throw new DraftError(
        `Claude's draft does not match the schema (stop reason ${response.stop_reason}): ${parsed.error.issues
          .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
          .join("; ")}`,
      );
    return parsed.data;
  };
}

export interface DraftTopicOptions {
  briefPath: string;
  authorId: string;
  outRoot: string;
  model: DraftModel;
  now?: Date;
}

export async function draftTopic(
  opts: DraftTopicOptions,
): Promise<{ dir: string; report: CheckReport }> {
  const brief = readJson(opts.briefPath, topicBriefSchema);
  const dir = join(opts.outRoot, brief.topic_code);
  if (existsSync(join(dir, "review.json")))
    throw new Error(`review already started in ${dir}; move review.json away to redraft`);
  const topic = findTopic(loadCurriculum(), brief.topic_code);

  const draft = await opts.model(buildPrompt(brief, topic.title));
  const batch = toDraftBatch({
    draft,
    topic,
    topicCode: brief.topic_code,
    authorId: opts.authorId,
    model: MODEL,
    briefSha256: createHash("sha256").update(readFileSync(opts.briefPath)).digest("hex"),
    now: opts.now ?? new Date(),
  });
  const report = checkBatch(batch, otherStems(opts.outRoot, dir));

  mkdirSync(dir, { recursive: true });
  writeJson(join(dir, "batch.json"), batch);
  writeJson(join(dir, "check.json"), report);
  return { dir, report };
}
