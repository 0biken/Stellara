import fc from "fast-check";
import { describe, expect, it } from "vitest";

import {
  initialMasteryState,
  updateMastery,
  type MasteryEvent,
  type MasteryState,
} from "../src/mastery.js";
import { scheduleReviews, selectDueTopics } from "../src/reviews.js";
import { scoreResponse, type ScoringResponse } from "../src/scoring.js";

import { advanced, event, response } from "./mastery-helpers.js";

const DAY = 86_400_000;
describe("response scoring", () => {
  it("scores first responses and only repetitions at the exact thirty-day boundary across versions", () => {
    const r = response(1, { answeredAt: 30 * DAY });
    expect(scoreResponse(r).scored).toBe(true);
    expect(scoreResponse(r, [{ itemId: r.itemId, answeredAt: 0 }]).scored).toBe(true);
    expect(
      scoreResponse({ ...r, answeredAt: 30 * DAY - 1, itemVersion: "2" }, [
        { itemId: r.itemId, answeredAt: 0 },
      ]).reason,
    ).toBe("seen_within_30_days");
  });
  it.each(["hintShown", "explanationShown", "grownup"] as const)("rejects %s", (key) => {
    expect(scoreResponse(response(1, { [key]: true })).scored).toBe(false);
  });
  it("enforces response time boundaries and offline confidence", () => {
    expect(scoreResponse(response(1, { responseMs: 2499 })).scored).toBe(false);
    expect(scoreResponse(response(1, { responseMs: 1500, quick: true })).scored).toBe(true);
    expect(scoreResponse(response(1, { responseMs: 1499, quick: true })).scored).toBe(false);
    expect(scoreResponse(response(1, { keyOnDevice: true })).scored).toBe(false);
    expect(scoreResponse(response(1, { keyOnDevice: true, offline: true })).confidence).toBe("low");
    expect(scoreResponse(response(1), [], ["r1"]).reason).toBe("duplicate_event");
    expect(scoreResponse(response(1, { responseMs: NaN })).scored).toBe(false);
  });
});

