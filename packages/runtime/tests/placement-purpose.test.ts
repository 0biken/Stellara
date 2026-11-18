import { beforeEach, describe, expect, it } from "vitest";

import { startSet } from "../src/set-start.js";
import { ManualClock, sequentialIds, AUTHOR, REVIEWER } from "../src/testing/fixtures.js";
import { MemoryStore } from "../src/testing/memory-store.js";

import type { ChildRecord, RuntimeDeps } from "../src/ports.js";
import type { PublishedItem } from "@stellara/content-schema/server";

const P4_FRACTIONS = "00000000-0000-4000-8000-000400000001";
const P4_SHAPES = "00000000-0000-4000-8000-000400000002";
const CHILD_P4 = "00000000-0000-4000-8000-000000000040";

describe("placement item pool and purpose enforcement", () => {
  let store: MemoryStore;
  let deps: RuntimeDeps;

  beforeEach(() => {
    store = new MemoryStore();
    deps = {
      store,
      clock: new ManualClock(1700000000000),
      ids: sequentialIds(),
      rng: { next: () => 0.5 },
    };

    const child: ChildRecord = {
      id: CHILD_P4,
      timezone: "Africa/Lagos",
      exam_date: "2027-04-20",
      status: "active",
      term_id: "term-1",
      last_active_at: 1700000000000,
      year: "P4",
    };
    store.addChild(child);

    // Setup strands
    store.addStrand(P4_FRACTIONS, "p4-fractions-strand");
    store.addStrand(P4_SHAPES, "p4-shapes-strand");
  });

  it("practice sets select only items with purpose: practice, excluding placement items", async () => {
    // Add 10 practice items and 10 placement items to P4 Fractions
    const items: PublishedItem[] = [];
    for (let i = 0; i < 10; i++) {
      items.push({
        id: `00000000-0000-4000-8000-0000000100${i.toString().padStart(2, "0")}`,
        version: 1,
        topic_id: P4_FRACTIONS,
        type: "single_choice",
        stem: `Practice item ${i}`,
        stimulus_id: null,
        explanation: "Exp",
        difficulty: "standard",
        tags: [],
        purpose: "practice",
        curriculum_edition: "revised_2025",
        media: [],
        exposure_count: 0,
        provenance: "original",
        author_id: AUTHOR,
        reviewer_id: REVIEWER,
        answer_verified_at: "2026-11-01T00:00:00Z",
        status: "published",
        options: [{ id: "a", text: "A" }, { id: "b", text: "B" }],
        answer: { option_id: "a" },
      });
      items.push({
        id: `00000000-0000-4000-8000-0000000200${i.toString().padStart(2, "0")}`,
        version: 1,
        topic_id: P4_FRACTIONS,
        type: "single_choice",
        stem: `Placement item ${i}`,
        stimulus_id: null,
        explanation: "Exp",
        difficulty: "standard",
        tags: [],
        purpose: "placement",
        curriculum_edition: "revised_2025",
        media: [],
        exposure_count: 0,
        provenance: "original",
        author_id: AUTHOR,
        reviewer_id: REVIEWER,
        answer_verified_at: "2026-11-01T00:00:00Z",
        status: "published",
        options: [{ id: "a", text: "A" }, { id: "b", text: "B" }],
        answer: { option_id: "a" },
      });
    }
    store.addItems(items);

    const practiceSet = await startSet(deps, { child_id: CHILD_P4 }, {
      kind: "practice",
      topic_ids: [P4_FRACTIONS],
    });

    expect(practiceSet.items).toHaveLength(10);
    // Every chosen item must have purpose === "practice"
    for (const item of practiceSet.items) {
      expect(item.purpose).toBe("practice");
    }
  });

  it("placement set-start selects 20 dedicated placement items balanced across the year strands", async () => {
    // Add 10 placement items to P4 Fractions and 10 to P4 Shapes
    const items: PublishedItem[] = [];
    for (let i = 0; i < 10; i++) {
      items.push({
        id: `00000000-0000-4000-8000-0000000300${i.toString().padStart(2, "0")}`,
        version: 1,
        topic_id: P4_FRACTIONS,
        type: "single_choice",
        stem: `P4 Fraction Placement ${i}`,
        stimulus_id: null,
        explanation: "Exp",
        difficulty: "standard",
        tags: [],
        purpose: "placement",
        curriculum_edition: "revised_2025",
        media: [],
        exposure_count: 0,
        provenance: "original",
        author_id: AUTHOR,
        reviewer_id: REVIEWER,
        answer_verified_at: "2026-11-01T00:00:00Z",
        status: "published",
        options: [{ id: "a", text: "A" }, { id: "b", text: "B" }],
        answer: { option_id: "a" },
      });
      items.push({
        id: `00000000-0000-4000-8000-0000000400${i.toString().padStart(2, "0")}`,
        version: 1,
        topic_id: P4_SHAPES,
        type: "single_choice",
        stem: `P4 Shape Placement ${i}`,
        stimulus_id: null,
        explanation: "Exp",
        difficulty: "standard",
        tags: [],
        purpose: "placement",
        curriculum_edition: "revised_2025",
        media: [],
        exposure_count: 0,
        provenance: "original",
        author_id: AUTHOR,
        reviewer_id: REVIEWER,
        answer_verified_at: "2026-11-01T00:00:00Z",
        status: "published",
        options: [{ id: "a", text: "A" }, { id: "b", text: "B" }],
        answer: { option_id: "a" },
      });
    }
    store.addItems(items);

    const placementSet = await startSet(deps, { child_id: CHILD_P4 }, {
      kind: "placement",
      topic_ids: [], // server-selected for placement!
    });

    expect(placementSet.items).toHaveLength(20);
    const fractionItems = placementSet.items.filter((i) => i.topic_id === P4_FRACTIONS);
    const shapeItems = placementSet.items.filter((i) => i.topic_id === P4_SHAPES);
    expect(fractionItems).toHaveLength(10);
    expect(shapeItems).toHaveLength(10);
    for (const item of placementSet.items) {
      expect(item.purpose).toBe("placement");
    }
  });

  it("placement set-start selects year-appropriate items for P5 and P6 children", async () => {
    const P5_FRACTIONS = "00000000-0000-4000-8000-000100000002";
    const P5_ANGLES = "00000000-0000-4000-8000-000500000002";
    const P6_FRACTIONS = "00000000-0000-4000-8000-000600000001";
    const P6_AREA = "00000000-0000-4000-8000-000600000002";

    store.addStrand(P5_FRACTIONS, "p5-fractions-strand");
    store.addStrand(P5_ANGLES, "p5-angles-strand");
    store.addStrand(P6_FRACTIONS, "p6-fractions-strand");
    store.addStrand(P6_AREA, "p6-area-strand");

    const { SAMPLE_PLACEMENT_ITEMS } = await import("../src/testing/sample-content.js");
    store.addItems(SAMPLE_PLACEMENT_ITEMS);

    const childP5: ChildRecord = {
      id: "00000000-0000-4000-8000-000000000050",
      timezone: "Africa/Lagos",
      exam_date: "2026-04-20",
      status: "active",
      term_id: "term-1",
      last_active_at: 1700000000000,
      year: "P5",
    };
    store.addChild(childP5);

    const childP6: ChildRecord = {
      id: "00000000-0000-4000-8000-000000000060",
      timezone: "Africa/Lagos",
      exam_date: "2025-04-20",
      status: "active",
      term_id: "term-1",
      last_active_at: 1700000000000,
      year: "P6",
    };
    store.addChild(childP6);

    const setP5 = await startSet(deps, { child_id: childP5.id }, {
      kind: "placement",
      topic_ids: [],
    });
    expect(setP5.items).toHaveLength(20);
    expect(setP5.items.filter((i) => i.topic_id === P5_FRACTIONS)).toHaveLength(10);
    expect(setP5.items.filter((i) => i.topic_id === P5_ANGLES)).toHaveLength(10);

    const setP6 = await startSet(deps, { child_id: childP6.id }, {
      kind: "placement",
      topic_ids: [],
    });
    expect(setP6.items).toHaveLength(20);
    expect(setP6.items.filter((i) => i.topic_id === P6_FRACTIONS)).toHaveLength(10);
    expect(setP6.items.filter((i) => i.topic_id === P6_AREA)).toHaveLength(10);
  });
});
