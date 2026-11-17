import { createPreviewAdapter } from "./preview";
import { createSupabaseAdapter } from "./supabase";

import type { AuthAdapter } from "./types";

export type { AuthAdapter, Session } from "./types";
export { defaultNext, safeNext } from "./safe-next";

export interface AuthEnv {
  url?: string | undefined;
  publishableKey?: string | undefined;
  basePath?: string | undefined;
}

/** NEXT_PUBLIC_* values are inlined at build time, so they must be read by name. */
export const buildEnv: AuthEnv = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL,
  publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  basePath: process.env.NEXT_PUBLIC_BASE_PATH,
};

export function createAuthAdapter(env: AuthEnv = buildEnv): AuthAdapter {
  if (env.url && env.publishableKey) {
    return createSupabaseAdapter({
      url: env.url,
      publishableKey: env.publishableKey,
      basePath: env.basePath ?? "",
    });
  }
  return createPreviewAdapter();
}

let shared: AuthAdapter | undefined;

/** One adapter per page load; call only in the browser. */
export function getAuthAdapter(): AuthAdapter {
  shared ??= createAuthAdapter();
  return shared;
}
