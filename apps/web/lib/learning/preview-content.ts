import type { LessonCardData, SkyTopic } from "./types";
import type { ClientItem } from "@stellara/content-schema/client";

/**
 * Sample content for preview mode only. Like an offline practice pack (02 §3.4),
 * it carries its own keys so the browser can mark answers. It is synthetic,
 * written for this demo, and is never published content.
 */

const id = (group: number, n: number) =>
  `00000000-0000-4000-8000-${group.toString(16).padStart(4, "0")}${n.toString(16).padStart(8, "0")}`;

export const TOPICS = {
  placeValue: id(1, 1),
  fractions: id(1, 2),
  decimals: id(1, 3),
  money: id(1, 4),
  time: id(1, 5),
} as const;

export const SKY_TOPICS: Omit<SkyTopic, "level">[] = [
  { id: TOPICS.placeValue, title: "Place value", x: 18, y: 66 },
  { id: TOPICS.fractions, title: "Fractions", x: 40, y: 34 },
  { id: TOPICS.decimals, title: "Decimals", x: 62, y: 58 },
  { id: TOPICS.money, title: "Money", x: 80, y: 26 },
  { id: TOPICS.time, title: "Time", x: 86, y: 72 },
];
export const SKY_LINKS = [
  { from: TOPICS.placeValue, to: TOPICS.fractions },
  { from: TOPICS.fractions, to: TOPICS.decimals },
  { from: TOPICS.decimals, to: TOPICS.money },
  { from: TOPICS.decimals, to: TOPICS.time },
];

/** Placement strands map one-to-one onto the two topics with sample items. */
export const STRANDS = [
  { id: "whole-numbers", name: "Whole numbers", topic: TOPICS.placeValue },
  { id: "fractions", name: "Fractions", topic: TOPICS.fractions },
];

export interface PreviewKey {
  correct: string;
  hint: string;
  explanation: string;
}

type Row = {
  stem: string;
  /** Options, with the right one first; the order is shuffled per item below. */
  options?: string[];
  numeric?: string;
  hint: string;
  explanation: string;
  difficulty: "easy" | "standard" | "hard";
};

const placeValue: Row[] = [
  {
    stem: "What is the value of the 7 in 4,732?",
    options: ["700", "7", "70", "7,000"],
    hint: "Count the places from the right: ones, tens, hundreds.",
    explanation: "The 7 is in the hundreds place, so it is worth 7 × 100 = 700.",
    difficulty: "easy",
  },
  {
    stem: "What is the value of the 8 in 5,081?",
    options: ["80", "8", "800", "8,000"],
    hint: "Which place is second from the right?",
    explanation: "The 8 is in the tens place, so it is worth 8 × 10 = 80.",
    difficulty: "easy",
  },
  {
    stem: "Which digit is in the thousands place in 36,914?",
    options: ["6", "3", "9", "1"],
    hint: "Count four places from the right.",
    explanation: "From the right: 4 ones, 1 ten, 9 hundreds, 6 thousands, 3 ten thousands.",
    difficulty: "standard",
  },
  {
    stem: "Write 3 thousands, 4 hundreds and 5 ones as a number.",
    numeric: "3405",
    hint: "There are no tens, so the tens place holds a 0.",
    explanation: "3 thousands, 4 hundreds, 0 tens and 5 ones make 3,405.",
    difficulty: "standard",
  },
  {
    stem: "Which number is the largest?",
    options: ["70,340", "7,340", "70,304", "7,430"],
    hint: "Compare the number of digits first.",
    explanation:
      "70,340 and 70,304 have five digits. In the tens place, 4 is more than 0, so 70,340 is largest.",
    difficulty: "standard",
  },
  {
    stem: "What is 61,257 rounded to the nearest thousand?",
    options: ["61,000", "62,000", "60,000", "61,300"],
    hint: "Look at the hundreds digit to decide.",
    explanation: "The hundreds digit is 2, which is less than 5, so round down to 61,000.",
    difficulty: "standard",
  },
  {
    stem: "How many tens are in 4,096 altogether?",
    numeric: "409",
    hint: "Cover the ones digit and read what is left.",
    explanation: "4,096 is 409 tens and 6 ones.",
    difficulty: "hard",
  },
  {
    stem: "What is 1,000 more than 83,402?",
    options: ["84,402", "83,502", "93,402", "83,412"],
    hint: "Only the thousands digit changes.",
    explanation: "Add 1 to the thousands digit: 83,402 becomes 84,402.",
    difficulty: "easy",
  },
  {
    stem: "What is the value of the 5 in 1,750?",
    options: ["50", "5", "500", "5,000"],
    hint: "The 0 is in the ones place.",
    explanation: "The 5 is in the tens place, so it is worth 50.",
    difficulty: "easy",
  },
  {
    stem: "Which is the same as 29,683?",
    options: [
      "20,000 + 9,000 + 600 + 80 + 3",
      "2,000 + 900 + 60 + 8 + 3",
      "29,000 + 68 + 3",
      "20,000 + 9,600 + 83 + 0",
    ],
    hint: "Split the number by place: ten thousands, thousands, hundreds, tens, ones.",
    explanation: "29,683 = 20,000 + 9,000 + 600 + 80 + 3.",
    difficulty: "standard",
  },
  {
    stem: "What is 50,417 to the nearest hundred?",
    options: ["50,400", "50,500", "50,000", "50,420"],
    hint: "Look at the tens digit.",
    explanation: "The tens digit is 1, so round down to 50,400.",
    difficulty: "hard",
  },
  {
    stem: "Write the number that is 10 less than 2,605.",
    numeric: "2595",
    hint: "Taking 10 from 0 tens means borrowing from the hundreds.",
    explanation: "2,605 − 10 = 2,595.",
    difficulty: "hard",
  },
];

