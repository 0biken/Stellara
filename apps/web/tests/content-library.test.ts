import { describe, expect, it } from "vitest";

import { defaultFilters, filterContent, readFilters, writeFilters } from "../lib/admin/content";
import { demoContentApi } from "../lib/admin/content-demo";

describe("content library", () => {
  it("paginates 25 records and uses stable IDs", async () => {
    const first = await demoContentApi.listContent(defaultFilters);
    const second = await demoContentApi.listContent({ ...defaultFilters, page: 2 });
    expect(first.rows).toHaveLength(25);
    expect(first.total).toBe(54);
    expect(second.rows).toHaveLength(25);
    expect(first.rows.some((row) => second.rows.some((other) => other.id === row.id))).toBe(false);
    expect((await demoContentApi.getVersion(first.rows[0]!.id))?.id).toBe(first.rows[0]!.id);
  });
  it("combines filters and restores them through URL state", async () => {
    const filters = {
      ...defaultFilters,
      query: "market",
      year: "P6",
      subject: "Mathematics",
      status: "draft",
      owner: "demo-author",
    };
    const restored = readFilters(new URLSearchParams(writeFilters(filters)));
    expect(restored).toEqual(filters);
    const result = await demoContentApi.listContent(restored);
    expect(result.total).toBeGreaterThan(0);
    expect(
      result.rows.every(
        (row) =>
          row.status === "draft" && row.year === "P6" && row.title.toLowerCase().includes("market"),
      ),
    ).toBe(true);
  });
  it("handles no matches, missing IDs, invalid pages and cancellation", async () => {
    const result = await demoContentApi.listContent({
      ...defaultFilters,
      query: "unmatched title",
      page: 500,
    });
    expect(result).toMatchObject({ total: 0, rows: [], page: 1, pages: 1 });
    expect(await demoContentApi.getVersion("missing")).toBeNull();
    expect(readFilters(new URLSearchParams("page=NaN")).page).toBe(1);
    const controller = new AbortController();
    controller.abort();
    await expect(demoContentApi.listContent(defaultFilters, controller.signal)).rejects.toThrow(
      "Cancelled",
    );
    expect(filterContent([], defaultFilters).rows).toEqual([]);
  });
});
