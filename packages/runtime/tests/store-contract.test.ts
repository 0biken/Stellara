import { describe, it } from "vitest";

import { MemoryStore } from "../src/testing/memory-store.js";
import { storeContractCases } from "../src/testing/store-contract.js";

describe("MemoryStore contract", () => {
  for (const test of storeContractCases)
    it(test.name, async () => {
      const store = new MemoryStore();
      await test.run({
        store,
        reset: async () => {},
        seedChild: async (c) => {
          store.addChild(c);
        },
        seedItems: async (items, strands = {}) => {
          store.addItems(items);
          for (const [t, s] of Object.entries(strands)) store.addStrand(t, s);
        },
        seedOutage: async (o) => {
          store.addOutage(o);
        },
      });
    });
});