describe("mastery gates", () => {
  it("counts exact early-level thresholds", () => {
    for (const [count, correct, level] of [
      [3, 3, 0],
      [4, 1, 1],
      [6, 4, 1],
      [6, 5, 2],
    ] as const) {
      const rs = Array.from({ length: count }, (_, i) => response(i, { correct: i < correct }));
      expect(updateMastery(initialMasteryState("t"), event("e", rs)).state.level).toBe(level);
    }
  });
  it("requires normal evidence in every proficient gate", () => {
    const rs = Array.from({ length: 10 }, (_, i) => response(i, { correct: i < 8 }));
    expect(updateMastery(initialMasteryState("t"), event("e", rs)).state.level).toBe(3);
    expect(
      updateMastery(
        initialMasteryState("t"),
        event(
          "e",
          rs.map((r) => ({ ...r, setId: "one" })),
        ),
      ).state.level,
    ).toBe(2);
    expect(
      updateMastery(
        initialMasteryState("t"),
        event(
          "e",
          rs.map((r) => ({ ...r, learningDay: "2026-01-01" })),
        ),
      ).state.level,
    ).toBe(2);
    expect(
      updateMastery(
        initialMasteryState("t"),
        event(
          "e",
          rs.map((r) => ({ ...r, difficulty: "easy" as const })),
        ),
      ).state.level,
    ).toBe(2);
    expect(
      updateMastery(
        initialMasteryState("t"),
        event(
          "e",
          rs.map((r) => ({ ...r, offline: true, keyOnDevice: true })),
        ),
      ).state.level,
    ).toBe(2);
    const mixed = rs.map((r, i) => (i < 2 ? { ...r, offline: true, keyOnDevice: true } : r));
    expect(updateMastery(initialMasteryState("t"), event("e", mixed)).state.level).toBe(2);
  });
  it("allows normal assessment 8/10 to jump to proficient but excludes placement", () => {
    const rs = Array.from({ length: 10 }, (_, i) =>
      response(i, { correct: i < 8, setId: "one", learningDay: "2026-01-01" }),
    );
    expect(
      updateMastery(initialMasteryState("t"), event("a", rs, { kind: "assessment" })).state.level,
    ).toBe(3);
    expect(
      updateMastery(initialMasteryState("t"), event("a", rs.slice(0, 9), { kind: "assessment" }))
        .state.level,
    ).toBe(2);
    expect(
      updateMastery(
        initialMasteryState("t"),
        event(
          "a",
          rs.map((r) => ({ ...r, offline: true, keyOnDevice: true })),
          { kind: "assessment" },
        ),
      ).state.level,
    ).toBe(2);
    expect(
      updateMastery(initialMasteryState("t"), event("p", rs, { kind: "placement" })).state.level,
    ).toBe(0);
  });
  it("requires hard last five, two correct applications, and two sets", () => {
    expect(advanced().level).toBe(4);
    const base = Array.from({ length: 10 }, (_, i) => response(i));
    for (const extra of [
      Array.from({ length: 5 }, (_, i) =>
        response(10 + i, { difficulty: "hard", application: i < 2, setId: "one" }),
      ),
      Array.from({ length: 5 }, (_, i) =>
        response(10 + i, { difficulty: "hard", application: i === 0 }),
      ),
      Array.from({ length: 5 }, (_, i) =>
        response(10 + i, { difficulty: "hard", application: i < 2, correct: i < 3 }),
      ),
      Array.from({ length: 4 }, (_, i) =>
        response(10 + i, { difficulty: "hard", application: true }),
      ),
    ])
      expect(
        updateMastery(initialMasteryState("t"), event("e", [...base, ...extra])).state.level,
      ).toBe(3);
  });
  it("keeps evidence immutable, deduplicates events and never downgrades ordinary practice", () => {
    const state = advanced(),
      before = JSON.stringify(state);
    const e = event(
      "bad",
      Array.from({ length: 10 }, (_, i) => response(100 + i, { correct: false })),
    );
    const result = updateMastery(state, e);
    expect(result.state.level).toBe(4);
    expect(JSON.stringify(state)).toBe(before);
    expect(updateMastery(result.state, e).state).toEqual(result.state);
    const repeated = event("repeat", [response(0)]);
    expect(updateMastery(state, repeated).state.evidence).toEqual(state.evidence);
  });
  it("ignores unscored responses and duplicate response IDs across events", () => {
    const first = updateMastery(initialMasteryState("t"), event("one", [response(1)])).state;
    const next = updateMastery(
      first,
      event("two", [response(1, { itemId: "new" }), response(2, { hintShown: true })]),
    ).state;
    expect(next.evidence).toHaveLength(1);
  });
});

describe("retention", () => {
  function check(
    state: MasteryState,
    days: number,
    correct = 4,
    changes: Partial<MasteryEvent> = {},
    responseChanges: Partial<ScoringResponse> = {},
  ) {
    const at = state.enteredLevel4At! + days * DAY;
    return updateMastery(
      state,
      event(
        `ret${days}-${correct}`,
        Array.from({ length: 5 }, (_, i) =>
          response(500 + Math.floor(days * 10) + i, {
            answeredAt: at,
            correct: i < correct,
            ...responseChanges,
          }),
        ),
        { kind: "retention", occurredAt: at, unseen: true, mixed: true, ...changes },
      ),
    );
  }
  it("enforces 14 days, or 7 with exam strictly below 42 days", () => {
    const s = advanced(),
      at = s.enteredLevel4At!;
    expect(check(s, 14).state.level).toBe(5);
    expect(check(s, 14 - 1 / DAY).state.level).toBe(4);
    expect(check(s, 7, 4, { examAt: at + 7 * DAY + 42 * DAY - 1 }).state.level).toBe(5);
    expect(check(s, 7, 4, { examAt: at + 7 * DAY + 42 * DAY }).state.level).toBe(4);
    expect(check(s, 7 - 1 / DAY, 4, { examAt: at + 8 * DAY }).state.level).toBe(4);
  });
  it("validates unseen mixed normal five-item retention before promotions or drops", () => {
    const s = advanced();
    for (const changes of [{ unseen: false }, { mixed: false }])
      expect(check(s, 14, 2, changes).state.level).toBe(4);
    expect(check(s, 14, 2, {}, { offline: true, keyOnDevice: true }).state.level).toBe(4);
    expect(check(s, 14, 3).state.level).toBe(4);
    expect(check(s, 14, 2).state.level).toBe(3);
    expect(check(initialMasteryState("t"), 14, 2).state.level).toBe(0);
    const mastered = check(s, 14).state;
    const dropped = check(mastered, 28, 2).state;
    expect(dropped.level).toBe(4);
    expect(dropped.enteredLevel4At).toBe(s.enteredLevel4At! + 28 * DAY);
    expect(check(dropped, 1).state.level).toBe(4);
  });
});

