export type PlacementLabel = "looks_secure_so_far" | "check_this" | "not_yet_measured_enough";
export function placementStrandResult(correct: number, answered: number): PlacementLabel {
  if (
    !Number.isInteger(correct) ||
    !Number.isInteger(answered) ||
    answered < 0 ||
    correct < 0 ||
    correct > answered
  )
    throw new RangeError("Invalid strand counts");
  if (answered >= 4 && correct / answered >= 0.75) return "looks_secure_so_far";
  if (answered > 0 && correct / answered < 0.5) return "check_this";
  return "not_yet_measured_enough";
}
export interface PlacementStrand {
  readonly strandId: string;
  readonly correct: number;
  readonly answered: number;
}
export interface PlacementTopic {
  readonly id: string;
  readonly strandId: string;
}
export function placementRecommendations(
  strands: readonly PlacementStrand[],
  topics: readonly PlacementTopic[],
): string[] {
  const priority = new Map(
    strands.map((s) => [s.strandId, placementStrandResult(s.correct, s.answered)]),
  );
  const rank = (s: string) => (priority.get(s) === "check_this" ? 0 : 1);
  return [
    ...new Map(
      topics
        .filter(
          (t) => priority.has(t.strandId) && priority.get(t.strandId) !== "looks_secure_so_far",
        )
        .map((t) => [t.id, t]),
    ).values(),
  ]
    .sort(
      (a, b) =>
        rank(a.strandId) - rank(b.strandId) ||
        Number(a.strandId > b.strandId) - Number(a.strandId < b.strandId) ||
        Number(a.id > b.id) - Number(a.id < b.id),
    )
    .map((t) => t.id);
}
