import type { ModelDraft, TopicBrief } from "../src/schemas.js";

/** Synthetic data only; not approved content. */
export const brief: TopicBrief = {
  topic_code: "mathematics.s1.t1",
  objectives: ["The pupil can state the value of a digit in a whole number up to millions."],
  in_scope: "Whole numbers up to 9,999,999.",
  out_of_scope: "Decimals and negative numbers.",
  common_mistakes: [
    { mistake: "Gives the face value instead of the place value", why: "Reads the digit alone" },
    { mistake: "Drops zero placeholders", why: "Thinks zero means nothing" },
  ],
  method: "Use a place value chart from ones to millions.",
  key_words: ["digit", "place value", "thousands"],
  example_questions: {
    easy: "What is the value of 3 in 435?",
    standard: "Write 5 thousands and 2 tens as a number.",
    hard: "Order 30,405, 30,045 and 34,005 from smallest.",
  },
  exam_angle: "Short items asking for the value of an underlined digit.",
  sources: [{ title: "Synthetic", edition: "legacy", pages: "1-3", reuse: "unknown" }],
};

export const modelDraft: ModelDraft = {
  items: [
    {
      key: "p1",
      purpose: "practice",
      type: "single_choice",
      difficulty: "easy",
      stem: "What is the value of the digit 7 in 47,325?",
      options: [
        { id: "a", text: "7" },
        { id: "b", text: "70" },
        { id: "c", text: "700" },
        { id: "d", text: "7,000" },
      ],
      correct_option_id: "d",
      correct_order: [],
      numeric_answer: null,
      explanation: "The 7 is in the thousands place, so it is worth 7 × 1,000 = 7,000.",
      hint: "Find the place of the 7 on a place value chart.",
      distractor_notes: [
        { option_id: "a", why: "Gives the face value of the digit." },
        { option_id: "b", why: "Counts the place one step too far right." },
        { option_id: "c", why: "Counts the place two steps too far right." },
      ],
      check_expression: "7 * 1000",
    },
    {
      key: "p2",
      purpose: "practice",
      type: "numeric",
      difficulty: "standard",
      stem: "Write 6 thousands, 0 hundreds, 4 tens and 9 ones as a number.",
      options: [],
      correct_option_id: null,
      correct_order: [],
      numeric_answer: "6049",
      explanation: "6 thousands is 6,000, 4 tens is 40 and 9 ones is 9, so the number is 6,049.",
      hint: "Remember the zero in the hundreds place.",
      distractor_notes: [],
      check_expression: "6 * 1000 + 0 * 100 + 4 * 10 + 9",
    },
    {
      key: "p3",
      purpose: "practice",
      type: "ordering",
      difficulty: "hard",
      stem: "Arrange these numbers from smallest to largest.",
      options: [
        { id: "a", text: "30,405" },
        { id: "b", text: "30,045" },
        { id: "c", text: "34,005" },
      ],
      correct_option_id: null,
      correct_order: ["b", "a", "c"],
      numeric_answer: null,
      explanation: "Compare thousands first, then hundreds: 30,045 < 30,405 < 34,005.",
      hint: "Compare the digits from the left.",
      distractor_notes: [],
      check_expression: null,
    },
    {
      key: "c1",
      purpose: "lesson_check",
      type: "single_choice",
      difficulty: "easy",
      stem: "In 582, which digit is in the tens place?",
      options: [
        { id: "a", text: "5" },
        { id: "b", text: "8" },
        { id: "c", text: "2" },
      ],
      correct_option_id: "b",
      correct_order: [],
      numeric_answer: null,
      explanation:
        "From the right the places are ones, tens and hundreds, so 8 is in the tens place.",
      hint: "Start counting places from the right.",
      distractor_notes: [
        { option_id: "a", why: "Picks the hundreds digit." },
        { option_id: "c", why: "Picks the ones digit." },
      ],
      check_expression: "8",
    },
  ],
  lesson: {
    title: "Place value",
    cards: [
      {
        kind: "explain",
        body: "Each place is worth ten times the place on its right.",
        steps: [],
        item_keys: [],
      },
      {
        kind: "worked_example",
        body: "Find the value of 4 in 2,416.",
        steps: ["The 4 is in the hundreds place.", "4 × 100 = 400."],
        item_keys: [],
      },
      { kind: "check", body: null, steps: [], item_keys: ["c1"] },
      { kind: "summary", body: "Find the place, then multiply.", steps: [], item_keys: [] },
    ],
  },
};
