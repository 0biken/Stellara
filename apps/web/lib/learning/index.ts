import { buildEnv, type AuthEnv } from "../auth";

import { createSupabaseLearningApi } from "./supabase";

import type { LearningApi } from "./types";

export * from "./types";

/**
 * Same switch as sign-in: Supabase values set → live functions; otherwise the
 * preview engine, loaded on demand so its sample keys never load in live mode.
 */
export async function createLearningApi(env: AuthEnv = buildEnv): Promise<LearningApi> {
  if (env.url && env.publishableKey)
    return createSupabaseLearningApi({ url: env.url, publishableKey: env.publishableKey });
  const { createPreviewLearningApi } = await import("./preview");
  return createPreviewLearningApi();
}

let shared: Promise<LearningApi> | undefined;

/** One adapter per page load; call only in the browser. */
export function getLearningApi(): Promise<LearningApi> {
  shared ??= createLearningApi();
  return shared;
}
