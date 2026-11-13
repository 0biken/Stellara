import { describe, it, expect } from "vitest";

import { learningDay, creditLearningDay, learningDayBounds, addCalendarDays } from "../src/time.js";
const utc = (s: string) => Date.parse(s);
describe("learning time", () => {
  it("uses explicit local 03 boundary including DST days", () => {
    expect(learningDay(utc("2027-01-02T01:59:59Z"), "Africa/Lagos")).toBe("2027-01-01");
    expect(learningDay(utc("2027-01-02T02:00:00Z"), "Africa/Lagos")).toBe("2027-01-02");
    expect(learningDayBounds("2027-03-13", "America/New_York")).toEqual({
      start: utc("2027-03-13T08:00:00Z"),
      end: utc("2027-03-14T07:00:00Z"),
    });
    expect(addCalendarDays("2028-02-28", 2)).toBe("2028-03-01");
  });
  it("credits 72 hours inclusively and requires strictly less than ten minutes skew", () => {
    const recordedAt = utc("2027-01-01T10:00Z");
    expect(
      creditLearningDay(
        {
          recordedAt,
          receivedAt: recordedAt + 72 * 3600000,
          deviceClockAtSync: recordedAt + 72 * 3600000,
        },
        "Africa/Lagos",
      ),
    ).toEqual({ day: "2027-01-01", credited: true, source: "device" });
    expect(
      creditLearningDay(
        {
          recordedAt,
          receivedAt: recordedAt + 80 * 3600000,
          deviceClockAtSync: recordedAt + 80 * 3600000,
        },
        "Africa/Lagos",
      ).credited,
    ).toBe(false);
    expect(
      creditLearningDay(
        {
          recordedAt,
          receivedAt: recordedAt + 86400000,
          deviceClockAtSync: recordedAt + 86400000 + 600000,
        },
        "Africa/Lagos",
      ),
    ).toEqual({ day: "2027-01-02", credited: true, source: "server" });
  });
});
