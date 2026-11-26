import { expect, it } from "vitest";

import {
  defaultFilters,
  emptyItemDraft,
  getContentStudioApi,
  type DraftQuestion,
} from "../lib/admin/content";
import { createDemoContentApi } from "../lib/admin/content-demo";

const author = { userId: "demo-author", role: "author" } as const;
const options = [
  { id: "a", text: "First" },
  { id: "b", text: "Second" },
];
const complexQuestions = [
  { type: "ordering", options, answer: { option_ids: ["b", "a"] } },
  {
    type: "match",
    left: options,
    right: [{ id: "x", text: "Pair" }],
    answer: { pairs: [{ left_id: "b", right_id: "x" }] },
  },
  {
    type: "cloze",
    slots: [{ id: "blank", options }],
    answer: { slots: [{ slot_id: "blank", option_id: "b" }] },
  },
] satisfies [DraftQuestion, DraftQuestion, DraftQuestion];

it.each(complexQuestions)(
  "saves and reopens $type with its answer key intact",
  async (question) => {
    const studio = createDemoContentApi();
    const saved = await studio.saveItemDraft(author, { ...emptyItemDraft(), question });
    expect((await studio.getItemDraft(author, saved.id))?.question).toEqual(question);
    expect((await studio.getVersion(saved.id))?.type).toBe(question.type);
  },
);

it.each([
  { ...complexQuestions[0], answer: { option_ids: ["a", "a"] } },
  {
    ...complexQuestions[1],
    answer: {
      pairs: [
        { left_id: "a", right_id: "x" },
        { left_id: "b", right_id: "x" },
      ],
    },
  },
  { ...complexQuestions[2], answer: { slots: [{ slot_id: "blank", option_id: "missing" }] } },
] satisfies DraftQuestion[])("rejects invalid $type answer references", async (question) => {
  await expect(
    createDemoContentApi().saveItemDraft(author, { ...emptyItemDraft(), question }),
  ).rejects.toThrow(/answer/i);
});

it("saves incomplete drafts, lists them, and rejects stale writes", async () => {
  const studio = createDemoContentApi();
  const saved = await studio.saveItemDraft(author, { ...emptyItemDraft(), title: "A new draft" });
  expect(saved.revision).toBe(1);
  expect((await studio.listContent({ ...defaultFilters, query: "A new draft" })).total).toBe(1);
  const edited = await studio.saveItemDraft(author, {
    ...saved,
    stem: "What is 2 + 2?",
    question: { type: "numeric", answer: "4" },
  });
  await expect(studio.saveItemDraft(author, saved)).rejects.toThrow("changed");
  expect(await studio.getItemDraft(author, saved.id)).toEqual(edited);
});

it("rejects reviewers, changes to published records and invalid answer references", async () => {
  const studio = createDemoContentApi();
  await expect(
    studio.saveItemDraft({ ...author, role: "reviewer" }, emptyItemDraft()),
  ).rejects.toThrow("permission");
  await expect(studio.getItemDraft(author, "demo-content-005")).resolves.toBeNull();
  const draft = emptyItemDraft();
  await expect(
    studio.saveItemDraft(author, {
      ...draft,
      question: { type: "single_choice", options: [], correctIds: ["missing"] },
    }),
  ).rejects.toThrow("option");
  const live = await getContentStudioApi("live");
  await expect(live.saveItemDraft(author, draft)).rejects.toThrow("live backend");
});
