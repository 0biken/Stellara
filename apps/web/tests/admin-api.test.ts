import { FunctionsHttpError, type SupabaseClient } from "@supabase/supabase-js";
import { expect, it, vi } from "vitest";

import { createLiveAdminApi } from "../lib/admin/api";

function clientWith(code: string) {
  return {
    functions: {
      invoke: vi.fn().mockResolvedValue({
        data: null,
        error: new FunctionsHttpError(Response.json({ error: { code } }, { status: 403 })),
      }),
    },
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { user: { id: "guardian", user_metadata: { role: "super_admin" } } } },
        error: null,
      }),
    },
  } as unknown as SupabaseClient;
}
it("preserves MFA and forbidden errors without trusting user metadata", async () => {
  await expect(createLiveAdminApi(clientWith("MFA_REQUIRED")).getSession()).rejects.toMatchObject({
    code: "MFA_REQUIRED",
  });
  await expect(createLiveAdminApi(clientWith("FORBIDDEN")).getSession()).rejects.toMatchObject({
    code: "FORBIDDEN",
  });
});
it("maps support requests to the existing endpoint contract", async () => {
  const client = clientWith("FORBIDDEN");
  const invoke = vi.mocked(client.functions.invoke);
  invoke.mockResolvedValue({ data: { child: null, requests: [] }, error: null });
  await createLiveAdminApi(client).lookupChild({ childId: "child-id", reason: "Parent support" });
  expect(invoke).toHaveBeenCalledWith("admin", {
    body: { action: "support", child_id: "child-id", reason: "Parent support" },
  });
});
