import { describe, expect, it } from "vitest";

import { buildMonthlySummary, longestPractisedRun, monthWindow } from "../src/reports.js";

describe("monthWindow", () => {
  it("returns the last complete Lagos month", () => {
    // 1 Feb 2027 00:30 Lagos is still 31 Jan in UTC.
    const at = Date.parse("2027-01-31T23:30:00Z");
    expect(monthWindow(at)).toEqual({
      start: Date.parse("2026-12-31T23:00:00Z"),
      end: Date.parse("2027-01-31T23:00:00Z"),
      month: "2027-01",
    });
    expect(monthWindow(Date.parse("2027-01-31T22:30:00Z")).month).toBe("2026-12");
  });
  it("crosses the year boundary", () => {
    const w = monthWindow(Date.parse("2027-01-15T12:00:00Z"));
    expect(w.month).toBe("2026-12");
    expect(w.start).toBe(Date.parse("2026-11-30T23:00:00Z"));
  });
  it("rejects invalid input", () => {
    expect(() => monthWindow(Number.NaN)).toThrow(RangeError);
  });
});

describe("buildMonthlySummary", () => {
  it("celebrates topics mastered in the month", () => {
    const out = buildMonthlySummary({
      activeDays: 12,
      topics: [
        { id: "b", level: 5, masteredInMonth: true },
        { id: "a", level: 5, masteredInMonth: true },
        { id: "c", level: 5, masteredInMonth: false },
        { id: "d", level: 3, masteredInMonth: false },
        { id: "e", level: 4, masteredInMonth: false },
        { id: "f", level: 2, masteredInMonth: false },
        { id: "g", level: 1, masteredInMonth: false },
      ],
    });
    expect(out.stats).toEqual({ activeDays: 12, mastered: 3, inProgress: 3 });
    expect(out.newlyMastered).toEqual(["a", "b"]);
    expect(out.workingOn).toEqual(["e", "d"]);
    expect(out.note).toEqual({ key: "month_mastered", values: { topicIds: ["a", "b"] } });
  });
  it("names what the child is working on when nothing was mastered", () => {
    const out = buildMonthlySummary({
      activeDays: 3,
      // A topic that reached mastered and then moved down is not celebrated.
      topics: [
        { id: "x", level: 2, masteredInMonth: false },
        { id: "y", level: 4, masteredInMonth: true },
      ],
    });
    expect(out.newlyMastered).toEqual([]);
    expect(out.note).toEqual({ key: "month_practised", values: { topicIds: ["y", "x"] } });
  });
  it("stays neutral for a quiet month", () => {
    const out = buildMonthlySummary({ activeDays: 0, topics: [] });
    expect(out.note.key).toBe("month_quiet");
    expect(out.workingOn).toEqual([]);
  });
});

describe("longestPractisedRun", () => {
  it("counts consecutive days and ignores single days", () => {
    expect(longestPractisedRun([])).toBe(0);
    expect(longestPractisedRun(["2027-01-04"])).toBe(0);
    expect(longestPractisedRun(["2027-01-04", "2027-01-06"])).toBe(0);
    expect(
      longestPractisedRun(["2027-01-07", "2027-01-04", "2027-01-05", "2027-01-06", "2027-01-05"]),
    ).toBe(4);
    expect(longestPractisedRun(["2026-12-31", "2027-01-01", "2027-01-03"])).toBe(2);
  });
});
