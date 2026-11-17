import { localDatabase } from "./local-db.js";
import { afterAll, describe, it } from "vitest";
import { storeContractCases } from "@stellara/runtime/testing";
import { createHarness } from "./harness.js";

const sql = localDatabase();
afterAll(() => sql.end());
describe("PgStore contract", () => {
  for (const test of storeContractCases)
    it(test.name, async () => {
      const h = createHarness(sql);
      await h.reset();
      await test.run(h);
    });
});
