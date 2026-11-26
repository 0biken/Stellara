import { randomUUID } from "node:crypto";

import {
  draftItemSchema,
  draftLessonSchema,
  type DraftItem,
  type DraftLesson,
} from "@stellara/content-schema/server";
import { z } from "zod";

import { PROMPT_VERSION, type ModelCard, type ModelDraft, type ModelItem } from "./schemas.js";

import type { TopicRef } from "./curriculum.js";

export interface ItemNote {
  key: string;
  distractor_notes: { option_id: string; why: string }[];
  check_expression: string | null;
}
export interface DraftBatch {
  batch_version: 1;
  topic_code: string;
  topic_id: string;
  drafting: { model: string; prompt_version: string; drafted_at: string; brief_sha256: string };
  items: DraftItem[];
  lesson: DraftLesson;
  /** Keyed by item UUID. */
  notes: Record<string, ItemNote>;
}

export interface ToDraftBatchInput {
  draft: ModelDraft;
  topic: TopicRef;
  topicCode: string;
  authorId: string;
  model: string;
  briefSha256: string;
  now: Date;
  newId?: () => string;
}

function answerFields(item: ModelItem): Record<string, unknown> {
  const options = item.options.map((option) => ({ id: option.id, text: option.text }));
  switch (item.type) {
    case "single_choice":
      return {
        options,
        ...(item.correct_option_id ? { answer: { option_id: item.correct_option_id } } : {}),
      };
    case "numeric":
      return item.numeric_answer ? { answer: { value: item.numeric_answer } } : {};
    case "ordering":
      return { options, answer: { option_ids: item.correct_order } };
  }
}

export function toDraftBatch(input: ToDraftBatchInput): DraftBatch {
  const newId = input.newId ?? randomUUID;
  const ids = new Map<string, string>();
  for (const item of input.draft.items) {
    if (ids.has(item.key)) throw new Error(`Model draft has a duplicate item key: ${item.key}`);
    ids.set(item.key, newId());
  }
  const idFor = (key: string): string => {
    const id = ids.get(key);
    if (!id) throw new Error(`Lesson card references an unknown item key: ${key}`);
    return id;
  };

  const notes: Record<string, ItemNote> = {};
  const items = input.draft.items.map((item) => {
    const id = idFor(item.key);
    notes[id] = {
      key: item.key,
      distractor_notes: item.distractor_notes,
      check_expression: item.check_expression,
    };
    return draftItemSchema.parse({
      id,
      version: 1,
      status: "draft",
      topic_id: input.topic.id,
      type: item.type,
      stem: item.stem,
      stimulus_id: null,
      explanation: item.explanation,
      hint: item.hint,
      difficulty: item.difficulty,
      tags: [],
      purpose: item.purpose,
      curriculum_edition: input.topic.curriculum_edition,
      media: [],
      exposure_count: 0,
      author_id: input.authorId,
      ...answerFields(item),
    });
  });

  const card = (entry: ModelCard): unknown => {
    switch (entry.kind) {
      case "explain":
      case "summary":
        return { kind: entry.kind, body: entry.body };
      case "worked_example":
        return { kind: entry.kind, body: entry.body, steps: entry.steps };
      case "check":
        if (entry.item_keys.length !== 1)
          throw new Error("A check card must reference exactly one item key");
        return { kind: "check", item_id: idFor(entry.item_keys[0]!) };
      case "try_it":
        return { kind: "try_it", item_ids: entry.item_keys.map(idFor) };
    }
  };
  const lesson = draftLessonSchema.parse({
    id: newId(),
    version: 1,
    topic_id: input.topic.id,
    title: input.draft.lesson.title,
    status: "draft",
    cards: input.draft.lesson.cards.map(card),
  });

  return {
    batch_version: 1,
    topic_code: input.topicCode,
    topic_id: input.topic.id,
    drafting: {
      model: input.model,
      prompt_version: PROMPT_VERSION,
      drafted_at: input.now.toISOString(),
      brief_sha256: input.briefSha256,
    },
    items,
    lesson,
    notes,
  };
}

const noteSchema = z.object({
  key: z.string().min(1),
  distractor_notes: z.array(z.object({ option_id: z.string(), why: z.string() })),
  check_expression: z.string().nullable(),
});
/** Reads a batch.json written by this package. */
export const draftBatchSchema = z.object({
  batch_version: z.literal(1),
  topic_code: z.string().min(1),
  topic_id: z.string().min(1),
  drafting: z.object({
    model: z.string(),
    prompt_version: z.string(),
    drafted_at: z.string(),
    brief_sha256: z.string(),
  }),
  items: z.array(draftItemSchema),
  lesson: draftLessonSchema,
  notes: z.record(z.string(), noteSchema),
});