const fractions: Row[] = [
  {
    stem: "Which fraction is the same as one half?",
    options: ["2/4", "1/3", "3/4", "2/3"],
    hint: "Picture a cake cut into 4 equal pieces.",
    explanation: "Two quarters fill the same space as one half, so 2/4 = 1/2.",
    difficulty: "easy",
  },
  {
    stem: "A pizza is cut into 8 equal slices. Tolu eats 3. What fraction did Tolu eat?",
    options: ["3/8", "3/5", "5/8", "8/3"],
    hint: "The bottom number counts all the equal slices.",
    explanation: "3 slices out of 8 equal slices is 3/8.",
    difficulty: "easy",
  },
  {
    stem: "Which fraction is larger: 3/5 or 3/8?",
    options: ["3/5", "3/8", "They are equal", "You cannot tell"],
    hint: "The tops are the same. Which pieces are bigger: fifths or eighths?",
    explanation: "Fifths are bigger than eighths, so 3 fifths is more than 3 eighths.",
    difficulty: "standard",
  },
  {
    stem: "What is 1/4 + 2/4?",
    options: ["3/4", "3/8", "2/4", "1/2"],
    hint: "When the bottom numbers match, add only the top numbers.",
    explanation: "1 quarter + 2 quarters = 3 quarters, so the answer is 3/4.",
    difficulty: "easy",
  },
  {
    stem: "Write 6/8 in its simplest form.",
    options: ["3/4", "6/8", "2/3", "1/2"],
    hint: "Find a number that divides both 6 and 8.",
    explanation: "Divide the top and bottom by 2: 6 ÷ 2 = 3 and 8 ÷ 2 = 4, so 6/8 = 3/4.",
    difficulty: "standard",
  },
  {
    stem: "What is 1/3 of 18?",
    numeric: "6",
    hint: "Share 18 into 3 equal groups.",
    explanation: "18 ÷ 3 = 6, so one third of 18 is 6.",
    difficulty: "standard",
  },
  {
    stem: "Which fraction is equal to 3/9?",
    options: ["1/3", "1/9", "3/3", "1/6"],
    hint: "Divide the top and bottom by the same number.",
    explanation: "3 ÷ 3 = 1 and 9 ÷ 3 = 3, so 3/9 = 1/3.",
    difficulty: "standard",
  },
  {
    stem: "What is 5/6 − 2/6?",
    options: ["3/6", "3/0", "7/6", "3/12"],
    hint: "The bottom numbers match, so subtract the tops.",
    explanation: "5 sixths − 2 sixths = 3 sixths, which is 3/6.",
    difficulty: "easy",
  },
  {
    stem: "Ada has ₦200. She spends 3/4 of it. How much does she spend, in naira?",
    numeric: "150",
    hint: "First find 1/4 of ₦200.",
    explanation: "1/4 of 200 is 50, so 3/4 is 3 × 50 = ₦150.",
    difficulty: "hard",
  },
  {
    stem: "Put in order from smallest: 1/2, 1/5, 1/3.",
    options: ["1/5, 1/3, 1/2", "1/2, 1/3, 1/5", "1/3, 1/5, 1/2", "1/5, 1/2, 1/3"],
    hint: "With 1 on top, a bigger bottom number means a smaller piece.",
    explanation: "Fifths are smallest, then thirds, then halves: 1/5, 1/3, 1/2.",
    difficulty: "hard",
  },
  {
    stem: "Which mixed number is the same as 7/2?",
    options: ["3 1/2", "2 1/2", "3 1/7", "7 1/2"],
    hint: "How many whole 2s fit into 7?",
    explanation: "7 ÷ 2 = 3 remainder 1, so 7/2 = 3 1/2.",
    difficulty: "hard",
  },
  {
    stem: "What is 2/5 of 25?",
    numeric: "10",
    hint: "Find 1/5 of 25 first.",
    explanation: "1/5 of 25 is 5, so 2/5 is 2 × 5 = 10.",
    difficulty: "standard",
  },
];

