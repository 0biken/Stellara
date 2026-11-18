import { buildEnv, type AuthEnv } from "../auth";
import { supabaseClient } from "../auth/supabase";

import { createPreviewFamilyApi } from "./preview";
import { createSupabaseFamilyApi } from "./supabase";

import type { FamilyApi } from "./types";

export * from "./types";

/** Same switch as sign-in: live when the Supabase env vars are set, otherwise preview. */
export function createFamilyApi(env: AuthEnv = buildEnv): FamilyApi {
  if (env.url && env.publishableKey) {
    return createSupabaseFamilyApi(
      supabaseClient({ url: env.url, publishableKey: env.publishableKey }),
    );
  }
  return createPreviewFamilyApi();
}

let shared: FamilyApi | undefined;

/** One API per page load; call only in the browser. */
export function getFamilyApi(): FamilyApi {
  shared ??= createFamilyApi();
  return shared;
}
