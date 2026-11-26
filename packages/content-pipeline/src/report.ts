import { join } from "node:path";

import { listBatchDirs, readBatch, writeJson } from "./files.js";

import type { DraftBatch } from "./batch.js";

export interface PilotSummary {
  topics: number;
  items: number;
  approved: number;
  changes_requested: number;
  rejected: number;
  undecided: number;
  /** Approved items as a share of items with an applied decision. */
  approval_rate: number;
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

/** Reads applied state only (batch.json), never a review.json that apply-review refused. */
export function summarisePilot(batches: DraftBatch[]): PilotSummary {
  let items = 0;
  let total = 0;
  let approved = 0;
  let changes = 0;
  let rejected = 0;
  const minutes: number[] = [];
  for (const batch of batches) {
    items += batch.items.length;
    for (const item of batch.items) {
      if (item.status === "approved") approved++;
      else if (item.status === "changes_requested") changes++;
      const review = batch.notes[item.id]?.review;
      if (review?.decision === "reject" && item.status === "draft") rejected++;
      if (review?.minutes !== null && review?.minutes !== undefined) {
        minutes.push(review.minutes);
        total += review.minutes;
      }
    }
    total += batch.lesson_review?.minutes ?? 0;
  }
  const decided = approved + changes + rejected;
  const mid = median(minutes);
  return {
    topics: batches.length,
    items,
    approved,
    changes_requested: changes,
    rejected,
    undecided: items - decided,
    approval_rate: decided ? approved / decided : 0,
    median_minutes_per_item: mid,
    total_review_minutes: total,
    projected_review_hours_2000_items: mid === null ? null : Math.round((mid * 2000) / 6) / 10,
  };
}

export function reportPilot(outRoot: string): PilotSummary {
  const summary = summarisePilot(listBatchDirs(outRoot).map(readBatch));
  writeJson(join(outRoot, "pilot-summary.json"), summary);
  return summary;
}