/** Deterministic option order so the right answer is not always first. */
function order(options: string[], seed: number): string[] {
  const out = [...options];
  for (let i = out.length - 1; i > 0; i--) {
    const j = (seed * 7 + i * 3) % (i + 1);
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

function build(rows: Row[], topicId: string, group: number) {
  const items: ClientItem[] = [];
  const keys = new Map<string, PreviewKey>();
  rows.forEach((row, n) => {
    const itemId = id(group, n + 1);
    const base = {
      id: itemId,
      version: 1,
      topic_id: topicId,
      stem: row.stem,
      stimulus_id: null,
      difficulty: row.difficulty,
      tags: [],
      curriculum_edition: "revised_2025" as const,
      media: [],
      hint_available: true,
    };
    if (row.numeric !== undefined) {
      items.push({ ...base, type: "numeric" });
      keys.set(itemId, { correct: row.numeric, hint: row.hint, explanation: row.explanation });
    } else {
      const options = order(row.options!, n + group).map((text, i) => ({
        id: String.fromCharCode(97 + i),
        text,
      }));
      const right = options.find((o) => o.text === row.options![0])!;
      items.push({ ...base, type: "single_choice", options });
      keys.set(itemId, { correct: right.id, hint: row.hint, explanation: row.explanation });
    }
  });
  return { items, keys };
}

const pv = build(placeValue, TOPICS.placeValue, 2);
const fr = build(fractions, TOPICS.fractions, 3);
const lessonChecks = build(
  [
    {
      stem: "What is the value of the 3 in 3,218?",
      options: ["3,000", "300", "3", "30"],
      hint: "Count four places from the right.",
      explanation: "The 3 is in the thousands place, so it is worth 3,000.",
      difficulty: "easy",
    },
  ],
  TOPICS.placeValue,
  4,
);
const fractionCheck = build(
  [
    {
      stem: "Which fraction is the same as 2/6?",
      options: ["1/3", "1/2", "2/3", "1/6"],
      hint: "Divide the top and bottom by 2.",
      explanation: "2 ÷ 2 = 1 and 6 ÷ 2 = 3, so 2/6 = 1/3.",
      difficulty: "easy",
    },
  ],
  TOPICS.fractions,
  5,
);

export const ITEMS: ClientItem[] = [...pv.items, ...fr.items];
export const KEYS = new Map<string, PreviewKey>([
  ...pv.keys,
  ...fr.keys,
  ...lessonChecks.keys,
  ...fractionCheck.keys,
]);

export const LESSONS: Record<string, { title: string; cards: LessonCardData[] }> = {
  [TOPICS.placeValue]: {
    title: "Place value",
    cards: [
      {
        kind: "explain",
        body: "Every digit has a place. Its place tells you what it is worth: ones, tens, hundreds, thousands.",
      },
      {
        kind: "worked_example",
        body: "What is the 4 worth in 2,465?",
        steps: [
          "Count the places from the right: 5 ones, 6 tens, 4 hundreds.",
          "The 4 is in the hundreds place.",
          "So it is worth 4 × 100 = 400.",
        ],
      },
      { kind: "check", item: lessonChecks.items[0]! },
      { kind: "summary", body: "Moving one place to the left makes a digit worth ten times more." },
    ],
  },
  [TOPICS.fractions]: {
    title: "Fractions",
    cards: [
      {
        kind: "explain",
        body: "A fraction is part of a whole cut into equal parts. The bottom number says how many parts. The top number says how many we have.",
      },
      {
        kind: "worked_example",
        body: "Find a fraction equal to 1/2.",
        steps: [
          "Multiply the top by 2: 1 × 2 = 2.",
          "Multiply the bottom by 2: 2 × 2 = 4.",
          "So 2/4 is the same as 1/2.",
        ],
      },
      { kind: "check", item: fractionCheck.items[0]! },
      {
        kind: "summary",
        body: "Multiply or divide the top and bottom by the same number, and the fraction keeps its size.",
      },
    ],
  },
};
