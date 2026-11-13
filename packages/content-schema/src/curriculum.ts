import { z } from "zod";

import { uuidSchema, versionSchema, curriculumEditionSchema } from "./client.js";

const text = z.string().trim().min(1);
export const curriculumNodeSchema = z.object({
  id: uuidSchema,
  parent_id: uuidSchema.nullable(),
  kind: z.enum(["pathway", "subject", "strand", "topic"]),
  title: text,
  code: text,
  curriculum_edition: curriculumEditionSchema,
  sort: z.number().int().nonnegative(),
});
export const prerequisiteSchema = z.object({ node_id: uuidSchema, requires_node_id: uuidSchema });
export const pathwayTopicSchema = z.object({ pathway_id: uuidSchema, topic_id: uuidSchema });
export const learningAreaSchema = z.object({
  id: uuidSchema,
  code: text,
  title: text,
  topic_ids: z.array(uuidSchema).min(1),
});
export const examPaperSchema = z.object({
  code: text,
  name: text,
  duration_minutes: z.number().int().positive().nullable(),
  item_count: z.number().int().positive().nullable(),
  learning_area_ids: z.array(uuidSchema).min(1),
});
const verificationStatus = z.enum(["unverified", "verified"]);
export const blueprintSchema = z
  .object({
    id: uuidSchema,
    version: versionSchema,
    pathway_id: uuidSchema,
    name: text,
    valid_for_year: z.number().int().min(2026),
    verification_status: verificationStatus,
    duration_minutes: z.number().int().positive().nullable(),
    papers: z.array(examPaperSchema),
  })
  .superRefine((blueprint, ctx) => {
    if (new Set(blueprint.papers.map((paper) => paper.code)).size !== blueprint.papers.length)
      ctx.addIssue({ code: "custom", message: "Exam paper codes must be unique" });
  });
export const publishedBlueprintSchema = blueprintSchema.superRefine((blueprint, ctx) => {
  if (
    blueprint.verification_status !== "verified" ||
    blueprint.duration_minutes === null ||
    blueprint.papers.length === 0 ||
    blueprint.papers.some((paper) => paper.duration_minutes === null || paper.item_count === null)
  ) {
    ctx.addIssue({
      code: "custom",
      message:
        "Publishing requires verified exam facts and positive configured counts and durations",
    });
  }
});
export type Blueprint = z.infer<typeof blueprintSchema>;

