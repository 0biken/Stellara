import {
  publishedItemSchema,
  publishedLessonSchema,
  type DraftItem,
} from "@stellara/content-schema/server";

import { machineCheck, type MachineCheck } from "./arithmetic.js";
import { MAX_SENTENCE_WORDS } from "./schemas.js";

import type { DraftBatch } from "./batch.js";
import type { z } from "zod";

export interface ItemCheck {
  item_id: string;
  key: string;
  errors: string[];
  warnings: string[];
  machine_check: MachineCheck;
}
export interface CheckReport {
  topic_code: string;
  ok: boolean;
  batch_errors: string[];
  batch_warnings: string[];
  items: ItemCheck[];
}

/** From 08 §10 "Never say", plus exam-body claims from 03 §1. */
export const BANNED_TERMS = [
  "weak areas",
  "failed",
  "you are ready",
  "guaranteed score",
  "hurry",
  "expo",
  "runz",
  "live questions",
  "official jamb",
  "official neco",
  "ai tutor",
];
export const PROVENANCE_WARNING = "provenance pending counsel (G3)";

// Fixed placeholders that let a draft be tested against the publication schema.
const PLACEHOLDER_REVIEW = {
  provenance: "original",
  author_id: "00000000-0000-4000-8000-0000000000aa",
  reviewer_id: "00000000-0000-4000-8000-0000000000bb",
  answer_verified_at: "1970-01-01T00:00:00Z",
  stimulus_id: null,
  tags: [],
  media: [],
  exposure_count: 0,
};

const describeIssues = (error: z.ZodError) =>
  error.issues.map((issue) =>
    issue.path.length ? `${issue.path.join(".")}: ${issue.message}` : issue.message,
  );

export const normaliseStem = (stem: string) =>
  stem
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();

function bannedIn(text: string | undefined | null): string[] {
  if (!text) return [];
  const lower = text.toLowerCase();
  return BANNED_TERMS.filter((term) => new RegExp(`\\b${term}\\b`).test(lower));
}

const unbalancedDollar = (text: string | undefined) =>
  ((text ?? "").match(/(?<!\\)\$/g) ?? []).length % 2 === 1;

function checkItem(batch: DraftBatch, item: DraftItem, seen: Map<string, string>): ItemCheck {
  const note = batch.notes[item.id];
  const errors: string[] = [];
  const warnings: string[] = [];

  const published = publishedItemSchema.safeParse({
    ...PLACEHOLDER_REVIEW,
    ...item,
    status: "published",
  });
  if (!published.success) errors.push(...describeIssues(published.error));
  if (!item.explanation?.trim()) errors.push("An explanation is required");
  if (!item.hint?.trim()) errors.push("A hint is required");

  if (item.type === "single_choice") {
    const noted = new Set((note?.distractor_notes ?? []).map((entry) => entry.option_id));
    for (const option of item.options ?? [])
      if (option.id !== item.answer?.option_id && !noted.has(option.id))
        errors.push(`Wrong option ${option.id} needs a distractor note`);
  }

  const stemKey = normaliseStem(item.stem ?? "");
  const earlier = seen.get(stemKey);
  if (earlier) errors.push(`Duplicate stem (also ${earlier})`);
  else seen.set(stemKey, note?.key ?? item.id);

  for (const [field, text] of [
    ["stem", item.stem],
    ["explanation", item.explanation],
  ] as const)
    if (unbalancedDollar(text)) errors.push(`Unbalanced $ maths delimiter in ${field}`);
  for (const text of [item.stem, item.explanation, item.hint])
    for (const term of bannedIn(text)) errors.push(`Banned term "${term}"`);

  const check = machineCheck(item, note?.check_expression ?? null);
  if (check.status === "mismatch" || check.status === "error")
    errors.push(`Machine check ${check.status}: ${check.detail}`);
  if (check.status === "unchecked")
    warnings.push(`Reviewer must work this answer by hand (${check.detail})`);

  for (const sentence of (item.stem ?? "").split(/(?<=[.?!])\s+/)) {
    const words = sentence.split(/\s+/).filter(Boolean).length;
    if (words > MAX_SENTENCE_WORDS)
      warnings.push(`Stem sentence has ${words} words (proposed limit ${MAX_SENTENCE_WORDS})`);
  }

  return { item_id: item.id, key: note?.key ?? item.id, errors, warnings, machine_check: check };
}

export function checkBatch(batch: DraftBatch, existingStems: string[] = []): CheckReport {
  const batchErrors: string[] = [];
  const seen = new Map(existingStems.map((stem) => [normaliseStem(stem), "an existing batch"]));
  const items = batch.items.map((item) => checkItem(batch, item, seen));

  const practice = batch.items.filter((item) => item.purpose === "practice");
  if (practice.length !== 3)
    batchErrors.push(`Expected 3 practice items, found ${practice.length}`);
  for (const level of ["easy", "standard", "hard"] as const) {
    const count = practice.filter((item) => item.difficulty === level).length;
    if (count !== 1) batchErrors.push(`Expected one ${level} practice item, found ${count}`);
  }
  if (!batch.items.some((item) => item.purpose === "lesson_check"))
    batchErrors.push("Expected at least one lesson_check item");

  const lesson = publishedLessonSchema.safeParse({ ...batch.lesson, status: "published" });
  if (!lesson.success) batchErrors.push(...describeIssues(lesson.error).map((m) => `Lesson: ${m}`));
  const byId = new Map(batch.items.map((item) => [item.id, item]));
  for (const card of batch.lesson.cards ?? []) {
    const ids =
      card.kind === "check" ? [card.item_id] : card.kind === "try_it" ? card.item_ids : [];
    for (const id of ids)
      if (byId.get(id)?.purpose !== "lesson_check")
        batchErrors.push(`Lesson ${card.kind} card must reference a lesson_check item (${id})`);
    const texts = "body" in card ? [card.body, ...("steps" in card ? card.steps : [])] : [];
    for (const text of texts)
      for (const term of bannedIn(text)) batchErrors.push(`Lesson: banned term "${term}"`);
  }

  const ok = batchErrors.length === 0 && items.every((item) => item.errors.length === 0);
  return {
    topic_code: batch.topic_code,
    ok,
    batch_errors: batchErrors,
    batch_warnings: [PROVENANCE_WARNING],
    items,
  };
}
