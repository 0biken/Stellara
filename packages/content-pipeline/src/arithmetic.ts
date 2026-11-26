import type { DraftItem } from "@stellara/content-schema/server";

export class ExpressionError extends Error {
  override name = "ExpressionError";
}

type Token = { kind: "num"; value: number } | { kind: "op"; value: string };

function tokenize(expr: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < expr.length) {
    const ch = expr[i]!;
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    const number = /^\d+(?:\.\d+)?/.exec(expr.slice(i));
    if (number) {
      const next = expr[i + number[0].length];
      if (next !== undefined && /[\d.,]/.test(next))
        throw new ExpressionError(`Unexpected "${next}" after ${number[0]}`);
      tokens.push({ kind: "num", value: Number(number[0]) });
      i += number[0].length;
      continue;
    }
    if ("+-*/×÷()".includes(ch)) {
      tokens.push({ kind: "op", value: ch === "×" ? "*" : ch === "÷" ? "/" : ch });
      i++;
      continue;
    }
    throw new ExpressionError(`Unexpected "${ch}"`);
  }
  return tokens;
}

/** Evaluates + - * / × ÷, parentheses and unary minus. Never uses eval. */
export function evaluateExpression(expr: string): number {
  const tokens = tokenize(expr);
  if (tokens.length === 0) throw new ExpressionError("Empty expression");
  let pos = 0;
  const peek = () => tokens[pos];
  const isOp = (value: string) => {
    const token = peek();
    return token?.kind === "op" && token.value === value;
  };

  const primary = (): number => {
    const token = tokens[pos++];
    if (!token) throw new ExpressionError("Expression ends too early");
    if (token.kind === "num") return token.value;
    if (token.value === "-") return -primary();
    if (token.value === "(") {
      const value = sum();
      if (!isOp(")")) throw new ExpressionError("Missing closing parenthesis");
      pos++;
      return value;
    }
    throw new ExpressionError(`Unexpected "${token.value}"`);
  };
  const product = (): number => {
    let value = primary();
    while (isOp("*") || isOp("/")) {
      const op = (tokens[pos++] as Token).value;
      const right = primary();
      if (op === "/" && right === 0) throw new ExpressionError("Division by zero");
      value = op === "*" ? value * right : value / right;
    }
    return value;
  };
  const sum = (): number => {
    let value = product();
    while (isOp("+") || isOp("-")) {
      const op = (tokens[pos++] as Token).value;
      const right = product();
      value = op === "+" ? value + right : value - right;
    }
    return value;
  };

  const result = sum();
  if (pos !== tokens.length) throw new ExpressionError("Unexpected text after the expression");
  return result;
}

/** Reads "₦1,250", "47,325" or "2.5" as a number; returns null for anything else. */
export function parseNumberText(text: string): number | null {
  const cleaned = text.replace(/₦/g, "").replace(/\s/g, "");
  if (!/^-?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?$/.test(cleaned)) return null;
  return Number(cleaned.replace(/,/g, ""));
}

export interface MachineCheck {
  status: "match" | "mismatch" | "unchecked" | "error";
  detail: string;
}

const TOLERANCE = 1e-9;
const same = (a: number, b: number) => Math.abs(a - b) <= TOLERANCE;

export function machineCheck(item: DraftItem, expression: string | null): MachineCheck {
  try {
    switch (item.type) {
      case "numeric": {
        if (!expression) return { status: "unchecked", detail: "No check expression" };
        const expected = evaluateExpression(expression);
        const keyed = Number(item.answer?.value);
        return same(expected, keyed)
          ? { status: "match", detail: `${expression} = ${expected}` }
          : { status: "mismatch", detail: `${expression} = ${expected}, but the key is ${keyed}` };
      }
      case "single_choice": {
        if (!expression) return { status: "unchecked", detail: "No check expression" };
        const options = item.options ?? [];
        const values = options.map((option) => parseNumberText(option.text));
        if (options.length === 0 || values.some((value) => value === null))
          return { status: "unchecked", detail: "Options are not all numbers" };
        const expected = evaluateExpression(expression);
        const equal = options.filter((_, index) => same(values[index]!, expected));
        if (equal.length !== 1)
          return {
            status: "mismatch",
            detail: `${equal.length} options equal ${expected}; exactly one must`,
          };
        return equal[0]!.id === item.answer?.option_id
          ? { status: "match", detail: `${expression} = ${expected}` }
          : {
              status: "mismatch",
              detail: `Option ${equal[0]!.id} equals ${expected}, not the key`,
            };
      }
      case "ordering": {
        const byId = new Map((item.options ?? []).map((o) => [o.id, parseNumberText(o.text)]));
        const values = (item.answer?.option_ids ?? []).map((id) => byId.get(id) ?? null);
        if (values.length === 0 || values.some((value) => value === null))
          return { status: "unchecked", detail: "Options are not all numbers" };
        const nums = values as number[];
        const ascending = nums.every((value, i) => i === 0 || value > nums[i - 1]!);
        const descending = nums.every((value, i) => i === 0 || value < nums[i - 1]!);
        const note = "Reviewer must confirm the direction the stem asks for.";
        return ascending || descending
          ? { status: "match", detail: `${ascending ? "Ascending" : "Descending"}. ${note}` }
          : { status: "mismatch", detail: "The keyed order is not sorted" };
      }
      default:
        return { status: "unchecked", detail: `No machine check for ${item.type}` };
    }
  } catch (error) {
    if (error instanceof ExpressionError) return { status: "error", detail: error.message };
    throw error;
  }
}
