import { describe, expect, it } from "vitest";

import { gradeResponse } from "../src/grade.js";

import type { ItemAnswer } from "@stellara/content-schema/server";

describe("gradeResponse", () => {
  it("marks single choice", () => {
    const key: ItemAnswer = { type: "single_choice", answer: { option_id: "b" } };
    expect(gradeResponse(key, { choice: "b" })).toBe(true);
    expect(gradeResponse(key, { choice: "a" })).toBe(false);
    expect(gradeResponse(key, { choices: ["b"] })).toBe("invalid");
  });

  it("marks multi choice as an unordered set without duplicates", () => {
    const key: ItemAnswer = { type: "multi_choice", answer: { option_ids: ["a", "c"] } };
    expect(gradeResponse(key, { choices: ["c", "a"] })).toBe(true);
    expect(gradeResponse(key, { choices: ["a"] })).toBe(false);
    expect(gradeResponse(key, { choices: ["a", "a"] })).toBe(false);
    expect(gradeResponse(key, { choices: ["a", "b"] })).toBe(false);
    expect(gradeResponse(key, { choice: "a" })).toBe("invalid");
  });

  it("marks numeric values by number, tolerating spaces and numbers", () => {
    const key: ItemAnswer = { type: "numeric", answer: { value: "12.5" } };
    expect(gradeResponse(key, { value: "12.50" })).toBe(true);
    expect(gradeResponse(key, { value: " 12.5 " })).toBe(true);
    expect(gradeResponse(key, { value: 12.5 })).toBe(true);
    expect(gradeResponse(key, { value: "13" })).toBe(false);
    expect(gradeResponse(key, { value: "12,5" })).toBe("invalid");
    expect(gradeResponse(key, { value: "" })).toBe("invalid");
    expect(gradeResponse(key, {})).toBe("invalid");
  });

  it("marks ordering by exact sequence", () => {
    const key: ItemAnswer = { type: "ordering", answer: { option_ids: ["x", "y", "z"] } };
    expect(gradeResponse(key, { order: ["x", "y", "z"] })).toBe(true);
    expect(gradeResponse(key, { order: ["y", "x", "z"] })).toBe(false);
    expect(gradeResponse(key, { order: ["x", "y"] })).toBe(false);
    expect(gradeResponse(key, { order: "xyz" })).toBe("invalid");
  });

  it("marks match pairs in any order", () => {
    const key: ItemAnswer = {
      type: "match",
      answer: {
        pairs: [
          { left_id: "1", right_id: "p" },
          { left_id: "2", right_id: "q" },
        ],
      },
    };
    const pair = (left_id: string, right_id: string) => ({ left_id, right_id });
    expect(gradeResponse(key, { pairs: [pair("2", "q"), pair("1", "p")] })).toBe(true);
    expect(gradeResponse(key, { pairs: [pair("1", "q"), pair("2", "p")] })).toBe(false);
    expect(gradeResponse(key, { pairs: [pair("1", "p")] })).toBe(false);
    expect(gradeResponse(key, { pairs: [pair("1", "p"), pair("1", "q")] })).toBe(false);
    expect(gradeResponse(key, { pairs: [{ left_id: "1" }] })).toBe("invalid");
  });

  it("marks cloze slots", () => {
    const key: ItemAnswer = {
      type: "cloze",
      answer: { slots: [{ slot_id: "s1", option_id: "o2" }] },
    };
    expect(gradeResponse(key, { slots: [{ slot_id: "s1", option_id: "o2" }] })).toBe(true);
    expect(gradeResponse(key, { slots: [{ slot_id: "s1", option_id: "o1" }] })).toBe(false);
    expect(gradeResponse(key, { slots: [] })).toBe(false);
    expect(gradeResponse(key, null)).toBe("invalid");
  });
});