it("rejects invalid events and malformed responses without creating evidence", () => {
  const initial = initialMasteryState("t");
  for (const e of [
    event("", []),
    event("nan", [], { occurredAt: NaN }),
    event("future", [response(1)], { occurredAt: 0 }),
    event("badtime", [response(1, { answeredAt: NaN })]),
  ]) {
    expect(updateMastery(initial, e)).toEqual({ state: initial, reason: "invalid_event" });
  }
  for (const changes of [
    { eventId: "" },
    { itemId: "" },
    { setId: "" },
    { learningDay: "bad" },
    { answeredAt: NaN },
  ]) {
    expect(scoreResponse(response(1, changes)).reason).toBe("invalid_response");
  }
  expect(updateMastery(initial, event("empty", [])).reason).toBe("no_scored_evidence");
});

it("resets the retention wait on re-entry to advanced, without undoing a drop in the same event", () => {
  const a = advanced(),
    at = a.enteredLevel4At! + 14 * DAY;
  const bad = event(
    "badret",
    Array.from({ length: 5 }, (_, i) => response(200 + i, { answeredAt: at, correct: i < 2 })),
    { kind: "retention", occurredAt: at, unseen: true, mixed: true },
  );
  const dropped = updateMastery(a, bad).state;
  expect(dropped.level).toBe(3);
  const back = updateMastery(
    dropped,
    event("back", [response(250, { answeredAt: at + DAY })]),
  ).state;
  expect(back.level).toBe(4);
  expect(back.enteredLevel4At).toBe(at + DAY);
  expect(back.firstReachedLevel2At).toBe(a.firstReachedLevel2At);
});

it("rejects retention with seen items, repeated responses, missing items, or elapsed exam", () => {
  const a = advanced(),
    at = a.enteredLevel4At! + 7 * DAY;
  const rs = Array.from({ length: 5 }, (_, i) => response(300 + i, { answeredAt: at }));
  for (const [responses, changes] of [
    [rs, { examAt: at }],
    [rs.slice(0, 4), { examAt: at + DAY }],
    [[...rs.slice(0, 4), rs[0]!], { examAt: at + DAY }],
    [rs.map((r, i) => (i === 0 ? { ...r, itemId: "i0" } : r)), { examAt: at + DAY }],
  ] as const) {
    expect(
      updateMastery(
        a,
        event("invalid", responses, {
          kind: "retention",
          occurredAt: at,
          unseen: true,
          mixed: true,
          ...changes,
        }),
      ).state.level,
    ).toBe(4);
  }
});

it("handles retention on mastered topics without promotion beyond five", () => {
  const a = advanced(),
    at = a.enteredLevel4At! + 14 * DAY;
  const rs = Array.from({ length: 5 }, (_, i) => response(400 + i, { answeredAt: at }));
  const m = updateMastery(
    a,
    event("pass", rs, { kind: "retention", occurredAt: at, unseen: true, mixed: true }),
  ).state;
  const again = updateMastery(
    m,
    event(
      "pass2",
      rs.map((r, i) => ({ ...r, itemId: `new${i}`, eventId: `new${i}`, answeredAt: at + DAY })),
      { kind: "retention", occurredAt: at + DAY, unseen: true, mixed: true },
    ),
  );
  expect(again.state.level).toBe(5);
  expect(again.reason).toBe("retention_unchanged");
});

