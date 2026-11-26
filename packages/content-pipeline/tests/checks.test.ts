import { describe, expect, it } from "vitest";

import { checkBatch } from "../src/checks.js";

import { modelDraft } from "./fixtures.js";
import { buildBatch } from "./helpers.js";

const errorsOf = (report: ReturnType<typeof checkBatch>) => [
  ...report.batch_errors,
  ...report.items.flatMap((item) => item.errors),
];
const edit = (change: (draft: typeof modelDraft) => void) => {
  const draft = structuredClone(modelDraft);
  change(draft);
  return buildBatch(draft);
};

describe("checkBatch", () => {
  it("passes the synthetic batch", () => {
    const report = checkBatch(buildBatch());
    expect(errorsOf(report)).toEqual([]);
    expect(report.ok).toBe(true);
    expect(report.batch_warnings).toContain("provenance pending counsel (G3)");
  });
  it("fails when the hard practice item is missing", () => {
    const report = checkBatch(edit((d) => d.items.splice(2, 1)));
    expect(report.ok).toBe(false);
    expect(report.batch_errors.join(" ")).toMatch(/hard/);
  });
  it("fails a wrong option without a distractor note", () => {
    const report = checkBatch(edit((d) => d.items[0]!.distractor_notes.pop()));
    expect(errorsOf(report).join(" ")).toMatch(/option c needs a distractor note/);
  });
  it("fails a lesson check card pointing at a practice item", () => {
    const report = checkBatch(
      edit((d) => {
        d.lesson.cards[2]!.item_keys = ["p1"];
      }),
    );
    expect(report.batch_errors.join(" ")).toMatch(/lesson_check/);
  });
  it("fails a stem that repeats an existing stem with different spacing and case", () => {
    const report = checkBatch(buildBatch(), ["what is the VALUE of the digit 7   in 47,325"]);
    expect(errorsOf(report).join(" ")).toMatch(/duplicate/i);
  });
  it("fails a duplicate stem inside the batch", () => {
    const report = checkBatch(
      edit((d) => {
        d.items[3]!.stem = d.items[0]!.stem;
      }),
    );
    expect(errorsOf(report).join(" ")).toMatch(/duplicate/i);
  });
  it('fails the banned term "expo" in a hint', () => {
    const report = checkBatch(
      edit((d) => {
        d.items[1]!.hint = "This is like the expo questions.";
      }),
    );
    expect(errorsOf(report).join(" ")).toMatch(/expo/);
  });
  it("fails an unbalanced dollar sign", () => {
    const report = checkBatch(
      edit((d) => {
        d.items[1]!.explanation = "So $6049 is the number.";
      }),
    );
    expect(errorsOf(report).join(" ")).toMatch(/\$/);
  });
  it("fails a machine-check mismatch", () => {
    const report = checkBatch(
      edit((d) => {
        d.items[1]!.numeric_answer = "6409";
      }),
    );
    expect(report.items.find((item) => item.key === "p2")?.errors.join(" ")).toMatch(/6049/);
  });
  it("warns on a 25-word stem sentence but stays ok", () => {
    const long = `${Array.from({ length: 24 }, () => "word").join(" ")} 47,325?`;
    const report = checkBatch(
      edit((d) => {
        d.items[0]!.stem = `What is the value of the digit 7 in 47,325? ${long}`;
      }),
    );
    expect(report.ok).toBe(true);
    expect(report.items[0]?.warnings.join(" ")).toMatch(/words/);
  });
  it("warns that an answer without an expression must be worked by hand", () => {
    const report = checkBatch(
      edit((d) => {
        d.items[1]!.check_expression = null;
      }),
    );
    expect(report.items.find((item) => item.key === "p2")?.warnings.join(" ")).toMatch(/by hand/);
  });
});
