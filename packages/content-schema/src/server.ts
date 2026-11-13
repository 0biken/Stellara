import { z } from "zod";

import {
  uuidSchema,
  versionSchema,
  curriculumEditionSchema,
  optionsSchema,
  clozeSlotsSchema,
  itemTypeSchema,
  mediaSchema,
} from "./client.js";

const text = z.string().trim().min(1);
const uniqueStrings = z
  .array(text)
  .min(1)
  .refine((values) => new Set(values).size === values.length, "References must be unique");
export const numericAnswerSchema = z.object({
  value: z
    .string()
    .refine(
      (value) => Number.isFinite(Number(value)) && String(Number(value)) === value,
      "Use a finite canonical numeric string",
    ),
});
export const singleChoiceAnswerSchema = z.object({ option_id: text });
export const multiChoiceAnswerSchema = z.object({ option_ids: uniqueStrings });
export const orderingAnswerSchema = z.object({ option_ids: uniqueStrings });
export const matchAnswerSchema = z.object({
  pairs: z.array(z.object({ left_id: text, right_id: text })).min(1),
});
export const clozeAnswerSchema = z.object({
  slots: z.array(z.object({ slot_id: text, option_id: text })).min(1),
});
export const itemAnswerSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("single_choice"), answer: singleChoiceAnswerSchema }),
  z.object({ type: z.literal("multi_choice"), answer: multiChoiceAnswerSchema }),
  z.object({ type: z.literal("numeric"), answer: numericAnswerSchema }),
  z.object({ type: z.literal("ordering"), answer: orderingAnswerSchema }),
  z.object({ type: z.literal("match"), answer: matchAnswerSchema }),
  z.object({ type: z.literal("cloze"), answer: clozeAnswerSchema }),
]);
export const contentStatusSchema = z.enum([
  "draft",
  "in_review",
  "changes_requested",
  "approved",
  "published",
  "retired",
]);
export const provenanceSchema = z.enum(["original", "licensed", "public_domain"]);
const reviewShape = {
  provenance: provenanceSchema,
  licence_ref: text.optional(),
  author_id: uuidSchema,
  reviewer_id: uuidSchema,
  answer_verified_at: z.iso.datetime({ offset: true }),
};
const commonShape = {
  id: uuidSchema,
  version: versionSchema,
  topic_id: uuidSchema,
  stem: text,
  stimulus_id: uuidSchema.nullable(),
  explanation: text,
  hint: text.optional(),
  difficulty: z.enum(["easy", "standard", "hard"]),
  tags: z.array(text),
  curriculum_edition: curriculumEditionSchema,
  media: z.array(mediaSchema),
  exposure_count: z.number().int().nonnegative(),
};
const draftCommon = z
  .object({ ...commonShape, ...reviewShape })
  .partial()
  .extend({
    id: uuidSchema,
    version: versionSchema,
    topic_id: uuidSchema,
    media: z.array(z.object({ src: text, alt_text: z.string().optional() })).optional(),
    status: contentStatusSchema.exclude(["published"]),
  });