it("validates calendars and preserves earliest due regardless of input order", () => {
  for (const date of ["bad", "2026-02-30", "2026-99-01"]) {
    expect(() => scheduleReviews({ topicId: "t", reachedLevel2Day: date })).toThrow(RangeError);
  }
  expect(scheduleReviews({ topicId: "t", reachedLevel2Day: "2028-02-27" }).reviews[0]?.dueDay).toBe(
    "2028-03-01",
  );
  expect(
    scheduleReviews({ topicId: "t", reachedLevel2Day: "2026-01-01", examDay: "2025-12-01" })
      .reviews,
  ).toEqual([]);
  expect(
    selectDueTopics(
      [
        { topicId: "t", dueDay: "2026-01-03" },
        { topicId: "t", dueDay: "2026-01-01" },
        { topicId: "t", dueDay: "2026-01-01" },
      ],
      "2026-01-03",
    ),
  ).toEqual([{ topicId: "t", dueDay: "2026-01-01" }]);
  expect(() => selectDueTopics([], "invalid")).toThrow(RangeError);
  expect(
    selectDueTopics(
      [
        { topicId: "a", dueDay: "2026-01-01" },
        { topicId: "b", dueDay: "2026-01-03" },
        { topicId: "c", dueDay: "2026-01-02" },
      ],
      "2026-01-03",
    ).map((r) => r.topicId),
  ).toEqual(["a", "c", "b"]);
});

describe("review calendar", () => {
  it("anchors offsets and compresses to exam minus three calendar days", () => {
    expect(
      scheduleReviews({ topicId: "t", reachedLevel2Day: "2026-01-01" }).reviews.map(
        (r) => r.dueDay,
      ),
    ).toEqual(["2026-01-04", "2026-01-11", "2026-01-31"]);
    expect(
      scheduleReviews({
        topicId: "t",
        reachedLevel2Day: "2026-01-01",
        examDay: "2026-01-19",
      }).reviews.map((r) => r.dueDay),
    ).toEqual(["2026-01-02", "2026-01-06", "2026-01-16"]);
    expect(
      scheduleReviews({ topicId: "t", reachedLevel2Day: "2026-01-01", examDay: "2026-01-05" })
        .reviews,
    ).toHaveLength(1);
    expect(
      scheduleReviews({ topicId: "t", reachedLevel2Day: "2026-01-01", examDay: "2026-01-04" })
        .status,
    ).toBe("no_future_slot");
  });
  it("preserves overdue, chooses earliest duplicate, and sorts deterministic max three", () => {
    const reviews = [
      { topicId: "z", dueDay: "2026-01-01" },
      { topicId: "a", dueDay: "2026-01-01" },
      { topicId: "z", dueDay: "2026-01-02" },
      { topicId: "b", dueDay: "2026-01-01" },
      { topicId: "c", dueDay: "2026-01-02" },
      { topicId: "f", dueDay: "2027-01-01" },
    ];
    expect(selectDueTopics(reviews, "2026-02-01").map((r) => r.topicId)).toEqual(["a", "b", "z"]);
  });
});

it("seeded property: ordinary practice never lowers mastery and never mutates input", () => {
  fc.assert(
    fc.property(fc.array(fc.boolean(), { maxLength: 40 }), (flags) => {
      let state = initialMasteryState("t");
      flags.forEach((correct, i) => {
        const before = JSON.stringify(state),
          level = state.level;
        const next = updateMastery(state, event(`e${i}`, [response(i, { correct })])).state;
        expect(next.level).toBeGreaterThanOrEqual(level);
        expect(JSON.stringify(state)).toBe(before);
        state = next;
      });
    }),
    { seed: 20261113, numRuns: 100 },
  );
});
