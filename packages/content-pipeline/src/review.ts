import { existsSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { uuidSchema } from "@stellara/content-schema/client";
import { z } from "zod";

import {
  itemContentHash,
  reviewDecision as decision,
  reviewMinutes as minutes,
  type DraftBatch,
} from "./batch.js";
import { CHANGED_SINCE_REVIEW, checkBatch, type CheckReport } from "./checks.js";
import { otherStems, readBatch, readJson, writeJson } from "./files.js";

import type { DraftItem } from "@stellara/content-schema/server";
export const reviewFileSchema = z.object({
  reviewer_id: z.string(),
  decisions: z.array(
    z.object({
      item_id: z.string(),
      decision,
      answer_verified: z.boolean(),
      minutes,
      note: z.string(),
    }),
  ),
  lesson: z.object({ decision, minutes, note: z.string() }),
});
export type ReviewFile = z.infer<typeof reviewFileSchema>;

export function reviewTemplate(batch: DraftBatch): ReviewFile {
  return {
    reviewer_id: "",
    decisions: batch.items.map((item) => ({
      item_id: item.id,
      decision: null,
      answer_verified: false,
      minutes: null,
      note: "",
    })),
    lesson: { decision: null, minutes: null, note: "" },
  };
}

function answerLines(item: DraftItem): string[] {
  switch (item.type) {
    case "single_choice":
    case "multi_choice":
      return (item.options ?? []).map((option) => {
        const keyed =
          item.type === "single_choice"
            ? item.answer?.option_id === option.id
            : (item.answer?.option_ids ?? []).includes(option.id);
        return `- ${option.id}. ${option.text}${keyed ? " (keyed answer)" : ""}`;
      });
    case "numeric":
      return [`- Keyed answer: ${item.answer?.value ?? "(missing)"}`];
    case "ordering": {
      const text = new Map((item.options ?? []).map((option) => [option.id, option.text]));
      return [
        ...(item.options ?? []).map((option) => `- ${option.id}. ${option.text}`),
        `- Keyed order: ${(item.answer?.option_ids ?? []).map((id) => text.get(id) ?? id).join(", ")}`,
      ];
    }
    default:
      return [`- Answer: ${JSON.stringify(item.answer ?? null)}`];
  }
}

export function renderReviewSheet(batch: DraftBatch, report: CheckReport): string {
  const out = [
    `# Review: ${batch.topic_code}`,
    "",
    "Work every answer yourself before you tick answer_verified. Record the minutes you spent on each item.",
    "",
    `Drafted ${batch.drafting.drafted_at} with ${batch.drafting.model} (prompt ${batch.drafting.prompt_version}). Checks: ${report.ok ? "passed" : "FAILED"}.`,
    ...report.batch_errors.map((message) => `- Error: ${message}`),
    ...report.batch_warnings.map((message) => `- Warning: ${message}`),
  ];
  batch.items.forEach((item, index) => {
    const check = report.items.find((entry) => entry.item_id === item.id);
    const note = batch.notes[item.id];
    out.push(
      "",
      `## ${index + 1}. ${note?.key ?? item.id} · ${item.purpose} · ${item.difficulty} · ${item.type}`,
      "",
      `Item ID: \`${item.id}\``,
      "",
      item.stem ?? "(no stem)",
      "",
      ...answerLines(item),
      "",
      `**Explanation:** ${item.explanation ?? "(missing)"}`,
      "",
      `**Hint:** ${item.hint ?? "(missing)"}`,
    );
    if (note?.distractor_notes.length) {
      out.push("", "**Why someone might pick a wrong option:**");
      for (const entry of note.distractor_notes) out.push(`- ${entry.option_id}: ${entry.why}`);
    }
    if (check) {
      out.push(
        "",
        `Machine check: ${check.machine_check.status} (${check.machine_check.detail})`,
        ...check.errors.map((message) => `- Error: ${message}`),
        ...check.warnings.map((message) => `- Warning: ${message}`),
      );
    }
  });
  out.push("", `## Lesson: ${batch.lesson.title ?? "(untitled)"}`);
  const keyOf = (id: string) => batch.notes[id]?.key ?? id;
  (batch.lesson.cards ?? []).forEach((card, index) => {
    out.push("", `${index + 1}. **${card.kind}**`);
    if (card.kind === "check") out.push(`   Uses item ${keyOf(card.item_id)}`);
    else if (card.kind === "try_it")
      out.push(`   Uses items ${card.item_ids.map(keyOf).join(", ")}`);
    else {
      out.push(`   ${card.body}`);
      if (card.kind === "worked_example") card.steps.forEach((step) => out.push(`   - ${step}`));
    }
  });
  return `${out.join("\n")}\n`;
}

/** Writes review.md, and review.json only when the reviewer has not started one. */
export function writeReviewSheet(dir: string): void {
  const batch = readBatch(dir);
  writeFileSync(join(dir, "review.md"), renderReviewSheet(batch, checkBatch(batch)));
  const reviewPath = join(dir, "review.json");
  if (!existsSync(reviewPath)) writeJson(reviewPath, reviewTemplate(batch));
}

/** Removes a previous approval stamp. */
function withoutStamp(item: DraftItem): DraftItem {
  const rest = { ...item };
  delete rest.reviewer_id;
  delete rest.answer_verified_at;
  return rest;
}

/**
 * Returns an updated copy, or throws without changing anything. Approval stamps the reviewer,
 * the time and a content hash; any other decision on a stamped item removes the stamp.
 * existingStems are stems from other topic folders, as used by `check`.
 */
export function applyReview(
  batch: DraftBatch,
  review: ReviewFile,
  now: Date,
  existingStems: string[] = [],
): DraftBatch {
  const reviewer = uuidSchema.safeParse(review.reviewer_id);
  if (!reviewer.success) throw new Error("reviewer_id must be the reviewer's UUID");
  const reviewerId = reviewer.data;
  if (batch.items.some((item) => item.author_id?.toLowerCase() === reviewerId))
    throw new Error("The reviewer must not be the author of record");

  const byId = new Map(batch.items.map((item) => [item.id, item]));
  const report = checkBatch(batch, existingStems);
  // A stale approval is exactly what a fresh review fixes, so it does not block re-approval.
  const failing = new Set(
    report.items
      .filter((item) => item.errors.some((message) => message !== CHANGED_SINCE_REVIEW))
      .map((item) => item.item_id),
  );
  const problems: string[] = [];
  const seen = new Set<string>();
  for (const entry of review.decisions) {
    const id = entry.item_id.toLowerCase();
    const item = byId.get(id);
    if (seen.has(id)) problems.push(`Item ${id} has a decision more than once`);
    seen.add(id);
    if (!item) problems.push(`Decision for an unknown item: ${entry.item_id}`);
    else if (entry.decision === "approve") {
      if (!item.author_id) problems.push(`Cannot approve ${id}: it has no author of record`);
      if (!entry.answer_verified) problems.push(`Approval of ${id} needs answer_verified: true`);
      if (failing.has(id)) problems.push(`Cannot approve ${id}: it fails checks`);
    }
  }
  if (problems.length) throw new Error(problems.join("\n"));

  const next = structuredClone(batch);
  const decisions = new Map(review.decisions.map((entry) => [entry.item_id.toLowerCase(), entry]));
  next.items = next.items.map((item): DraftItem => {
    const entry = decisions.get(item.id);
    const note = next.notes[item.id];
    if (note && entry) note.review = { decision: entry.decision, minutes: entry.minutes };
    if (entry?.decision === "approve") {
      const approved: DraftItem = {
        ...item,
        status: "approved",
        reviewer_id: reviewerId,
        answer_verified_at: now.toISOString(),
      };
      if (note) note.approved_hash = itemContentHash(approved);
      return approved;
    }
    if (note) delete note.approved_hash;
    if (entry?.decision === "changes_requested")
      return { ...withoutStamp(item), status: "changes_requested" };
    if (item.status === "approved" || item.status === "changes_requested")
      return { ...withoutStamp(item), status: "draft" };
    return item;
  });
  next.lesson_review = { decision: review.lesson.decision, minutes: review.lesson.minutes };
  return next;
}

export function applyReviewInDir(dir: string, now = new Date()): DraftBatch {
  const updated = applyReview(
    readBatch(dir),
    readJson(join(dir, "review.json"), reviewFileSchema),
    now,
    otherStems(dirname(dir), dir),
  );
  writeJson(join(dir, "batch.json"), updated);
  return updated;
}
