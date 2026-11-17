import { localDatabase } from "./local-db.js";
import { afterAll, describe, expect, it } from "vitest";
import { child, singleChoiceItem, storeContractCases, uuidFrom } from "@stellara/runtime/testing";
import { initialMasteryState } from "@stellara/rules";
import { createHarness } from "./harness.js";

const sql = localDatabase();
afterAll(() => sql.end());
describe("PgStore contract", () => {
  it("refreshes the mastery timestamp on updates", async () => {
    const h = createHarness(sql);
    await h.reset();
    const childId = uuidFrom(1, 1),
      topicId = uuidFrom(2, 1);
    await h.seedChild(child(childId));
    await h.seedItems([singleChoiceItem(uuidFrom(3, 1), topicId)]);
    const initial = initialMasteryState(topicId);
    await h.store.putMastery(childId, initial);
    await sql`update public.mastery_states set updated_at='2000-01-01T00:00:00Z' where child_id=${childId}`;
    const before = Date.now();
    await h.store.putMastery(childId, { ...initial, level: 1 });
    const row = (
      await sql`select updated_at,level from public.mastery_states where child_id=${childId}`
    )[0]!;
    expect(new Date(row.updated_at).getTime()).toBeGreaterThanOrEqual(before);
    expect(row.level).toBe(1);
  });
  for (const test of storeContractCases)
    it(test.name, async () => {
      const h = createHarness(sql);
      await h.reset();
      await test.run(h);
    });
});
