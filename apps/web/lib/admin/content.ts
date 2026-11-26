import type { StaffSession } from "./types";

export type EditorialStatus =
  "draft" | "in_review" | "changes_requested" | "approved" | "published" | "retired";
export const statusLabels: Record<EditorialStatus, string> = {
  draft: "Draft",
  in_review: "In review",
  changes_requested: "Changes requested",
  approved: "Approved",
  published: "Published",
  retired: "Retired",
};
export const itemTypes = [
  "single_choice",
  "multi_choice",
  "numeric",
  "ordering",
  "match",
  "cloze",
] as const;
export const itemTypeLabels = {
  single_choice: "Single choice",
  multi_choice: "Multiple choice",
  numeric: "Numeric",
  ordering: "Ordering",
  match: "Matching",
  cloze: "Cloze",
};
export interface ContentSummary {
  id: string;
  kind: "item" | "lesson";
  title: string;
  year: "P4" | "P5" | "P6";
  subject: string;
  topic: string;
  type: (typeof itemTypes)[number] | "lesson";
  purpose: "practice" | "placement" | "lesson_check";
  status: EditorialStatus;
  version: number;
  ownerId: string;
  ownerName: string;
  updatedAt: string;
}
export interface ContentFilters {
  query: string;
  kind: "item" | "lesson";
  year: string;
  subject: string;
  topic: string;
  type: string;
  purpose: string;
  status: string;
  owner: string;
  page: number;
}
export const defaultFilters: ContentFilters = {
  query: "",
  kind: "item",
  year: "",
  subject: "",
  topic: "",
  type: "",
  purpose: "",
  status: "",
  owner: "",
  page: 1,
};
export interface ContentPage {
  rows: ContentSummary[];
  total: number;
  page: number;
  pages: number;
}
export type DraftActor = Pick<StaffSession, "role" | "userId">;
export interface DraftOption {
  id: string;
  text: string;
}
export type StructuredQuestion =
  | { type: "ordering"; options: DraftOption[]; answer: { option_ids: string[] } }
  | {
      type: "match";
      left: DraftOption[];
      right: DraftOption[];
      answer: { pairs: { left_id: string; right_id: string }[] };
    }
  | {
      type: "cloze";
      slots: { id: string; options: DraftOption[] }[];
      answer: { slots: { slot_id: string; option_id: string }[] };
    };
export type DraftQuestion =
  | {
      type: "single_choice" | "multi_choice";
      options: DraftOption[];
      correctIds: string[];
    }
  | { type: "numeric"; answer: string }
  | StructuredQuestion;

export interface ItemDraft {
  id: string;
  revision: number;
  title: string;
  stem: string;
  hint: string;
  explanation: string;
  year: ContentSummary["year"];
  subject: string;
  topic: string;
  purpose: ContentSummary["purpose"];
  question: DraftQuestion;
}

export const canWriteDrafts = (actor: DraftActor) =>
  actor.role === "author" || actor.role === "content_lead" || actor.role === "super_admin";

export function emptyQuestion(type: DraftQuestion["type"]): DraftQuestion {
  const options = () => [
    { id: "a", text: "" },
    { id: "b", text: "" },
  ];
  switch (type) {
    case "numeric":
      return { type, answer: "" };
    case "ordering":
      return { type, options: options(), answer: { option_ids: [] } };
    case "match":
      return { type, left: options(), right: options(), answer: { pairs: [] } };
    case "cloze":
      return { type, slots: [{ id: "blank", options: options() }], answer: { slots: [] } };
    default:
      return { type, options: options(), correctIds: [] };
  }
}

export function emptyItemDraft(): ItemDraft {
  return {
    id: "",
    revision: 0,
    title: "",
    stem: "",
    hint: "",
    explanation: "",
    year: "P5",
    subject: "",
    topic: "",
    purpose: "practice",
    question: emptyQuestion("single_choice"),
  };
}
export function readFilters(params: URLSearchParams): ContentFilters {
  const page = Number(params.get("page"));
  return {
    query: params.get("q") ?? "",
    kind: params.get("kind") === "lesson" ? "lesson" : "item",
    year: params.get("year") ?? "",
    subject: params.get("subject") ?? "",
    topic: params.get("topic") ?? "",
    type: params.get("type") ?? "",
    purpose: params.get("purpose") ?? "",
    status: params.get("status") ?? "",
    owner: params.get("owner") ?? "",
    page: Number.isSafeInteger(page) && page > 0 ? page : 1,
  };
}
export function writeFilters(filters: ContentFilters): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if ((key === "page" && value === 1) || (key === "kind" && value === "item") || value === "")
      continue;
    params.set(key === "query" ? "q" : key, String(value));
  }
  return params.toString();
}
export function filterContent(
  rows: readonly ContentSummary[],
  filters: ContentFilters,
): ContentPage {
  const query = filters.query.trim().toLocaleLowerCase();
  const selected = rows.filter(
    (row) =>
      row.kind === filters.kind &&
      (!query ||
        `${row.title} ${row.subject} ${row.topic} ${row.ownerName}`
          .toLocaleLowerCase()
          .includes(query)) &&
      (Object.keys(filters) as (keyof ContentFilters)[]).every(
        (key) =>
          ["query", "kind", "page"].includes(key) ||
          !filters[key] ||
          String(row[key as keyof ContentSummary] ?? (key === "owner" ? row.ownerId : "")) ===
            filters[key],
      ),
  );
  const pages = Math.max(1, Math.ceil(selected.length / 25));
  const page = Math.min(filters.page, pages);
  return { rows: selected.slice((page - 1) * 25, page * 25), total: selected.length, page, pages };
}
export interface ContentStudioApi {
  readonly mode: "demo" | "unavailable";
  listContent(filters: ContentFilters, signal?: AbortSignal): Promise<ContentPage>;
  getVersion(id: string): Promise<ContentSummary | null>;
  getItemDraft(actor: DraftActor, id: string): Promise<ItemDraft | null>;
  saveItemDraft(actor: DraftActor, draft: ItemDraft): Promise<ItemDraft>;
}
export async function getContentStudioApi(mode: "live" | "demo"): Promise<ContentStudioApi> {
  if (mode === "demo") return (await import("./content-demo")).demoContentApi;
  const unavailable = async (): Promise<never> => {
    throw new Error("Content authoring is not connected to the live backend yet.");
  };
  return {
    mode: "unavailable",
    listContent: unavailable,
    getVersion: unavailable,
    getItemDraft: unavailable,
    saveItemDraft: unavailable,
  };
}
