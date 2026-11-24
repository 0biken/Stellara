import { describe, expect, it, vi } from "vitest";

import { createAuthAdapter, defaultNext, safeNext } from "../lib/auth";
import { createPreviewAdapter, previewSession, previewStorageKey } from "../lib/auth/preview";

describe("safeNext", () => {
  it("keeps family portal paths", () => {
    expect(safeNext("/family/")).toBe("/family/");
    expect(safeNext("/family")).toBe("/family");
    expect(safeNext("/family/child/1?x=1")).toBe("/family/child/1");
  });
  it("allows staff destinations without accepting lookalike or external routes", () => {
    expect(safeNext("/admin/")).toBe("/admin/");
    expect(safeNext("/admin/content/")).toBe("/admin/content/");
    expect(safeNext("/administrator/")).toBe(defaultNext);
    expect(safeNext("https://evil.example/admin/")).toBe(defaultNext);
  });

  it.each([
    null,
    "",
    "https://evil.example/family/",
    "//evil.example/family/",
    "/\\evil.example",
    "javascript:alert(1)",
    "/familyx",
    "/ops/",
    "/sign-in/",
  ])("falls back to the parent home for %s", (value) => {
    expect(safeNext(value)).toBe(defaultNext);
  });
});

describe("createAuthAdapter", () => {
  it("uses preview mode without Supabase settings", () => {
    expect(createAuthAdapter({}).mode).toBe("preview");
    expect(createAuthAdapter({ url: "https://x.supabase.co" }).mode).toBe("preview");
  });

  it("uses Supabase when both settings are present", () => {
    const adapter = createAuthAdapter({
      url: "https://example.supabase.co",
      publishableKey: "sb_publishable_test",
    });
    expect(adapter.mode).toBe("supabase");
  });
});

describe("preview adapter", () => {
  it("signs in, notifies, persists and signs out", async () => {
    window.localStorage.clear();
    const adapter = createPreviewAdapter(window.localStorage);
    const listener = vi.fn();
    adapter.onChange(listener);

    expect(await adapter.getSession()).toBeNull();
    const result = await adapter.signInWithGoogle({ next: "/family/" });
    expect(result).toEqual({ status: "signed-in", session: previewSession });
    expect(listener).toHaveBeenLastCalledWith(previewSession);
    expect(window.localStorage.getItem(previewStorageKey)).not.toBeNull();
    expect(await createPreviewAdapter(window.localStorage).getSession()).toEqual(previewSession);

    await adapter.signOut();
    expect(listener).toHaveBeenLastCalledWith(null);
    expect(await adapter.getSession()).toBeNull();
  });

  it("reports an email as sent without signing in", async () => {
    window.localStorage.clear();
    const adapter = createPreviewAdapter(window.localStorage);
    expect(await adapter.signInWithEmail({ email: "a@b.co", next: "/family/" })).toEqual({
      status: "email-sent",
    });
    expect(await adapter.getSession()).toBeNull();
  });

  it("ignores corrupt stored sessions", async () => {
    window.localStorage.setItem(previewStorageKey, "{not json");
    expect(await createPreviewAdapter(window.localStorage).getSession()).toBeNull();
  });
});
