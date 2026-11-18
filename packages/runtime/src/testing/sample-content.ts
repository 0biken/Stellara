import type { PublishedItem, PublishedLesson } from "@stellara/content-schema/server";
import { AUTHOR, REVIEWER } from "./fixtures.js";

export interface SampleTopicDef {
  id: string;
  title: string;
  year: "P4" | "P5" | "P6";
  strand_id: string;
  strand_name: string;
}

export const SAMPLE_TOPIC_DEFS: SampleTopicDef[] = [
  {
    id: "00000000-0000-4000-8000-000400000001",
    title: "P4 Fractions",
    year: "P4",
    strand_id: "p4-fractions-strand",
    strand_name: "Fractions and Parts",
  },
  {
    id: "00000000-0000-4000-8000-000400000002",
    title: "P4 Shapes",
    year: "P4",
    strand_id: "p4-shapes-strand",
    strand_name: "2D and 3D Shapes",
  },
  {
    id: "00000000-0000-4000-8000-000100000002", // Reusing existing P5 fractions ID
    title: "P5 Fractions",
    year: "P5",
    strand_id: "p5-fractions-strand",
    strand_name: "Fractions and Decimals",
  },
  {
    id: "00000000-0000-4000-8000-000500000002",
    title: "P5 Angles",
    year: "P5",
    strand_id: "p5-angles-strand",
    strand_name: "Angles and Lines",
  },
  {
    id: "00000000-0000-4000-8000-000600000001",
    title: "P6 Fractions",
    year: "P6",
    strand_id: "p6-fractions-strand",
    strand_name: "Advanced Fractions and Ratios",
  },
  {
    id: "00000000-0000-4000-8000-000600000002",
    title: "P6 Area",
    year: "P6",
    strand_id: "p6-area-strand",
    strand_name: "Area and Perimeter",
  },
];

const pad = (n: number, width: number) => n.toString(16).padStart(width, "0");
const itemId = (topicIdx: number, typePrefix: string, itemIdx: number) =>
  `00000000-0000-4000-8000-${typePrefix}${pad(topicIdx, 3)}${pad(itemIdx, 8)}`;
const lessonId = (topicIdx: number) =>
  `00000000-0000-4000-8000-1e55${pad(topicIdx, 8)}`;

interface QuestionTemplate {
  stem: (i: number) => string;
  options: (i: number) => [string, string, string, string]; // correct first
  hint: (i: number) => string;
  explanation: (i: number) => string;
}

const TEMPLATES: Record<string, QuestionTemplate> = {
  "P4 Fractions": {
    stem: (i) => `What is ${i + 1}/8 + ${i + 2}/8?`,
    options: (i) => [
      `${2 * i + 3}/8`,
      `${2 * i + 2}/8`,
      `${2 * i + 4}/8`,
      `${2 * i + 3}/16`,
    ],
    hint: () => "When denominators are the same, add the numerators.",
    explanation: (i) =>
      `Add numerators ${i + 1} and ${i + 2} over denominator 8: ${2 * i + 3}/8.`,
  },
  "P4 Shapes": {
    stem: (i) => {
      const shapes = ["triangle", "quadrilateral", "pentagon", "hexagon", "octagon"];
      return `How many sides does a regular ${shapes[i % shapes.length]} have?`;
    },
    options: (i) => {
      const counts = ["3", "4", "5", "6", "8"];
      const correct = counts[i % counts.length];
      const others = ["2", "7", "9", "10"].filter((c) => c !== correct);
      return [correct, others[0], others[1], others[2]];
    },
    hint: () => "Count the straight outer edges of the shape.",
    explanation: (i) => {
      const sides = [3, 4, 5, 6, 8];
      const s = sides[i % sides.length];
      return `A regular shape of this type has exactly ${s} straight sides.`;
    },
  },
  "P5 Fractions": {
    stem: (i) => `Convert the improper fraction ${(i + 2) * 3 + 1}/3 to a mixed number.`,
    options: (i) => [
      `${i + 2} 1/3`,
      `${i + 2} 2/3`,
      `${i + 1} 1/3`,
      `${i + 3} 1/3`,
    ],
    hint: () => "Divide the numerator by 3 to find whole number and remainder.",
    explanation: (i) =>
      `${(i + 2) * 3 + 1} divided by 3 is ${i + 2} with remainder 1, so ${i + 2} 1/3.`,
  },
  "P5 Angles": {
    stem: (i) =>
      `Two angles on a straight line are ${50 + (i % 8) * 5}° and x°. What is x?`,
    options: (i) => {
      const angle = 50 + (i % 8) * 5;
      const x = 180 - angle;
      return [`${x}°`, `${x - 10}°`, `${x + 10}°`, `${190 - angle}°`];
    },
    hint: () => "Angles on a straight line add up to 180°.",
    explanation: (i) => {
      const angle = 50 + (i % 8) * 5;
      return `180° - ${angle}° = ${180 - angle}°.`;
    },
  },
  "P6 Fractions": {
    stem: (i) => `What is ${i + 1}/4 multiplied by 2/${i + 3}? (in simplest terms)`,
    options: (i) => {
      const num = 2 * (i + 1);
      const den = 4 * (i + 3);
      // gcd
      const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
      const g = gcd(num, den);
      const simp = `${num / g}/${den / g}`;
      return [simp, `${num}/${den + 2}`, `${num + 1}/${den}`, `${num}/${den * 2}`];
    },
    hint: () => "Multiply numerators together, then denominators, then simplify.",
    explanation: () => "Multiply numerators and denominators, then divide by the greatest common divisor.",
  },
  "P6 Area": {
    stem: (i) =>
      `Find the area of a rectangle with length ${i + 4} cm and width ${i + 2} cm.`,
    options: (i) => {
      const area = (i + 4) * (i + 2);
      return [
        `${area} cm²`,
        `${area - 2} cm²`,
        `${(i + 4 + i + 2) * 2} cm²`,
        `${area + 4} cm²`,
      ];
    },
    hint: () => "Area of rectangle = length × width.",
    explanation: (i) =>
      `${i + 4} cm × ${i + 2} cm = ${(i + 4) * (i + 2)} cm².`,
  },
};

