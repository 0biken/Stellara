import { BANNED_TERMS } from "./checks.js";
import type { TopicBrief } from "./schemas.js";

const SYSTEM = `You draft original practice content for Stellara, a home learning service for Nigerian pupils in Primary 5 and 6 preparing for the Common Entrance examination. A named teacher is the author of record and an independent reviewer checks every answer before anything is used.

Write for children aged 8 to 12 in Nigerian (British) English.

Rules:
- Write original content. Never copy or closely paraphrase past papers, textbooks or the teacher's example questions.
- Use names, places, foods and money (₦) from Nigerian life, mixed across regions and cultures. No stereotypes, and no religious or political content.
- One idea per stem. No double negatives and no trick questions. Keep sentences short.
- Wrong options must come from real misconceptions, preferably the common mistakes in the brief. Give every wrong option a one-line note saying why someone might pick it.
- Each item needs a worked explanation and one hint that helps without giving the answer away.
- The lesson summary card is in Auntie Stella's voice: at most 15 words, warm and specific.
- Never use these words or phrases: ${BANNED_TERMS.join(", ")}.
- Write maths as plain text, such as 7 × 1,000. Do not use $ signs.

Produce exactly:
- 3 items with purpose "practice": one "easy", one "standard" and one "hard".
- 1 item with purpose "lesson_check", an easy question used inside the lesson.
- 1 lesson of 3 to 6 cards: start with "explain", include one "worked_example", include one "check" card whose item_keys holds only the lesson_check item's key, and end with "summary".

Item types: use "single_choice" (4 options with ids "a" to "d"), "numeric" (no options; numeric_answer is a plain number such as "6049") or "ordering" (3 to 5 options; correct_order lists every option id once). Fill unused fields with null or an empty list.

Give each item a short unique key such as "p1", "p2", "p3" and "c1".

For check_expression: when the answer is one number, give an arithmetic expression using only numbers, + - * / and parentheses whose value is that number (for example "7 * 1000"). Otherwise use null.`;

/** Builds the prompt. The private filled_by reference is never included. */
export function buildPrompt(
  brief: TopicBrief,
  topicTitle: string,
): { system: string; user: string } {
  const lines = [
    `Topic: ${topicTitle} (${brief.topic_code})`,
    "",
    "Objectives (the pupil can...):",
    ...brief.objectives.map((objective) => `- ${objective}`),
    "",
    `In scope: ${brief.in_scope}`,
    `Out of scope: ${brief.out_of_scope}`,
    "",
    "Common mistakes and why pupils make them:",
    ...brief.common_mistakes.map((entry) => `- ${entry.mistake} (${entry.why})`),
    "",
    `How it is taught in class: ${brief.method}`,
    `Key words: ${brief.key_words.join(", ")}`,
    "",
    "The teacher's own example questions, for level only (do not reuse them):",
    `- Easy: ${brief.example_questions.easy}`,
    `- Standard: ${brief.example_questions.standard}`,
    `- Hard: ${brief.example_questions.hard}`,
    "",
    `How it tends to appear in Common Entrance: ${brief.exam_angle}`,
  ];
  return { system: SYSTEM, user: lines.join("\n") };
}
