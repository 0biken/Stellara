import { existsSync } from "node:fs";
import { join } from "node:path";

import { listBatchDirs, readBatch, readJson, writeJson } from "./files.js";
import { reviewFileSchema, type ReviewFile } from "./review.js";

import type { DraftBatch } from "./batch.js";

export interface PilotSummary {
  topics: number;
  items: number;
  approved: number;
  changes_requested: number;
  rejected: number;
  undecided: number;
  /** Approved items as a share of items with a decision. */
  first_pass_approval_rate: number;
  median_minutes_per_item: number | null;
  /** Item and lesson review minutes together. */
  total_review_minutes: number;
  projected_review_hours_2000_items: number | null;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

export function summarisePilot(
  entries: { batch: DraftBatch; review: ReviewFile | null }[],
): PilotSummary {
  let items = 0;
  let total = 0;
  const counts = { approve: 0, changes_requested: 0, reject: 0 };
  const minutes: number[] = [];
  for (const { batch, review } of entries) {
    items += batch.items.length;
    const ids = new Set(batch.items.map((item) => item.id));
    for (const entry of review?.decisions ?? []) {
      if (!ids.has(entry.item_id.toLowerCase())) continue;
      if (entry.decision) counts[entry.decision]++;
      if (entry.minutes !== null) {
        minutes.push(entry.minutes);
        total += entry.minutes;
      }
    }
    total += review?.lesson.minutes ?? 0;
  }
  const decided = counts.approve + counts.changes_requested + counts.reject;
  const mid = median(minutes);
  return {
    topics: entries.length,
    items,
    approved: counts.approve,
    changes_requested: counts.changes_requested,
    rejected: counts.reject,
    undecided: items - decided,
    first_pass_approval_rate: decided ? counts.approve / decided : 0,
    median_minutes_per_item: mid,
    total_review_minutes: total,
    projected_review_hours_2000_items: mid === null ? null : Math.round((mid * 2000) / 6) / 10,
  };
}

export function reportPilot(outRoot: string): PilotSummary {
  const entries = listBatchDirs(outRoot).map((dir) => {
    const reviewPath = join(dir, "review.json");
    return {
      batch: readBatch(dir),
      review: existsSync(reviewPath) ? readJson(reviewPath, reviewFileSchema) : null,
    };
  });
  const summary = summarisePilot(entries);
  writeJson(join(outRoot, "pilot-summary.json"), summary);
  return summary;
}
