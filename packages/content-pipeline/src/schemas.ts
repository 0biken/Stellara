import { z } from "zod";

export const PROMPT_VERSION = "pilot-1";
/** Proposed ceiling pending academic decision B6; warning only. */
export const MAX_SENTENCE_WORDS = 20;

const text = z.string().trim().min(1);
const difficulty = z.enum(["easy", "standard", "hard"]);

export const topicBriefSchema = z.object({
  topic_code: z
    .string()
    .regex(/^[a-z_]+\.s\d+\.t\d+$/, "Use a topic code such as mathematics.s1.t1"),
  objectives: z.array(text).min(1),
  in_scope: text,
  out_of_scope: text,
  common_mistakes: z.array(z.object({ mistake: text, why: text })).min(2),
  method: text,
  key_words: z.array(text),
  example_questions: z.object({ easy: text, standard: text, hard: text }),
  exam_angle: text,
  sources: z.array(
    z.object({ title: text, edition: text, pages: text, reuse: z.enum(["yes", "no", "unknown"]) }),
  ),
  /** Private contributor reference. Never sent to the model. */
  filled_by: text.optional(),
});
export type TopicBrief = z.infer<typeof topicBriefSchema>;

// Model-facing shapes use nullable fields and no unions so they suit structured outputs.
export const modelItemSchema = z.object({
  key: text,
  purpose: z.enum(["practice", "lesson_check"]),
  type: z.enum(["single_choice", "numeric", "ordering"]),
  difficulty,
  stem: text,
  options: z.array(z.object({ id: text, text: text })),
  correct_option_id: text.nullable(),
  correct_order: z.array(text),
  numeric_answer: text.nullable(),
  explanation: text,
  hint: text,
  distractor_notes: z.array(z.object({ option_id: text, why: text })),
  check_expression: text.nullable(),
});
export type ModelItem = z.infer<typeof modelItemSchema>;

export const modelCardSchema = z.object({
  kind: z.enum(["explain", "worked_example", "check", "try_it", "summary"]),
  body: text.nullable(),
  steps: z.array(text),
  item_keys: z.array(text),
});
export type ModelCard = z.infer<typeof modelCardSchema>;

export const modelDraftSchema = z.object({
  items: z.array(modelItemSchema).min(1),
  lesson: z.object({ title: text, cards: z.array(modelCardSchema) }),
});
export type ModelDraft = z.infer<typeof modelDraftSchema>;