export const curriculumSchema = z
  .object({
    metadata: z.object({
      status: z.literal("draft"),
      academic_verification: z.literal("awaiting_academic_verification"),
      source_note: text,
      curriculum_edition: curriculumEditionSchema,
    }),
    nodes: z.array(curriculumNodeSchema).min(1),
    learning_areas: z.array(learningAreaSchema).min(1),
    prerequisites: z.array(prerequisiteSchema),
    pathway_topics: z.array(pathwayTopicSchema),
    exam_mapping: z.object({
      valid_for_year: z.number().int().min(2026),
      verification_status: verificationStatus,
      papers: z.array(examPaperSchema),
    }),
  })
  .superRefine((curriculum, ctx) => {
    const issue = (message: string) => ctx.addIssue({ code: "custom", message });
    const nodes = new Map(curriculum.nodes.map((node) => [node.id, node]));
    if (nodes.size !== curriculum.nodes.length) issue("Node IDs must be unique");
    if (new Set(curriculum.nodes.map((node) => node.code)).size !== curriculum.nodes.length)
      issue("Node codes must be unique");
    const parentKinds = { subject: "pathway", strand: "subject", topic: "strand" } as const;
    for (const node of curriculum.nodes) {
      if (node.kind === "pathway") {
        if (node.parent_id !== null) issue("Pathways must be roots");
      } else if (
        node.parent_id === null ||
        nodes.get(node.parent_id)?.kind !== parentKinds[node.kind]
      )
        issue("Invalid parent level or reference");
    }
    const mappingKeys = new Set<string>();
    for (const mapping of curriculum.pathway_topics) {
      const key = `${mapping.pathway_id}:${mapping.topic_id}`;
      if (mappingKeys.has(key)) issue("Pathway/topic mappings must be unique");
      mappingKeys.add(key);
      if (
        nodes.get(mapping.pathway_id)?.kind !== "pathway" ||
        nodes.get(mapping.topic_id)?.kind !== "topic"
      )
        issue("Pathway/topic mapping references invalid nodes");
    }
    for (const node of curriculum.nodes.filter((node) => node.kind === "topic")) {
      const strand = nodes.get(node.parent_id ?? "");
      const subject = nodes.get(strand?.parent_id ?? "");
      const pathway = nodes.get(subject?.parent_id ?? "");
      if (!pathway || !mappingKeys.has(`${pathway.id}:${node.id}`))
        issue("Every tree topic must map to its owning pathway");
    }
    const areaIds = new Set<string>();
    const areaCodes = new Set<string>();
    for (const area of curriculum.learning_areas) {
      if (areaIds.has(area.id) || areaCodes.has(area.code))
        issue("Learning area IDs and codes must be unique");
      areaIds.add(area.id);
      areaCodes.add(area.code);
      if (nodes.get(area.id)?.kind !== "subject")
        issue("Learning areas must reference subject nodes");
      if (new Set(area.topic_ids).size !== area.topic_ids.length)
        issue("Learning area topic references must be unique");
      for (const topicId of area.topic_ids) {
        const topic = nodes.get(topicId);
        if (topic?.kind !== "topic" || nodes.get(topic.parent_id ?? "")?.parent_id !== area.id)
          issue("Learning area references invalid or unrelated topic");
      }
    }
    if (
      new Set(curriculum.exam_mapping.papers.map((paper) => paper.code)).size !==
      curriculum.exam_mapping.papers.length
    )
      issue("Exam paper codes must be unique");
    for (const paper of curriculum.exam_mapping.papers) {
      if (paper.learning_area_ids.some((areaId) => !areaIds.has(areaId)))
        issue("Exam paper references unknown learning area");
    }
    const edges = new Map<string, string[]>();
    const edgeKeys = new Set<string>();
    for (const edge of curriculum.prerequisites) {
      const key = `${edge.node_id}:${edge.requires_node_id}`;
      if (edgeKeys.has(key)) issue("Prerequisite edges must be unique");
      edgeKeys.add(key);
      if (edge.node_id === edge.requires_node_id) issue("Self prerequisites are forbidden");
      if (
        nodes.get(edge.node_id)?.kind !== "topic" ||
        nodes.get(edge.requires_node_id)?.kind !== "topic"
      )
        issue("Prerequisites must reference topics");
      const targets = edges.get(edge.node_id) ?? [];
      targets.push(edge.requires_node_id);
      edges.set(edge.node_id, targets);
    }
    // Iterative Kahn traversal avoids recursive-stack failure on large imported graphs.
    const degrees = new Map([...nodes.keys()].map((id) => [id, 0]));
    for (const targets of edges.values())
      for (const target of targets) degrees.set(target, (degrees.get(target) ?? 0) + 1);
    const queue = [...degrees].filter(([, degree]) => degree === 0).map(([id]) => id);
    let visited = 0;
    while (queue.length) {
      const current = queue.pop();
      if (current === undefined) break;
      visited++;
      for (const target of edges.get(current) ?? []) {
        const degree = (degrees.get(target) ?? 0) - 1;
        degrees.set(target, degree);
        if (degree === 0) queue.push(target);
      }
    }
    if (visited !== degrees.size) issue("Prerequisite graph must be acyclic");
  });
export type Curriculum = z.infer<typeof curriculumSchema>;

export function validateCurriculum(input: unknown): Curriculum {
  return curriculumSchema.parse(input);
}
