import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { validateCurriculum, type Curriculum } from "@stellara/content-schema/curriculum";

export type { Curriculum };
export interface TopicRef {
  id: string;
  title: string;
  curriculum_edition: "legacy" | "revised_2025";
}

const defaultPath = new URL("../../content-schema/data/curriculum-draft.json", import.meta.url);

export function loadCurriculum(path: URL = defaultPath): Curriculum {
  return validateCurriculum(JSON.parse(readFileSync(fileURLToPath(path), "utf8")));
}

export function findTopic(curriculum: Curriculum, code: string): TopicRef {
  const node = curriculum.nodes.find((entry) => entry.kind === "topic" && entry.code === code);
  if (!node) throw new Error(`Unknown topic code: ${code}`);
  return { id: node.id, title: node.title, curriculum_edition: node.curriculum_edition };
}
