import { projectLessonForClient, type ClientLesson } from "@stellara/content-schema/client";

import { lessonCheckRequestSchema, parseRequest, RuntimeError } from "./contracts.js";
import { gradeResponse } from "./grade.js";
import { loadActiveChild } from "./set-start.js";

import type { ChildContext, RuntimeDeps } from "./ports.js";
import type { PublishedItem } from "@stellara/content-schema/server";

export async function getLesson(
  deps: RuntimeDeps,
  ctx: ChildContext,
  topicId: string,
): Promise<ClientLesson> {
  await loadActiveChild(deps, ctx);
  const lesson = await deps.store.getPublishedLesson(topicId);
  if (!lesson) throw new RuntimeError("LESSON_NOT_FOUND");

  const itemIds = new Set<string>();
  for (const card of lesson.cards) {
    if (card.kind === "check") itemIds.add(card.item_id);
    if (card.kind === "try_it") {
      for (const id of card.item_ids) itemIds.add(id);
    }
  }

  const topicItems = await deps.store.publishedItems([topicId]);
  const itemsMap = new Map<string, PublishedItem>();
  for (const item of topicItems) {
    itemsMap.set(item.id, item);
  }
  for (const id of itemIds) {
    if (!itemsMap.has(id)) {
      const item = await deps.store.getItem(id, 1);
      if (item) itemsMap.set(id, item);
    }
  }

  return projectLessonForClient(lesson, itemsMap);
}

export async function checkLessonAnswer(
  deps: RuntimeDeps,
  ctx: ChildContext,
  untrustedRequest: unknown,
): Promise<{ is_correct: boolean; explanation_html: string }> {
  await loadActiveChild(deps, ctx);
  const req = parseRequest(lessonCheckRequestSchema, untrustedRequest);

  const item = await deps.store.getItem(req.item_id, req.item_version);
  if (!item) throw new RuntimeError("ITEM_VERSION_MISMATCH");

  const grade = gradeResponse(item as unknown as Parameters<typeof gradeResponse>[0], req.response);
  return {
    is_correct: grade === true,
    explanation_html: item.explanation,
  };
}
