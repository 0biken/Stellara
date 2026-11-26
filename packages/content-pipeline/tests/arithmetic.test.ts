import type { DraftItem } from "@stellara/content-schema/server";
import { describe, expect, it } from "vitest";

import {
  ExpressionError,
  evaluateExpression,
  machineCheck,
  parseNumberText,
} from "../src/arithmetic.js";

const base = {
  id: "90000000-0000-4000-8000-000000000001",
  version: 1,
  topic_id: "72000000-0000-4000-8000-000000000004",
  status: "draft",
} as const;
const choice = (texts: string[], key: string) =>
  ({
    ...base,
    type: "single_choice",
    options: texts.map((text, index) => ({ id: String.fromCharCode(97 + index), text })),
    answer: { option_id: key },
  }) as DraftItem;
const numeric = (value: string) => ({ ...base, type: "numeric", answer: { value } }) as DraftItem;
const ordering = (texts: string[], order: string[]) =>
  ({
    ...base,
    type: "ordering",
    options: texts.map((text, index) => ({ id: String.fromCharCode(97 + index), text })),
    answer: { option_ids: order },
  }) as DraftItem;

describe("evaluateExpression", () => {
  it("evaluates precedence and parentheses", () => {
    expect(evaluateExpression("2 + 3 × 4")).toBe(14);
    expect(evaluateExpression("(2 + 3) * 4")).toBe(20);
    expect(evaluateExpression("4705 - 2398")).toBe(2307);
    expect(evaluateExpression("-3 + 5")).toBe(2);
    expect(evaluateExpression("7 * 1000")).toBe(7000);
    expect(evaluateExpression("12 ÷ 4 / 3")).toBe(1);
  });
  it("rejects unsafe or malformed input", () => {
    for (const bad of ["process.exit()", "2 +", "", "1 / 0", "1,000 + 1", "(2 + 3"])
      expect(() => evaluateExpression(bad), bad).toThrow(ExpressionError);
  });
});

describe("parseNumberText", () => {
  it("parses naira and thousands separators", () => {
    expect(parseNumberText("₦1,250")).toBe(1250);
    expect(parseNumberText("47,325")).toBe(47325);
    expect(parseNumberText("seven")).toBeNull();
  });
});

describe("machineCheck", () => {
  it("flags two options equal to the answer", () => {
    expect(machineCheck(choice(["7000", "7,000", "700"], "a"), "7*1000").status).toBe("mismatch");
  });
  it("flags a keyed option that is not the computed value", () => {
    expect(machineCheck(choice(["700", "7000"], "a"), "7*1000").status).toBe("mismatch");
  });
  it("matches a correct single choice item", () => {
    expect(machineCheck(choice(["700", "7,000"], "b"), "7*1000").status).toBe("match");
  });
  it("matches a correct numeric item", () => {
    expect(machineCheck(numeric("6049"), "6*1000 + 4*10 + 9").status).toBe("match");
  });
  it("flags a wrong numeric item", () => {
    expect(machineCheck(numeric("6409"), "6*1000 + 4*10 + 9").status).toBe("mismatch");
  });
  it("marks a numeric item without an expression unchecked", () => {
    expect(machineCheck(numeric("6049"), null).status).toBe("unchecked");
  });
  it("reports an invalid expression as an error", () => {
    expect(machineCheck(numeric("1"), "2 +").status).toBe("error");
  });
  it("accepts a descending numeric order and rejects an unsorted one", () => {
    expect(
      machineCheck(ordering(["30,405", "30,045", "34,005"], ["c", "a", "b"]), null).status,
    ).toBe("match");
    expect(
      machineCheck(ordering(["30,405", "30,045", "34,005"], ["a", "b", "c"]), null).status,
    ).toBe("mismatch");
  });
});