// Draft bodies intentionally allow missing fields while preserving known-field types.
export const draftItemSchema = z.discriminatedUnion("type", [
  draftCommon.extend({
    type: z.literal("single_choice"),
    options: optionsSchema.optional(),
    answer: singleChoiceAnswerSchema.optional(),
  }),
  draftCommon.extend({
    type: z.literal("multi_choice"),
    options: optionsSchema.optional(),
    answer: multiChoiceAnswerSchema.optional(),
  }),
  draftCommon.extend({ type: z.literal("numeric"), answer: numericAnswerSchema.optional() }),
  draftCommon.extend({
    type: z.literal("ordering"),
    options: optionsSchema.optional(),
    answer: orderingAnswerSchema.optional(),
  }),
  draftCommon.extend({
    type: z.literal("match"),
    left: optionsSchema.optional(),
    right: optionsSchema.optional(),
    answer: matchAnswerSchema.optional(),
  }),
  draftCommon.extend({
    type: z.literal("cloze"),
    slots: clozeSlotsSchema.optional(),
    answer: clozeAnswerSchema.optional(),
  }),
]);
const publishedCommon = { ...commonShape, ...reviewShape, status: z.literal("published") };
const publishedUnion = z.discriminatedUnion("type", [
  z.object({
    ...publishedCommon,
    type: z.literal("single_choice"),
    options: optionsSchema,
    answer: singleChoiceAnswerSchema,
  }),
  z.object({
    ...publishedCommon,
    type: z.literal("multi_choice"),
    options: optionsSchema,
    answer: multiChoiceAnswerSchema,
  }),
  z.object({ ...publishedCommon, type: z.literal("numeric"), answer: numericAnswerSchema }),
  z.object({
    ...publishedCommon,
    type: z.literal("ordering"),
    options: optionsSchema,
    answer: orderingAnswerSchema,
  }),
  z.object({
    ...publishedCommon,
    type: z.literal("match"),
    left: optionsSchema,
    right: optionsSchema,
    answer: matchAnswerSchema,
  }),
  z.object({
    ...publishedCommon,
    type: z.literal("cloze"),
    slots: clozeSlotsSchema,
    answer: clozeAnswerSchema,
  }),
]);
export const publishedItemSchema = publishedUnion.superRefine((item, ctx) => {
  const issue = (message: string) => ctx.addIssue({ code: "custom", message });
  if (item.provenance === "licensed" && !item.licence_ref)
    issue("Licensed items require licence_ref");
  if (item.author_id === item.reviewer_id) issue("Author and reviewer must differ");
  switch (item.type) {
    case "single_choice":
      if (!item.options.some((option) => option.id === item.answer.option_id))
        issue("Answer must reference an option");
      break;
    case "multi_choice":
    case "ordering": {
      const ids = new Set(item.options.map((option) => option.id));
      if (item.answer.option_ids.some((id) => !ids.has(id)))
        issue("Answer references unknown option");
      if (item.type === "ordering" && item.answer.option_ids.length !== ids.size)
        issue("Ordering must include every option exactly once");
      break;
    }
    case "match": {
      const left = new Set(item.left.map((option) => option.id));
      const right = new Set(item.right.map((option) => option.id));
      const pairs = item.answer.pairs;
      if (
        pairs.length !== left.size ||
        new Set(pairs.map((pair) => pair.left_id)).size !== left.size ||
        new Set(pairs.map((pair) => pair.right_id)).size !== pairs.length ||
        pairs.some((pair) => !left.has(pair.left_id) || !right.has(pair.right_id))
      )
        issue("Match answers must map each left option once to distinct existing right options");
      break;
    }
    case "cloze": {
      const answers = item.answer.slots;
      if (
        answers.length !== item.slots.length ||
        new Set(answers.map((answer) => answer.slot_id)).size !== item.slots.length ||
        answers.some(
          (answer) =>
            !item.slots.some(
              (slot) =>
                slot.id === answer.slot_id &&
                slot.options.some((option) => option.id === answer.option_id),
            ),
        )
      )
        issue("Cloze answers must reference each slot and a valid option exactly once");
      break;
    }
    case "numeric":
      break;
  }
});
export const itemSchema = z.union([publishedItemSchema, draftItemSchema]);
export type DraftItem = z.infer<typeof draftItemSchema>;
export type PublishedItem = z.infer<typeof publishedItemSchema>;
export type ItemAnswer = z.infer<typeof itemAnswerSchema>;

const stimulusShape = {
  id: uuidSchema,
  version: versionSchema,
  kind: z.enum(["passage", "table", "diagram"]),
  body: text,
  media: z.array(mediaSchema),
  alt_text: text.optional(),
  provenance: provenanceSchema,
  licence_ref: text.optional(),
};
export const stimulusSchema = z
  .object(stimulusShape)
  .partial()
  .extend({ id: uuidSchema, version: versionSchema, kind: stimulusShape.kind });
export const publishedStimulusSchema = z.object(stimulusShape).superRefine((stimulus, ctx) => {
  if (stimulus.provenance === "licensed" && !stimulus.licence_ref)
    ctx.addIssue({ code: "custom", message: "Licensed stimuli require licence_ref" });
  if (stimulus.kind === "diagram" && !stimulus.alt_text)
    ctx.addIssue({ code: "custom", message: "Diagram alt_text is required" });
});
export const lessonCardSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("explain"), body: text, media: z.array(mediaSchema).optional() }),
  z.object({ kind: z.literal("worked_example"), body: text, steps: z.array(text).min(1) }),
  z.object({ kind: z.literal("check"), item_id: uuidSchema }),
  z.object({
    kind: z.literal("try_it"),
    item_ids: z
      .array(uuidSchema)
      .min(2)
      .max(3)
      .refine((ids) => new Set(ids).size === ids.length, "Practice references must be distinct"),
  }),
  z.object({ kind: z.literal("summary"), body: text }),
]);
export const lessonSchema = z.object({
  id: uuidSchema,
  version: versionSchema,
  topic_id: uuidSchema,
  cards: z.array(lessonCardSchema).min(3).max(6),
});
export type Lesson = z.infer<typeof lessonSchema>;
export type Stimulus = z.infer<typeof publishedStimulusSchema>;
export { itemTypeSchema };
