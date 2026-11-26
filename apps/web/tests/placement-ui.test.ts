import { beforeEach, describe, expect, it } from "vitest";

import { createPreviewLearningApi } from "../lib/learning/preview";
import { KEYS } from "../lib/learning/preview-content";
import { loadDraft, saveDraft } from "../lib/learning/session";

import type { StartedSet, SubmittedAnswer } from "../lib/learning/types";

describe("live placement flow across P4-P6", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  for (const year of ["P4", "P5", "P6"] as const) {
    it(`runs placement for ${year} with year-appropriate strands and items, then restores completed results`, async () => {
      const api = createPreviewLearningApi({ latencyMs: 0 });
      const child = await api.startPreviewChild!({ year, first_name: `Child_${year}` });
      expect(child.year).toBe(year);

      // 1. Placement config
      const config = await api.placementConfig();
      expect(config.year).toBe(year);
      expect(config.available).toBe(true);
      expect(config.completed).toBe(false);
      expect(config.total_questions).toBe(20);
      expect(config.strands).toHaveLength(2);

      // 2. Start placement set
      const started = await api.startSet({ kind: "placement", topic_ids: [] });
      expect(started.items).toHaveLength(20);
      // All items have purpose: "placement"
      for (const item of started.items) {
        expect(item.purpose).toBe("placement");
      }

      // 3. Draft persistence: simulate answering half of the questions and reloading
      const partialAnswers = started.items.slice(0, 10).map((item, i) => ({
        client_id: `cid-${year}-${i}`,
        set_id: started.set_id,
        item_id: item.id,
        item_version: item.version,
        response: { choice: KEYS.get(item.id)!.correct },
        hint_shown: false,
        response_ms: 2500,
        recorded_at: new Date().toISOString(),
        key_on_device: false,
      }));

      saveDraft(child.id, "placement", {
        set: started,
        index: 10,
        pending: partialAnswers,
      });

      // Reload draft
      const loaded = loadDraft<{ set: StartedSet; index: number; pending: SubmittedAnswer[] }>(
        child.id,
        "placement",
      );
      expect(loaded).not.toBeNull();
      expect(loaded!.index).toBe(10);
      expect(loaded!.pending).toHaveLength(10);
      expect(loaded!.pending[0]?.client_id).toBe(`cid-${year}-0`);

      // 4. Submit all 20 answers
      const remainingAnswers = started.items.slice(10).map((item, i) => ({
        client_id: `cid-${year}-${10 + i}`,
        set_id: started.set_id,
        item_id: item.id,
        item_version: item.version,
        response: { choice: KEYS.get(item.id)!.correct },
        hint_shown: false,
        response_ms: 2500,
        recorded_at: new Date().toISOString(),
        key_on_device: false,
      }));

      const outcome = await api.submit({
        responses: [...partialAnswers, ...remainingAnswers],
        device_clock: new Date().toISOString(),
      });

      expect(outcome.placement).toBeDefined();
      expect(outcome.placement).toHaveLength(2);
      expect(outcome.placement?.every((p) => p.label === "looks_secure_so_far")).toBe(true);

      // Sky reflects placement is done
      const sky = await api.getSky();
      expect(sky.placement_done).toBe(true);

      // 5. Config reflects placement completed
      const afterConfig = await api.placementConfig();
      expect(afterConfig.available).toBe(false);
      expect(afterConfig.completed).toBe(true);
      expect(afterConfig.completed_set_id).toBe(started.set_id);

      // 6. Owned-set read restores stored strand results without per-question marks
      const owned = await api.getOwnedSet(started.set_id);
      expect(owned.completed).toBe(true);
      expect(owned.placement).toEqual(outcome.placement);
      for (const item of owned.items) {
        expect("answer" in item).toBe(false);
      }
    });
  }
});
