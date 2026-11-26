import { z } from "zod";

export const uuidSchema = z.uuid().transform((value) => value.toLowerCase());
export const versionSchema = z.number().int().positive();
export const curriculumEditionSchema = z.enum(["legacy", "revised_2025"]);
export const itemPurposeSchema = z
  .enum(["practice", "lesson_check", "placement"])
  .default("practice");
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
  purpose: itemPurposeSchema,
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
      purpose: itemPurposeSchema.optional(),
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
    purpose: source.purpose ?? "practice",
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

export const clientLessonCardSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("explain"),
    body: z.string().min(1),
    media: z.array(mediaSchema).optional(),
  }),
  z.object({
    kind: z.literal("worked_example"),
    body: z.string().min(1),
    steps: z.array(z.string().min(1)).min(1),
  }),
  z.object({ kind: z.literal("check"), item: clientItemSchema }),
  z.object({ kind: z.literal("try_it"), items: z.array(clientItemSchema).min(2).max(3) }),
  z.object({ kind: z.literal("summary"), body: z.string().min(1) }),
]);
export type ClientLessonCard = z.infer<typeof clientLessonCardSchema>;

export const clientLessonSchema = z.object({
  id: uuidSchema,
  version: versionSchema,
  topic_id: uuidSchema,
  title: z.string().trim().min(1).optional(),
  cards: z.array(clientLessonCardSchema).min(3).max(6),
});
export type ClientLesson = z.infer<typeof clientLessonSchema>;

/** Projects a published lesson and its referenced items through recursive allowlists. */
export function projectLessonForClient(
  lessonInput: unknown,
  itemsMap: Map<string, unknown> | Record<string, unknown>,
): ClientLesson {
  const getRawItem = (id: string): unknown => {
    if (itemsMap instanceof Map) return itemsMap.get(id);
    return (itemsMap as Record<string, unknown>)[id];
  };

  const raw = z
    .object({
      id: uuidSchema,
      version: versionSchema,
      topic_id: uuidSchema,
      title: z.string().trim().min(1).optional(),
      cards: z.array(
        z.discriminatedUnion("kind", [
          z.object({
            kind: z.literal("explain"),
            body: z.string().min(1),
            media: z.array(mediaSchema).optional(),
          }),
          z.object({
            kind: z.literal("worked_example"),
            body: z.string().min(1),
            steps: z.array(z.string().min(1)).min(1),
          }),
          z.object({ kind: z.literal("check"), item_id: uuidSchema }),
          z.object({ kind: z.literal("try_it"), item_ids: z.array(uuidSchema).min(2).max(3) }),
          z.object({ kind: z.literal("summary"), body: z.string().min(1) }),
        ]),
      ),
    })
    .parse(lessonInput);

  const projectedCards = raw.cards.map((card) => {
    if (card.kind === "check") {
      const itemRaw = getRawItem(card.item_id);
      if (!itemRaw) throw new Error(`Referenced item ${card.item_id} not found in items map`);
      return { kind: "check" as const, item: projectItemForClient(itemRaw) };
    }
    if (card.kind === "try_it") {
      const items = card.item_ids.map((id) => {
        const itemRaw = getRawItem(id);
        if (!itemRaw) throw new Error(`Referenced item ${id} not found in items map`);
        return projectItemForClient(itemRaw);
      });
      return { kind: "try_it" as const, items };
    }
    return card;
  });

  return clientLessonSchema.parse({
    id: raw.id,
    version: raw.version,
    topic_id: raw.topic_id,
    title: raw.title,
    cards: projectedCards,
  });
}