export function buildSampleItem(
  id: string,
  topicId: string,
  purpose: "practice" | "lesson_check" | "placement",
  template: QuestionTemplate,
  index: number,
): PublishedItem {
  const [right, o1, o2, o3] = template.options(index);
  // Deterministic shuffle using index
  const opts = [right, o1, o2, o3];
  const shift = index % 4;
  const rotated = [...opts.slice(shift), ...opts.slice(0, shift)];
  const options = rotated.map((text, idx) => ({
    id: String.fromCharCode(97 + idx),
    text,
  }));
  const correctOption = options.find((o) => o.text === right)!;

  return {
    id,
    version: 1,
    topic_id: topicId,
    type: "single_choice",
    stem: template.stem(index),
    stimulus_id: null,
    explanation: template.explanation(index),
    hint: template.hint(index),
    difficulty: index % 3 === 0 ? "easy" : index % 3 === 1 ? "standard" : "hard",
    tags: ["sample_content"],
    purpose,
    curriculum_edition: "revised_2025",
    media: [],
    exposure_count: 0,
    provenance: "original",
    author_id: AUTHOR,
    reviewer_id: REVIEWER,
    answer_verified_at: "2026-11-01T00:00:00Z",
    status: "published",
    options,
    answer: { option_id: correctOption.id },
  };
}

export const SAMPLE_PRACTICE_ITEMS: PublishedItem[] = [];
export const SAMPLE_CHECK_ITEMS: PublishedItem[] = [];
export const SAMPLE_LESSONS: PublishedLesson[] = [];

SAMPLE_TOPIC_DEFS.forEach((t, topicIdx) => {
  const template = TEMPLATES[t.title];
  if (!template) throw new Error(`Missing template for ${t.title}`);

  // 30 practice items
  const practiceItems: PublishedItem[] = [];
  for (let i = 0; i < 30; i++) {
    const item = buildSampleItem(
      itemId(topicIdx, "0001", i + 1),
      t.id,
      "practice",
      template,
      i,
    );
    practiceItems.push(item);
    SAMPLE_PRACTICE_ITEMS.push(item);
  }

  // 3 lesson check items
  const checkItems: PublishedItem[] = [];
  for (let i = 0; i < 3; i++) {
    const item = buildSampleItem(
      itemId(topicIdx, "0002", i + 1),
      t.id,
      "lesson_check",
      template,
      30 + i,
    );
    checkItems.push(item);
    SAMPLE_CHECK_ITEMS.push(item);
  }

  // 1 published lesson
  const lesson: PublishedLesson = {
    id: lessonId(topicIdx),
    version: 1,
    topic_id: t.id,
    title: `${t.title} Lesson`,
    status: "published",
    cards: [
      {
        kind: "explain",
        body: `Welcome to ${t.title}. In this sample lesson, we learn core concepts step by step.`,
      },
      {
        kind: "worked_example",
        body: `Worked Example for ${t.title}:`,
        steps: [
          "Step 1: Read the problem carefully.",
          "Step 2: Apply the mathematical rule.",
          "Step 3: Check your result.",
        ],
      },
      {
        kind: "check",
        item_id: checkItems[0].id,
      },
      {
        kind: "try_it",
        item_ids: [checkItems[1].id, checkItems[2].id],
      },
      {
        kind: "summary",
        body: `Great effort! You are now ready for independent practice in ${t.title}.`,
      },
    ],
  };
  SAMPLE_LESSONS.push(lesson);
});
