import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  clearChildSession,
  getValidChildSession,
  readChildSession,
  saveChildSession,
} from "../lib/child-session";
import { createSupabaseFamilyApi } from "../lib/family/supabase";
import { createSupabaseLearningApi } from "../lib/learning/supabase";

import type { SupabaseClient } from "@supabase/supabase-js";

const child = {
  id: "10000000-0000-4000-8000-000000000001",
  first_name: "Ada",
  year: "P5" as const,
  avatar_key: "moon" as const,
  exam_date: null,
};
const session = () => ({
  token: "child-token",
  expires_at: new Date(Date.now() + 7200000).toISOString(),
  refresh_until: new Date(Date.now() + 2592000000).toISOString(),
  refresh_token: "a".repeat(64),
  device_id: crypto.randomUUID(),
  child: { id: child.id, first_name: child.first_name },
});
beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
});
describe("live family contracts", () => {
  it("sends the consent declarations required by the backend", async () => {
    const invoke = vi
      .fn()
      .mockResolvedValueOnce({ data: { consent_id: "consent" }, error: null })
      .mockResolvedValueOnce({ data: { status: "verified" }, error: null });
    const api = createSupabaseFamilyApi({ functions: { invoke } } as unknown as SupabaseClient);
    await api.giveConsent({
      core_learning: true,
      progress_messages: false,
      product_research: false,
    });
    expect(invoke.mock.calls[0]![1].body.declaration).toEqual({ is_adult: true });
    expect(invoke.mock.calls[1]![1].body.declaration).toEqual({
      is_adult: true,
      is_parent_or_guardian: true,
    });
  });
  it("maps year and nullable exam date at the API boundary", async () => {
    const invoke = vi.fn().mockResolvedValue({ data: { child_id: child.id }, error: null });
    const api = createSupabaseFamilyApi({ functions: { invoke } } as unknown as SupabaseClient);
    vi.spyOn(api, "getConsent").mockResolvedValue({
      id: "consent",
      notice_version: "v0",
      method: "declaration_v0",
      purposes: { core_learning: true, progress_messages: false, product_research: false },
      given_at: "now",
    });
    await api.addChild({ ...child, pin: ["sun", "kite", "fish", "moon"] });
    expect(invoke.mock.calls[0]![1].body.year).toBe(5);
    expect(invoke.mock.calls[0]![1].body).not.toHaveProperty("exam_date");
  });
  it("sends a stable tab device ID and stores the full rotating session", async () => {
    const issued = session();
    const invoke = vi.fn().mockResolvedValue({ data: issued, error: null });
    const api = createSupabaseFamilyApi({ functions: { invoke } } as unknown as SupabaseClient);
    await api.signInChild(child, ["sun", "kite", "fish", "moon"]);
    const device = invoke.mock.calls[0]![1].body.device_id;
    expect(device).toMatch(/^[0-9a-f-]{36}$/);
    expect(readChildSession()).toMatchObject({
      token: issued.token,
      refresh_token: issued.refresh_token,
      device_id: device,
      child: { id: child.id },
    });
    await api.signInChild(child, ["sun", "kite", "fish", "moon"]);
    expect(invoke.mock.calls[1]![1].body.device_id).toBe(device);
  });
});
describe("child session rotation", () => {
  it("deduplicates simultaneous refresh requests and saves the replacement", async () => {
    const old = session();
    old.expires_at = new Date(0).toISOString();
    saveChildSession(old);
    const replacement = { ...session(), refresh_token: "b".repeat(64) };
    const fetch = vi.fn(async () => Response.json(replacement));
    const options = { url: "https://local.test", publishableKey: "public", fetch };
    const [a, b] = await Promise.all([
      getValidChildSession(options),
      getValidChildSession(options),
    ]);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(a.token).toBe(b.token);
    expect(readChildSession()?.refresh_token).toBe(replacement.refresh_token);
  });
  it("does not resurrect credentials after signing out during refresh", async () => {
    const old = session();
    old.expires_at = new Date(0).toISOString();
    saveChildSession(old);
    let resolve!: (r: Response) => void;
    const pending = getValidChildSession({
      url: "https://local.test",
      publishableKey: "public",
      fetch: () =>
        new Promise((r) => {
          resolve = r;
        }),
    });
    clearChildSession();
    resolve(Response.json(session()));
    await expect(pending).rejects.toMatchObject({ code: "NO_CHILD_SESSION" });
    expect(readChildSession()).toBeNull();
  });
  it("rejects malformed storage and clears a rejected refresh", async () => {
    sessionStorage.setItem("stellara.childSession", '{"token":"stale"}');
    expect(readChildSession()).toBeNull();
    const old = session();
    old.expires_at = new Date(0).toISOString();
    saveChildSession(old);
    await expect(
      getValidChildSession({
        url: "https://local.test",
        publishableKey: "public",
        fetch: async () => new Response(null, { status: 401 }),
      }),
    ).rejects.toMatchObject({ code: "NO_CHILD_SESSION" });
    expect(readChildSession()).toBeNull();
  });
});
describe("live sky and learning", () => {
  it("reads the current child, published topics and mastery and hides unavailable content", async () => {
    saveChildSession(session());
    const fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/children?")) return Response.json([{ ...child, year: 5 }]);
      if (url.includes("/topics?"))
        return Response.json([{ id: "topic", title: "Fractions", strand_id: "number", sort: 1 }]);
      if (url.includes("/items?"))
        return Response.json(
          Array.from({ length: 10 }, (_, n) => ({ id: String(n), topic_id: "topic" })),
        );
      if (url.includes("/mastery_states?")) return Response.json([{ topic_id: "topic", level: 2 }]);
      if (url.includes("/sets?")) return Response.json([{ kind: "practice", finished_at: "now" }]);
      throw new Error(url);
    });
    const api = createSupabaseLearningApi({
      url: "https://local.test",
      publishableKey: "public",
      fetch,
    });
    expect(await api.getSky()).toMatchObject({
      topics: [{ id: "topic", level: "developing" }],
      today: { topic_id: "topic", questions: 10 },
      placement_available: false,
      lessons_available: false,
      first_visit: false,
    });
    for (const [, init] of fetch.mock.calls as unknown as [string, RequestInit][])
      expect((init.headers as Record<string, string>).authorization).toBe("Bearer child-token");
  });
  it("restores the requested set kind missing from the server envelope", async () => {
    const api = createSupabaseLearningApi({
      url: "https://local.test",
      publishableKey: "public",
      session: () => ({ token: "jwt", child }),
      fetch: async () => Response.json({ set_id: "set", items: [], rules_version: "v1" }),
    });
    expect(await api.startSet({ kind: "practice", topic_ids: [] })).toMatchObject({
      kind: "practice",
      set_id: "set",
    });
  });
});
