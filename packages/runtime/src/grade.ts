import { z } from "zod";

import type { ItemAnswer } from "@stellara/content-schema/server";

/**
 * Child response shapes, one per item type:
 * - single_choice `{ choice }`, multi_choice `{ choices }`, numeric `{ value }`,
 * - ordering `{ order }`, match `{ pairs: [{ left_id, right_id }] }`,
 * - cloze `{ slots: [{ slot_id, option_id }] }`.
 */
const id = z.string().min(1);
const responseSchemas = {
  single_choice: z.object({ choice: id }),
  multi_choice: z.object({ choices: z.array(id) }),
  numeric: z.object({ value: z.union([z.string(), z.number()]) }),
  ordering: z.object({ order: z.array(id) }),
  match: z.object({ pairs: z.array(z.object({ left_id: id, right_id: id })) }),
  cloze: z.object({ slots: z.array(z.object({ slot_id: id, option_id: id })) }),
};

const sameSet = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && new Set(a).size === a.length && b.every((x) => a.includes(x));
const sameSequence = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((x, i) => x === b[i]);
const pairsMatch = (
  expected: readonly { readonly key: string; readonly value: string }[],
  given: readonly { readonly key: string; readonly value: string }[],
) => {
  if (given.length !== expected.length) return false;
  const map = new Map<string, string>();
  for (const { key, value } of given) {
    if (map.has(key)) return false;
    map.set(key, value);
  }
  return expected.every(({ key, value }) => map.get(key) === value);
};

function parseNumber(value: string | number): number | null {
  const text = typeof value === "number" ? String(value) : value.replace(/\s+/g, "");
  if (!/^[+-]?(\d+\.?\d*|\.\d+)$/.test(text)) return null;
  return Number(text);
}

/** Server-side marking. Returns "invalid" when the response does not fit the item type. */
export function gradeResponse(key: ItemAnswer, response: unknown): boolean | "invalid" {
  switch (key.type) {
    case "single_choice": {
      const r = responseSchemas.single_choice.safeParse(response);
      return r.success ? r.data.choice === key.answer.option_id : "invalid";
    }
    case "multi_choice": {
      const r = responseSchemas.multi_choice.safeParse(response);
      return r.success ? sameSet(r.data.choices, key.answer.option_ids) : "invalid";
    }
    case "numeric": {
      const r = responseSchemas.numeric.safeParse(response);
      if (!r.success) return "invalid";
      const given = parseNumber(r.data.value);
      return given === null ? "invalid" : given === Number(key.answer.value);
    }
    case "ordering": {
      const r = responseSchemas.ordering.safeParse(response);
      return r.success ? sameSequence(r.data.order, key.answer.option_ids) : "invalid";
    }
    case "match": {
      const r = responseSchemas.match.safeParse(response);
      if (!r.success) return "invalid";
      return pairsMatch(
        key.answer.pairs.map((p) => ({ key: p.left_id, value: p.right_id })),
        r.data.pairs.map((p) => ({ key: p.left_id, value: p.right_id })),
      );
    }
    case "cloze": {
      const r = responseSchemas.cloze.safeParse(response);
      if (!r.success) return "invalid";
      return pairsMatch(
        key.answer.slots.map((s) => ({ key: s.slot_id, value: s.option_id })),
        r.data.slots.map((s) => ({ key: s.slot_id, value: s.option_id })),
      );
    }
  }
}

/** Extracts the answer key from a published item without exposing the rest. */
export function answerKey(item: { type: ItemAnswer["type"]; answer: unknown }): ItemAnswer {
  return { type: item.type, answer: item.answer } as ItemAnswer;
}
