import { beforeEach, describe, expect, it } from "vitest";

import { RuntimeError } from "../src/contracts.js";
import { getPlacementConfig, getOwnedSet } from "../src/placement.js";
import { submitResponses } from "../src/responses-submit.js";
import { startSet } from "../src/set-start.js";
import { ManualClock, sequentialIds, AUTHOR, REVIEWER } from "../src/testing/fixtures.js";
import { MemoryStore } from "../src/testing/memory-store.js";

import type { ChildRecord, RuntimeDeps } from "../src/ports.js";
import type { PublishedItem } from "@stellara/content-schema/server";

const P4_FRACTIONS = "00000000-0000-4000-8000-000400000001";
const P4_SHAPES = "00000000-0000-4000-8000-000400000002";
const CHILD_P4 = "00000000-0000-4000-8000-000000000040";
const OTHER_CHILD = "00000000-0000-4000-8000-000000000099";

describe("placement configuration and owned-set read endpoints", () => {
  let store: MemoryStore;
  let deps: RuntimeDeps;
  const T0 = 1700000000000;

  beforeEach(() => {
    store = new MemoryStore();
    deps = {
      store,
      clock: new ManualClock(T0),
      ids: sequentialIds(),
      rng: { next: () => 0.5 },
    };

    const child: ChildRecord = {
      id: CHILD_P4,
      timezone: "Africa/Lagos",
      exam_date: "2027-04-20",
      status: "active",
      term_id: "term-1",
      last_active_at: T0,
      year: "P4",
    };
    store.addChild(child);

    store.addStrand(P4_FRACTIONS, "p4-fractions-strand");
    store.addStrand(P4_SHAPES, "p4-shapes-strand");
  });

  it("getPlacementConfig returns year-appropriate strands and total questions", async () => {
    const config = await getPlacementConfig(deps, { child_id: CHILD_P4 });
    expect(config.year).toBe("P4");
    expect(config.total_questions).toBe(20);
    expect(config.available).toBe(true);
    expect(config.completed).toBe(false);
    expect(config.strands).toEqual([
      { id: "p4-fractions-strand", name: "Fractions and Parts" },
      { id: "p4-shapes-strand", name: "2D and 3D Shapes" },
    ]);
  });

  it("getPlacementConfig rejects inactive child or unknown child", async () => {
    await expect(getPlacementConfig(deps, { child_id: "non-existent" })).rejects.toThrow(
      RuntimeError,
    );

    const inactiveChild: ChildRecord = {
      id: "inactive-child",
      timezone: "Africa/Lagos",
      exam_date: null,
      status: "paused",
      term_id: "term-1",
      last_active_at: T0,
      year: "P4",
    };
    store.addChild(inactiveChild);
    await expect(getPlacementConfig(deps, { child_id: "inactive-child" })).rejects.toThrow(
      RuntimeError,
    );
  });

  it("getOwnedSet rejects unknown set or set owned by another child", async () => {
    await expect(getOwnedSet(deps, { child_id: CHILD_P4 }, "unknown-set")).rejects.toThrow(
      /This set was not found/,
    );

    const otherSet = {
      id: "set-for-other",
      child_id: OTHER_CHILD,
      kind: "placement" as const,
      topic_ids: [P4_FRACTIONS],
      review_topic_ids: [],
      assignment_id: null,
      items: [],
      started_at: T0,
      finished_at: null,
      placement: null,
      rules_version: "2026-03-31",
    };
    await store.insertSet(otherSet);

    await expect(getOwnedSet(deps, { child_id: CHILD_P4 }, "set-for-other")).rejects.toThrow(
      /This set belongs to someone else/,
    );
  });

  it("reopening completed placement returns stored strand-level results without per-question marks", async () => {
    // Populate items for placement
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
        options: [
          { id: "a", text: "A" },
          { id: "b", text: "B" },
        ],
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
        options: [
          { id: "a", text: "A" },
          { id: "b", text: "B" },
        ],
        answer: { option_id: "a" },
      });
    }
    store.addItems(items);

    const started = await startSet(
      deps,
      { child_id: CHILD_P4 },
      {
        kind: "placement",
        topic_ids: [],
      },
    );

    // Reopen incomplete set
    const openSet = await getOwnedSet(deps, { child_id: CHILD_P4 }, started.set_id);
    expect(openSet.completed).toBe(false);
    expect(openSet.placement).toBeNull();
    expect(openSet.items).toHaveLength(20);

    // Answer all 20 questions
    const responses = started.items.map((item, idx) => ({
      client_id: `00000000-0000-4000-8000-00000000c0${idx.toString().padStart(2, "0")}`,
      set_id: started.set_id,
      item_id: item.id,
      item_version: item.version,
      response: { choice: "a" },
      hint_shown: false,
      response_ms: 3000,
      recorded_at: "2026-11-18T00:00:00.000Z",
      key_on_device: false,
    }));

    await submitResponses(
      deps,
      { child_id: CHILD_P4 },
      {
        responses,
        device_clock: "2026-11-18T00:00:00.000Z",
      },
    );

    // Now placement is completed
    const closedSet = await getOwnedSet(deps, { child_id: CHILD_P4 }, started.set_id);
    expect(closedSet.completed).toBe(true);
    expect(closedSet.finished_at).not.toBeNull();
    expect(closedSet.placement).toHaveLength(2);
    expect(closedSet.placement?.every((p) => p.label === "looks_secure_so_far")).toBe(true);
    // Crucially: no per-question marks in items
    for (const item of closedSet.items) {
      expect("answer" in item).toBe(false);
    }

    // Config now shows placement completed and points to the completed set
    const updatedConfig = await getPlacementConfig(deps, { child_id: CHILD_P4 });
    expect(updatedConfig.available).toBe(false);
    expect(updatedConfig.completed).toBe(true);
    expect(updatedConfig.completed_set_id).toBe(started.set_id);
  });

  it("handles active in-progress placement set and default year fallback", async () => {
    const childP5: ChildRecord = {
      id: "child-default-year",
      timezone: "Africa/Lagos",
      exam_date: null,
      status: "active",
      term_id: "term-1",
      last_active_at: T0,
    };
    store.addChild(childP5);

    const activeSet = {
      id: "set-active-p5",
      child_id: "child-default-year",
      kind: "placement" as const,
      topic_ids: [],
      review_topic_ids: [],
      assignment_id: null,
      items: [],
      started_at: T0,
      finished_at: null,
      placement: null,
      rules_version: "2026-03-31",
    };
    await store.insertSet(activeSet);

    const config = await getPlacementConfig(deps, { child_id: "child-default-year" });
    expect(config.year).toBe("P5");
    expect(config.available).toBe(true);
    expect(config.completed).toBe(false);
    expect(config.active_set_id).toBe("set-active-p5");
  });

  it("getOwnedSet handles inactive child and missing items", async () => {
    await expect(getOwnedSet(deps, { child_id: "non-existent" }, "any")).rejects.toThrow(
      RuntimeError,
    );

    const inactiveChild: ChildRecord = {
      id: "inactive-child-2",
      timezone: "Africa/Lagos",
      exam_date: null,
      status: "paused",
      term_id: "term-1",
      last_active_at: T0,
      year: "P4",
    };
    store.addChild(inactiveChild);
    await expect(getOwnedSet(deps, { child_id: "inactive-child-2" }, "any")).rejects.toThrow(
      RuntimeError,
    );

    const brokenSet = {
      id: "broken-set",
      child_id: CHILD_P4,
      kind: "practice" as const,
      topic_ids: [P4_FRACTIONS],
      review_topic_ids: [],
      assignment_id: null,
      items: [{ item_id: "missing-item-id", version: 1, topic_id: P4_FRACTIONS }],
      started_at: T0,
      finished_at: null,
      placement: null,
      rules_version: "2026-03-31",
    };
    await store.insertSet(brokenSet);

    await expect(getOwnedSet(deps, { child_id: CHILD_P4 }, "broken-set")).rejects.toThrow(
      /There are not enough questions ready for this yet/,
    );
  });
});
