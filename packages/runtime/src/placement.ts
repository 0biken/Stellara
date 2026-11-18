import { projectItemForClient, type ClientItem } from "@stellara/content-schema/client";
import {
  RuntimeError,
  type OwnedSetResponse,
  type PlacementConfigResponse,
} from "./contracts.js";
import type { RuntimeDeps } from "./ports.js";

export const STRANDS_BY_YEAR: Record<
  "P4" | "P5" | "P6",
  { id: string; name: string }[]
> = {
  P4: [
    { id: "p4-fractions-strand", name: "Fractions and Parts" },
    { id: "p4-shapes-strand", name: "2D and 3D Shapes" },
  ],
  P5: [
    { id: "p5-fractions-strand", name: "Fractions and Decimals" },
    { id: "p5-angles-strand", name: "Angles and Lines" },
  ],
  P6: [
    { id: "p6-fractions-strand", name: "Advanced Fractions and Ratios" },
    { id: "p6-area-strand", name: "Area and Perimeter" },
  ],
};

export async function getPlacementConfig(
  deps: RuntimeDeps,
  ctx: { child_id: string },
): Promise<PlacementConfigResponse> {
  const child = await deps.store.getChild(ctx.child_id);
  if (!child) throw new RuntimeError("CHILD_NOT_FOUND");
  if (child.status !== "active") throw new RuntimeError("CHILD_INACTIVE");

  const year = child.year ?? "P5";
  const strands = [...STRANDS_BY_YEAR[year]];

  const childSets = await deps.store.listChildSets(child.id, "placement");
  const completed = childSets.find((s) => s.finished_at !== null) ?? null;
  const active = childSets.find((s) => s.finished_at === null) ?? null;

  return {
    year,
    strands,
    total_questions: 20,
    available: completed === null,
    completed: completed !== null,
    ...(completed ? { completed_set_id: completed.id } : {}),
    ...(active ? { active_set_id: active.id } : {}),
  };
}

export async function getOwnedSet(
  deps: RuntimeDeps,
  ctx: { child_id: string },
  setId: string,
): Promise<OwnedSetResponse> {
  const child = await deps.store.getChild(ctx.child_id);
  if (!child) throw new RuntimeError("CHILD_NOT_FOUND");
  if (child.status !== "active") throw new RuntimeError("CHILD_INACTIVE");

  const set = await deps.store.getSet(setId);
  if (!set) throw new RuntimeError("SET_NOT_FOUND");
  if (set.child_id !== ctx.child_id) throw new RuntimeError("SET_NOT_OWNED");

  const items: ClientItem[] = [];
  for (const ref of set.items) {
    const item = await deps.store.getItem(ref.item_id, ref.version);
    if (!item) throw new RuntimeError("NO_ITEMS_AVAILABLE", ref.item_id);
    items.push(projectItemForClient(item));
  }

  const placement = set.placement
    ? set.placement.map(({ strand_id, label }) => ({ strand_id, label }))
    : null;

  return {
    set_id: set.id,
    child_id: set.child_id,
    kind: set.kind,
    finished_at: set.finished_at,
    completed: set.finished_at !== null,
    total_items: set.items.length,
    items,
    placement,
  };
}
