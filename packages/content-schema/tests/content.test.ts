import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { projectItemForClient } from "../src/client.js";
import { curriculumSchema, blueprintSchema, publishedBlueprintSchema } from "../src/curriculum.js";
import * as publicApi from "../src/index.js";
import {
  draftItemSchema,
  publishedItemSchema,
  lessonSchema,
  stimulusSchema,
  publishedStimulusSchema,
} from "../src/server.js";

const id = "10000000-0000-4000-8000-000000000001";
const reviewer = "10000000-0000-4000-8000-000000000002";
const options = [
  { id: "a", text: "One" },
  { id: "b", text: "Two" },
];
const base = {
  id,
  version: 1,
  topic_id: id,
  stem: "Choose a value.",
  stimulus_id: null,
  explanation: "A worked solution",
  hint: "Consider place value",
  difficulty: "standard",
  tags: [],
  curriculum_edition: "revised_2025",
  media: [],
  provenance: "original",
  author_id: id,
  reviewer_id: reviewer,
  answer_verified_at: "2026-11-13T10:00:00Z",
  status: "published",
  exposure_count: 0,
};
const fixtures = [
  { ...base, type: "single_choice", options, answer: { option_id: "a" } },
  { ...base, type: "multi_choice", options, answer: { option_ids: ["a", "b"] } },
  { ...base, type: "numeric", answer: { value: "2.5" } },
  { ...base, type: "ordering", options, answer: { option_ids: ["b", "a"] } },
  {
    ...base,
    type: "match",
    left: options,
    right: options,
    answer: {
      pairs: [
        { left_id: "a", right_id: "b" },
        { left_id: "b", right_id: "a" },
      ],
    },
  },
  {
    ...base,
    type: "cloze",
    slots: [{ id: "first", options }],
    answer: { slots: [{ slot_id: "first", option_id: "a" }] },
  },
] as const;
describe("item boundaries", () => {
  it("rejects the same author and reviewer UUID written with different letter case", () => {
    const author_id = "abcdefab-cdef-4abc-8def-abcdefabcdef";
    expect(
      publishedItemSchema.safeParse({
        ...fixtures[0],
        author_id,
        reviewer_id: author_id.toUpperCase(),
      }).success,
    ).toBe(false);
  });
  it("normalizes client UUID identity fields to lowercase", () => {
    const canonical = "abcdefab-cdef-4abc-8def-abcdefabcdef";
    const projected = projectItemForClient({
      ...fixtures[0],
      id: canonical.toUpperCase(),
      topic_id: canonical.toUpperCase(),
      stimulus_id: canonical.toUpperCase(),
    });
    expect(projected.id).toBe(canonical);
    expect(projected.topic_id).toBe(canonical);
    expect(projected.stimulus_id).toBe(canonical);
  });
  it.each(fixtures)("validates published $type", (fixture) =>
    expect(publishedItemSchema.safeParse(fixture).success).toBe(true),
  );
  it.each(fixtures)("rejects invalid answer for $type", (fixture) => {
    const badAnswers = {
      single_choice: { option_id: "missing" },
      multi_choice: { option_ids: ["missing"] },
      numeric: { value: "Infinity" },
      ordering: { option_ids: ["a"] },
      match: { pairs: [{ left_id: "missing", right_id: "a" }] },
      cloze: { slots: [{ slot_id: "missing", option_id: "a" }] },
    };
    expect(
      publishedItemSchema.safeParse({
        ...fixture,
        answer: badAnswers[fixture.type as keyof typeof badAnswers],
      }).success,
    ).toBe(false);
  });
  it("permits incomplete draft but never publishes it", () => {
    const draft = { id, version: 1, topic_id: id, type: "numeric", status: "draft" };
    expect(draftItemSchema.safeParse(draft).success).toBe(true);
    expect(publishedItemSchema.safeParse({ ...draft, status: "published" }).success).toBe(false);
  });
  it("enforces publishing review, rights, version, edition and media guards", () => {
    for (const change of [
      { reviewer_id: id },
      { answer_verified_at: null },
      { provenance: "licensed" },
      { version: 0 },
      { curriculum_edition: undefined },
      { media: [{ src: "/figure.svg", alt_text: "" }] },
    ]) {
      expect(publishedItemSchema.safeParse({ ...fixtures[0], ...change }).success).toBe(false);
    }
  });
  it("rejects duplicate options and noncanonical/nonfinite numeric answers", () => {
    expect(
      publishedItemSchema.safeParse({ ...fixtures[0], options: [options[0], options[0]] }).success,
    ).toBe(false);
    for (const value of ["02", "2.0", "-0", "NaN", "1e999"])
      expect(publishedItemSchema.safeParse({ ...fixtures[2], answer: { value } }).success).toBe(
        false,
      );
  });
  it("rejects repeated and unknown answer references in complex bodies", () => {
    for (const fixture of [
      { ...fixtures[1], answer: { option_ids: ["a", "a"] } },
      { ...fixtures[3], answer: { option_ids: ["a", "missing"] } },
      {
        ...fixtures[4],
        answer: {
          pairs: [
            { left_id: "a", right_id: "a" },
            { left_id: "a", right_id: "b" },
          ],
        },
      },
      { ...fixtures[5], answer: { slots: [{ slot_id: "first", option_id: "missing" }] } },
    ])
      expect(publishedItemSchema.safeParse(fixture).success).toBe(false);
  });
  it("permits drafting media before alt text is written", () => {
    expect(
      draftItemSchema.safeParse({
        id,
        version: 1,
        topic_id: id,
        type: "numeric",
        status: "draft",
        media: [{ src: "/draft.svg" }],
      }).success,
    ).toBe(true);
  });
  it.each(fixtures)("projects only safe $type fields at every depth", (fixture) => {
    const projected = projectItemForClient({
      ...fixture,
      options: options.map((option) => ({ ...option, answer: "secret" })),
      stats: { answer: "secret" },
    });
    const json = JSON.stringify(projected);
    for (const key of ["answer", "author_id", "reviewer_id", "explanation", '"hint"', "secret"])
      expect(json).not.toContain(key);
    expect(projected.hint_available).toBe(true);
  });
  it("does not export authoring or answer schemas publicly", () => {
    expect(publicApi).not.toHaveProperty("publishedItemSchema");
    expect(publicApi).not.toHaveProperty("itemAnswerSchema");
    expect(readFileSync(new URL("../src/client.ts", import.meta.url), "utf8")).not.toMatch(
      /from ['"].*server/,
    );
    expect(() => projectItemForClient({ type: "numeric" })).toThrow();
  });
});
describe("content structures", () => {
  it("requires 3–6 lesson cards and 2–3 try-it references", () => {
    const lesson = {
      id,
      version: 1,
      topic_id: id,
      cards: [
        { kind: "explain", body: "Idea" },
        { kind: "try_it", item_ids: [id, reviewer] },
        { kind: "summary", body: "Remember" },
      ],
    };
    expect(lessonSchema.safeParse(lesson).success).toBe(true);
    expect(lessonSchema.safeParse({ ...lesson, cards: lesson.cards.slice(0, 2) }).success).toBe(
      false,
    );
    expect(
      lessonSchema.safeParse({
        ...lesson,
        cards: [{ kind: "try_it", item_ids: [id] }, ...lesson.cards],
      }).success,
    ).toBe(false);
    expect(
      lessonSchema.safeParse({
        ...lesson,
        cards: [
          { kind: "explain", body: "Idea" },
          { kind: "worked_example", body: "Example", steps: ["First", "Next"] },
          { kind: "check", item_id: id },
          { kind: "summary", body: "Remember" },
        ],
      }).success,
    ).toBe(true);
    expect(
      lessonSchema.safeParse({
        ...lesson,
        cards: Array.from({ length: 7 }, () => ({ kind: "summary", body: "Remember" })),
      }).success,
    ).toBe(false);
  });
  it("keeps stimulus drafting separate from publishing rights and accessibility", () => {
    expect(stimulusSchema.safeParse({ id, version: 1, kind: "passage" }).success).toBe(true);
    const stimulus = {
      id,
      version: 1,
      kind: "diagram",
      body: "A square",
      media: [{ src: "/s.svg", alt_text: "Square" }],
      alt_text: "Square",
      provenance: "original",
    };
    expect(publishedStimulusSchema.safeParse(stimulus).success).toBe(true);
    expect(publishedStimulusSchema.safeParse({ ...stimulus, provenance: "licensed" }).success).toBe(
      false,
    );
  });
});
describe("curriculum and blueprint", () => {
  const draft = JSON.parse(
    readFileSync(new URL("../data/curriculum-draft.json", import.meta.url), "utf8"),
  );
  it("rejects case-variant duplicate curriculum UUIDs", () => {
    const canonical = "abcdefab-cdef-4abc-8def-abcdefabcdef";
    const topic = draft.nodes.find((node: { kind: string }) => node.kind === "topic");
    const normalizedDraft = JSON.parse(JSON.stringify(draft).replaceAll(topic.id, canonical));
    const original = normalizedDraft.nodes.find((node: { id: string }) => node.id === canonical);
    const result = curriculumSchema.safeParse({
      ...normalizedDraft,
      nodes: [
        ...normalizedDraft.nodes,
        { ...original, id: canonical.toUpperCase(), code: "case-duplicate" },
      ],
    });
    expect(result.success).toBe(false);
    if (!result.success)
      expect(result.error.issues.map((issue) => issue.message)).toContain(
        "Node IDs must be unique",
      );
  });
  it("resolves valid curriculum references regardless of UUID letter case", () => {
    const canonical = "abcdefab-cdef-4abc-8def-abcdefabcdef";
    const topic = draft.nodes.find((node: { kind: string }) => node.kind === "topic");
    const mixedDraft = JSON.parse(JSON.stringify(draft).replaceAll(topic.id, canonical));
    mixedDraft.nodes = mixedDraft.nodes.map((node: { id: string }) =>
      node.id === canonical ? { ...node, id: canonical.toUpperCase() } : node,
    );
    const parsed = curriculumSchema.parse(mixedDraft);
    expect(parsed.nodes.some((node) => node.id === canonical)).toBe(true);
  });
  it("rejects duplicate paper codes inside curriculum exam mapping", () => {
    const paper = {
      code: "configured-paper",
      name: "Configured paper",
      duration_minutes: null,
      item_count: null,
      learning_area_ids: [draft.learning_areas[0].id],
    };
    expect(
      curriculumSchema.safeParse({
        ...draft,
        exam_mapping: {
          ...draft.exam_mapping,
          papers: [paper, { ...paper, name: "Duplicate code" }],
        },
      }).success,
    ).toBe(false);
  });
  it("contains exactly 74 valid canonical topics with required area counts", () => {
    expect(curriculumSchema.safeParse(draft).success).toBe(true);
    const topics = draft.nodes.filter((node: { kind: string }) => node.kind === "topic");
    expect(topics).toHaveLength(74);
    expect(
      draft.learning_areas.map((area: { topic_ids: string[] }) => area.topic_ids.length),
    ).toEqual([22, 16, 10, 10, 16]);
    expect(draft.exam_mapping).toEqual({
      valid_for_year: 2027,
      verification_status: "unverified",
      papers: [],
    });
  });
  it("rejects duplicate identifiers/codes, bad parents, references and prerequisite cycles", () => {
    const topic = draft.nodes.find((node: { kind: string }) => node.kind === "topic");
    for (const change of [
      { nodes: [...draft.nodes, topic] },
      {
        nodes: draft.nodes.map((node: { id: string }) =>
          node.id === topic.id ? { ...node, code: draft.nodes[0].code } : node,
        ),
      },
      {
        nodes: draft.nodes.map((node: { id: string }) =>
          node.id === topic.id ? { ...node, parent_id: id } : node,
        ),
      },
      { prerequisites: [{ node_id: topic.id, requires_node_id: topic.id }] },
      { pathway_topics: [{ pathway_id: id, topic_id: topic.id }] },
      { learning_areas: [{ ...draft.learning_areas[0], topic_ids: [id] }] },
    ])
      expect(curriculumSchema.safeParse({ ...draft, ...change }).success).toBe(false);
    const [a, b] = draft.learning_areas[0].topic_ids;
    expect(
      curriculumSchema.safeParse({
        ...draft,
        prerequisites: [
          { node_id: a, requires_node_id: b },
          { node_id: b, requires_node_id: a },
        ],
      }).success,
    ).toBe(false);
  });
  it("allows one canonical topic to map into multiple pathways", () => {
    const pathway = { ...draft.nodes[0], id, code: "intermediate", title: "Intermediate" };
    expect(
      curriculumSchema.safeParse({
        ...draft,
        nodes: [...draft.nodes, pathway],
        pathway_topics: [
          ...draft.pathway_topics,
          { pathway_id: id, topic_id: draft.learning_areas[0].topic_ids[0] },
        ],
      }).success,
    ).toBe(true);
  });
  it("keeps unverified exam facts empty until configured and verified", () => {
    const blueprint = {
      id,
      version: 1,
      pathway_id: id,
      name: "Draft",
      valid_for_year: 2027,
      verification_status: "unverified",
      duration_minutes: null,
      papers: [],
    };
    expect(blueprintSchema.safeParse(blueprint).success).toBe(true);
    expect(publishedBlueprintSchema.safeParse(blueprint).success).toBe(false);
    expect(
      publishedBlueprintSchema.safeParse({
        ...blueprint,
        verification_status: "verified",
        duration_minutes: 60,
        papers: [
          {
            code: "configured-paper",
            name: "Configured paper",
            duration_minutes: 60,
            item_count: 20,
            learning_area_ids: [id],
          },
        ],
      }).success,
    ).toBe(true);
  });
});
