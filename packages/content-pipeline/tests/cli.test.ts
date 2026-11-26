import { describe, expect, it } from "vitest";

import { main } from "../src/cli.js";

describe("cli", () => {
  it("cli returns 2 for a missing --author-id", async () => {
    expect(await main(["draft", "--brief", "x.json"])).toBe(2);
  });
  it("cli returns 2 for an unknown command", async () => {
    expect(await main(["publish"])).toBe(2);
  });
});

describe("cli review commands", () => {
  it("returns 2 when review-sheet has no folder", async () => {
    expect(await main(["review-sheet"])).toBe(2);
  });
});
