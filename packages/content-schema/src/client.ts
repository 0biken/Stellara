import { z } from "zod";

export const uuidSchema = z.uuid().transform((value) => value.toLowerCase());
export const versionSchema = z.number().int().positive();
export const curriculumEditionSchema = z.enum(["legacy", "revised_2025"]);
export const itemTypeSchema = z.enum([
  "single_choice",
  "multi_choice",
  "numeric",
  "ordering",
  "match",
  "cloze",
]);
export const mediaSchema = z.object({ src: z.string().min(1), alt_text: z.string().trim().min(1) });
export const optionSchema = z.object({ id: z.string().min(1), text: z.string().min(1) });
export const optionsSchema = z
  .array(optionSchema)
  .min(2)
  .refine(
    (options) => new Set(options.map((option) => option.id)).size === options.length,
    "Option IDs must be unique",
  );
export const clozeSlotSchema = z.object({ id: z.string().min(1), options: optionsSchema });
export const clozeSlotsSchema = z
  .array(clozeSlotSchema)
  .min(1)
  .refine(
    (slots) => new Set(slots.map((slot) => slot.id)).size === slots.length,
    "Slot IDs must be unique",
  );

const clientBase = {
  id: uuidSchema,
  version: versionSchema,
  topic_id: uuidSchema,
  stem: z.string().trim().min(1),
  stimulus_id: uuidSchema.nullable(),
  difficulty: z.enum(["easy", "standard", "hard"]),
  tags: z.array(z.string()),
  curriculum_edition: curriculumEditionSchema,
  media: z.array(mediaSchema),
  hint_available: z.boolean(),
};
export const clientItemSchema = z.discriminatedUnion("type", [
  z.object({ ...clientBase, type: z.literal("single_choice"), options: optionsSchema }),
  z.object({ ...clientBase, type: z.literal("multi_choice"), options: optionsSchema }),
  z.object({ ...clientBase, type: z.literal("numeric") }),
  z.object({ ...clientBase, type: z.literal("ordering"), options: optionsSchema }),
  z.object({ ...clientBase, type: z.literal("match"), left: optionsSchema, right: optionsSchema }),
  z.object({ ...clientBase, type: z.literal("cloze"), slots: clozeSlotsSchema }),
]);
export type ClientItem = z.infer<typeof clientItemSchema>;

/** Projects through a recursive allowlist; authoring objects never pass through. */
export function projectItemForClient(input: unknown): ClientItem {
  const source = z
    .object({
      ...clientBase,
      hint_available: z.boolean().optional(),
      hint: z.string().nullable().optional(),
      type: itemTypeSchema,
      options: z.unknown().optional(),
      left: z.unknown().optional(),
      right: z.unknown().optional(),
      slots: z.unknown().optional(),
    })
    .parse(input);
  return clientItemSchema.parse({
    id: source.id,
    version: source.version,
    topic_id: source.topic_id,
    type: source.type,
    stem: source.stem,
    stimulus_id: source.stimulus_id,
    difficulty: source.difficulty,
    tags: source.tags,
    curriculum_edition: source.curriculum_edition,
    media: source.media,
    hint_available: Boolean(source.hint?.trim()) || source.hint_available === true,
    options: source.options,
    left: source.left,
    right: source.right,
    slots: source.slots,
  });
}

export const clientStimulusSchema = z.object({
  id: uuidSchema,
  version: versionSchema,
  kind: z.enum(["passage", "table", "diagram"]),
  body: z.string().min(1),
  media: z.array(mediaSchema),
  alt_text: z.string().optional(),
});
