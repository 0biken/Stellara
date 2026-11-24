import { describe, expect, it } from "vitest";

import { canAccessPath, navigationFor } from "../lib/admin/permissions";

describe("staff route access", () => {
  it("keeps operations and content permissions separate", () => {
    expect(canAccessPath("admin", "/admin/content/item")).toBe(false);
    expect(canAccessPath("author", "/admin/support")).toBe(false);
    expect(canAccessPath("reviewer", "/admin/reviews")).toBe(true);
    expect(canAccessPath("author", "/admin/publishing")).toBe(false);
    expect(canAccessPath("content_lead", "/admin/publishing")).toBe(true);
    expect(canAccessPath("super_admin", "/admin/team")).toBe(true);
    expect(canAccessPath("admin", "/admin/team")).toBe(false);
  });
  it("denies unknown direct paths and never infers a guardian is staff", () => {
    expect(canAccessPath("guardian", "/admin")).toBe(false);
    expect(canAccessPath("super_admin", "/admin/unknown")).toBe(false);
    expect(canAccessPath("author", "/admin/contentious")).toBe(false);
  });
  it("only includes permitted links in navigation", () => {
    expect(navigationFor("author").map((entry) => entry.label)).toContain("Content library");
    expect(navigationFor("author").map((entry) => entry.label)).not.toContain("Staff team");
    expect(navigationFor("admin").map((entry) => entry.label)).not.toContain("Content library");
  });
});
