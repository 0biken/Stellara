import {
  filterContent,
  itemTypes,
  type ContentStudioApi,
  type ContentSummary,
  type EditorialStatus,
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
const rows: ContentSummary[] = Array.from({ length: 64 }, (_, index) => ({
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
export const demoContentApi: ContentStudioApi = {
  mode: "demo",
  async listContent(filters, signal) {
    if (signal?.aborted) throw new DOMException("Cancelled", "AbortError");
    return structuredClone(filterContent(rows, filters));
  },
  async getVersion(id) {
    return structuredClone(rows.find((row) => row.id === id) ?? null);
  },
};
