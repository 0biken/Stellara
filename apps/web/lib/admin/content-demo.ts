import {
  canWriteDrafts,
  emptyItemDraft,
  emptyQuestion,
  filterContent,
  itemTypes,
  type ContentStudioApi,
  type ContentSummary,
  type DraftActor,
  type DraftOption,
  type DraftQuestion,
  type EditorialStatus,
  type ItemDraft,
} from "./content";

const topics = ["Fractions", "Angles", "Reading comprehension", "Vocabulary"];
const statuses: EditorialStatus[] = [
  "draft",
  "in_review",
  "changes_requested",
  "approved",
  "published",
  "retired",
];
const fixtures: ContentSummary[] = Array.from({ length: 64 }, (_, index) => ({
  id: `demo-content-${String(index + 1).padStart(3, "0")}`,
  kind: index >= 54 ? "lesson" : "item",
  title:
    index >= 54
      ? `Understanding ${topics[index % 4]?.toLowerCase()}`
      : `${["Sharing a market basket", "Finding the missing angle", "A visit to the library", "Choosing the right word"][index % 4]} · ${index + 1}`,
  year: index % 3 === 0 ? "P6" : "P5",
  subject: index % 4 < 2 ? "Mathematics" : "English",
  topic: topics[index % 4]!,
  type: index >= 54 ? "lesson" : itemTypes[index % itemTypes.length]!,
  purpose: index % 5 === 0 ? "placement" : index % 5 === 1 ? "lesson_check" : "practice",
  status: statuses[index % statuses.length]!,
  version: (index % 3) + 1,
  ownerId: index % 2 === 0 ? "demo-author" : "demo-publisher",
  ownerName: index % 2 === 0 ? "Amara Okafor" : "Tunde Bello",
  updatedAt: `2026-11-${String(19 - (index % 8)).padStart(2, "0")}T09:30:00Z`,
}));

function validateAnswers(question: DraftQuestion) {
  const filled = (options: DraftOption[], id: string) =>
    options.some((option) => option.id === id && option.text.trim());
  const unique = (ids: string[]) => new Set(ids).size === ids.length;
  switch (question.type) {
    case "numeric":
      return;
    case "ordering": {
      const ids = question.answer.option_ids;
      if (unique(ids) && ids.every((id) => filled(question.options, id))) return;
      break;
    }
    case "match": {
      const { pairs } = question.answer;
      if (
        unique(pairs.map((pair) => pair.left_id)) &&
        unique(pairs.map((pair) => pair.right_id)) &&
        pairs.every(
          (pair) => filled(question.left, pair.left_id) && filled(question.right, pair.right_id),
        )
      )
        return;
      break;
    }
    case "cloze": {
      const { slots } = question.answer;
      if (
        unique(slots.map((answer) => answer.slot_id)) &&
        slots.every((answer) => {
          const slot = question.slots.find(({ id }) => id === answer.slot_id);
          return slot && filled(slot.options, answer.option_id);
        })
      )
        return;
      break;
    }
    default: {
      const { correctIds, options } = question;
      if (
        (question.type !== "single_choice" || correctIds.length <= 1) &&
        unique(correctIds) &&
        correctIds.every((id) => filled(options, id))
      )
        return;
    }
  }
  throw new Error("Each answer must refer to a filled option and cannot repeat a reference.");
}
export function createDemoContentApi(): ContentStudioApi {
  const rows = structuredClone(fixtures);
  const drafts = new Map<string, ItemDraft>();
  const canEdit = (actor: DraftActor, row: ContentSummary) =>
    canWriteDrafts(actor) &&
    (actor.role !== "author" || actor.userId === row.ownerId) &&
    row.kind === "item" &&
    row.type !== "lesson" &&
    (row.status === "draft" || row.status === "changes_requested");
  return {
    mode: "demo",
    async listContent(filters, signal) {
      if (signal?.aborted) throw new DOMException("Cancelled", "AbortError");
      return structuredClone(filterContent(rows, filters));
    },
    async getVersion(id) {
      return structuredClone(rows.find((row) => row.id === id) ?? null);
    },
    async getItemDraft(actor, id) {
      const row = rows.find((entry) => entry.id === id);
      if (!row || row.type === "lesson" || !canEdit(actor, row)) return null;
      return structuredClone(
        drafts.get(id) ?? {
          ...emptyItemDraft(),
          id,
          title: row.title,
          year: row.year,
          subject: row.subject,
          topic: row.topic,
          purpose: row.purpose,
          question: emptyQuestion(row.type),
        },
      );
    },
    async saveItemDraft(actor, draft) {
      const index = rows.findIndex((row) => row.id === draft.id);
      const current = rows[index];
      if (!canWriteDrafts(actor) || (draft.id && (!current || !canEdit(actor, current))))
        throw new Error("You do not have permission to edit this draft.");
      if ((drafts.get(draft.id)?.revision ?? 0) !== draft.revision)
        throw new Error(
          "This draft changed since you opened it. Copy your edits before reopening it.",
        );
      const q = draft.question;
      validateAnswers(q);
      const saved = structuredClone({
        ...draft,
        id: draft.id || crypto.randomUUID(),
        revision: draft.revision + 1,
      });
      const row: ContentSummary = {
        id: saved.id,
        kind: "item",
        title: saved.title.trim() || "Untitled question",
        year: saved.year,
        subject: saved.subject,
        topic: saved.topic,
        type: q.type,
        purpose: saved.purpose,
        status: current?.status ?? "draft",
        version: current?.version ?? 1,
        ownerId: current?.ownerId ?? actor.userId,
        ownerName: current?.ownerName ?? "You",
        updatedAt: new Date().toISOString(),
      };
      drafts.set(saved.id, saved);
      if (current) rows[index] = row;
      else rows.unshift(row);
      return structuredClone(saved);
    },
  };
}

export const demoContentApi = createDemoContentApi();
