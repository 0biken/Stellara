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
