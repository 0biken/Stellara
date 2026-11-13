import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { initialMasteryState, updateMastery, type MasteryEvent } from "../src/mastery.js";

describe("M fixtures execute real response/event sequences", () => {
  for (let i = 1; i <= 14; i++) {
    const id = `M-${String(i).padStart(2, "0")}`;
    it(id, () => {
      const fixture = JSON.parse(
        readFileSync(new URL(`../fixtures/${id}.json`, import.meta.url), "utf8"),
      ) as {
        topicId: string;
        events: MasteryEvent[];
        expected: { level: number; evidenceCount: number };
      };
      let state = initialMasteryState(fixture.topicId);
      for (const event of fixture.events) state = updateMastery(state, event).state;
      expect(state.level).toBe(fixture.expected.level);
      expect(state.evidence).toHaveLength(fixture.expected.evidenceCount);
    });
  }
});
