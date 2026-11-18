import { FunctionsHttpError, type SupabaseClient } from "@supabase/supabase-js";

import { deviceId, saveChildSession } from "../child-session";

import {
  CONSENT_METHOD,
  FamilyError,
  NOTICE_VERSION,
  type ChildSignInResult,
  type ChildSummary,
  type ConsentRecord,
  type FamilyApi,
  type FamilyErrorCode,
} from "./types";

/** Read by the child side (apps/web/lib/learning/supabase.ts). */
export { childSessionKey } from "../child-session";

interface ErrorBody {
  error?: { code?: string; attempts_left?: number; locked_until?: string };
  code?: string;
  attempts_left?: number;
  locked_until?: string;
}

async function errorBody(error: unknown): Promise<ErrorBody | null> {
  if (!(error instanceof FunctionsHttpError)) return null;
  try {
    return (await (error.context as Response).json()) as ErrorBody;
  } catch {
    return null;
  }
}

function familyError(code: string | undefined): FamilyError {
  const known: FamilyErrorCode[] = ["CONSENT_REQUIRED", "PIN_INVALID"];
  return new FamilyError(
    known.includes(code as FamilyErrorCode) ? (code as FamilyErrorCode) : "SERVER",
  );
}

/**
 * Live mode. Writes go through the Edge Functions in docs/md/06 §1; reads use
 * PostgREST, where RLS limits a guardian to their own consent and children.
 */
export function createSupabaseFamilyApi(client: SupabaseClient): FamilyApi {
  async function invoke<T>(name: string, body: Record<string, unknown>): Promise<T> {
    const { data, error } = await client.functions.invoke<T>(name, { body });
    if (!error) return data as T;
    const details = await errorBody(error);
    if (!details) throw new FamilyError("NETWORK");
    throw familyError(details.error?.code ?? details.code);
  }

  return {
    mode: "supabase",
    async getConsent() {
      const { data, error } = await client
        .from("consents")
        .select("id, notice_version, method, purposes, created_at")
        .is("withdrawn_at", null)
        .is("child_id", null)
        .not("verified_at", "is", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw new FamilyError("NETWORK");
      if (!data) return null;
      const row = data as {
        id: string;
        notice_version: string;
        method: string;
        purposes: ConsentRecord["purposes"];
        created_at: string;
      };
      return { ...row, given_at: row.created_at };
    },
    async giveConsent(purposes) {
      const started = await invoke<{ consent_id: string }>("consent-start", {
        notice_version: NOTICE_VERSION,
        purposes,
        declaration: { is_adult: true },
      });
      await invoke("consent-confirm", {
        consent_id: started.consent_id,
        declaration: { is_adult: true, is_parent_or_guardian: true },
      });
      return {
        id: started.consent_id,
        notice_version: NOTICE_VERSION,
        method: CONSENT_METHOD,
        purposes,
        given_at: new Date().toISOString(),
      };
    },
    async listChildren() {
      const { data, error } = await client
        .from("children")
        .select("id, first_name, avatar_key, year, exam_date")
        .order("created_at", { ascending: true });
      if (error) throw new FamilyError("NETWORK");
      return (data ?? []).map((row) => ({ ...row, year: `P${row.year}` })) as ChildSummary[];
    },
    async addChild(child) {
      const consent = await this.getConsent();
      if (!consent) throw new FamilyError("CONSENT_REQUIRED");
      const created = await invoke<{ child_id: string }>("child-create", {
        consent_id: consent.id,
        first_name: child.first_name.trim(),
        year: Number(child.year.slice(1)),
        ...(child.exam_date ? { exam_date: child.exam_date } : {}),
        avatar_key: child.avatar_key,
        pin: child.pin,
      });
      return {
        id: created.child_id,
        first_name: child.first_name.trim(),
        avatar_key: child.avatar_key,
        year: child.year,
        exam_date: child.exam_date,
      };
    },
    async signInChild(child, pin): Promise<ChildSignInResult> {
      const device_id = deviceId();
      const { data, error } = await client.functions.invoke<{
        token: string;
        expires_at: string;
        refresh_until: string;
        refresh_token: string;
      }>("child-session", {
        body: { child_id: child.id, pin, device_id },
      });
      if (error) {
        const details = await errorBody(error);
        if (!details) throw new FamilyError("NETWORK");
        const code = details.error?.code ?? details.code;
        if (code === "PIN_INCORRECT") {
          return {
            status: "incorrect",
            attemptsLeft: details.error?.attempts_left ?? details.attempts_left ?? 0,
          };
        }
        if (code === "PROFILE_LOCKED") {
          return {
            status: "locked",
            lockedUntil: details.error?.locked_until ?? details.locked_until ?? "",
          };
        }
        throw familyError(code);
      }
      try {
        if (!data) throw new FamilyError("SERVER");
        saveChildSession({
          ...data,
          device_id,
          child: { id: child.id, first_name: child.first_name },
        });
      } catch {
        throw new FamilyError("SERVER");
      }
      return { status: "signed-in" };
    },
  };
}
