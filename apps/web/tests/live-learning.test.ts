import { expect, it } from "vitest";

import { createSupabaseLearningApi } from "../lib/learning/supabase";

it("routes the live sky request to the authorized child endpoint", async () => {
  const api = createSupabaseLearningApi({
    url: "https://example.test",
    publishableKey: "publishable",
    session: () => ({ token: "child-token", child: { id: "child", first_name: "Tolu" } }),
    fetch: async (url, init) => {
      expect(url).toBe("https://example.test/functions/v1/child-sky");
      expect(new Headers(init?.headers).get("authorization")).toBe("Bearer child-token");
      return Response.json({ topics: [], links: [], today: null });
    },
  });

  expect(await api.getSky()).toMatchObject({ topics: [], today: null });
});
