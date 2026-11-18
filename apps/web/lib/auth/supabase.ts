import {
  createClient,
  type Session as SupabaseSession,
  type SupabaseClient,
} from "@supabase/supabase-js";

import { clearChildSession } from "../child-session";

import type { AuthAdapter, Session } from "./types";

export interface SupabaseConfig {
  url: string;
  publishableKey: string;
  basePath: string;
}

function toSession(session: SupabaseSession | null): Session | null {
  if (!session) return null;
  const { user } = session;
  const meta = user.user_metadata as { full_name?: unknown; name?: unknown };
  const displayName =
    typeof meta.full_name === "string"
      ? meta.full_name
      : typeof meta.name === "string"
        ? meta.name
        : undefined;
  return {
    userId: user.id,
    ...(user.email ? { email: user.email } : {}),
    ...(displayName ? { displayName } : {}),
    // Roles come from school and guardian tables once 2.1–2.6 exist.
    roles: ["guardian"],
  };
}

export function callbackUrl(basePath: string, next: string): string {
  return `${window.location.origin}${basePath}/auth/callback/?next=${encodeURIComponent(next)}`;
}

let shared: { key: string; client: SupabaseClient } | undefined;

/** One browser client per page, shared by sign-in and the family and learning APIs. */
export function supabaseClient(config: Pick<SupabaseConfig, "url" | "publishableKey">) {
  const key = `${config.url}|${config.publishableKey}`;
  if (shared?.key !== key) {
    shared = {
      key,
      client: createClient(config.url, config.publishableKey, {
        auth: { flowType: "pkce", detectSessionInUrl: true, persistSession: true },
      }),
    };
  }
  return shared.client;
}

export function createSupabaseAdapter(config: SupabaseConfig): AuthAdapter {
  const client = supabaseClient(config);

  return {
    mode: "supabase",
    async getSession() {
      const { data } = await client.auth.getSession();
      return toSession(data.session);
    },
    onChange(listener) {
      const { data } = client.auth.onAuthStateChange((event, session) => {
        if (event === "SIGNED_OUT") clearChildSession();
        listener(toSession(session));
      });
      return () => data.subscription.unsubscribe();
    },
    async signInWithGoogle({ next }) {
      const { error } = await client.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: callbackUrl(config.basePath, next) },
      });
      return error ? { status: "error" } : { status: "redirecting" };
    },
    async signInWithEmail({ email, next }) {
      const { error } = await client.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: callbackUrl(config.basePath, next) },
      });
      return error ? { status: "error" } : { status: "email-sent" };
    },
    async signOut() {
      clearChildSession();
      await client.auth.signOut();
    },
  };
}
