import { FunctionsHttpError, type SupabaseClient } from "@supabase/supabase-js";

import {
  CONSENT_METHOD,
  FamilyError,
  NOTICE_VERSION,
  type ChildSignInResult,
  type ChildSummary,
  type ConsentRecord,
  type DataRequestRecord,
  type FamilyApi,
  type FamilyErrorCode,
  type ParentReport,
  type UpdateChildInput,
} from "./types";

/** Read by the child side (apps/web/lib/learning/supabase.ts). */
export const childSessionKey = "stellara.childSession";
const deviceKey = "stellara.deviceId";
let fallbackDeviceId: string | undefined;

function deviceId() {
  const fallback = (fallbackDeviceId ??= crypto.randomUUID());
  try {
    const stored = window.localStorage.getItem(deviceKey);
    if (stored && /^[a-f0-9-]{36}$/i.test(stored)) return stored;
    window.localStorage.setItem(deviceKey, fallback);
  } catch {
    // Keep the same device ID for this page when browser storage is disabled.
  }
  return fallback;
}

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
        .is("child_id", null)
        .is("withdrawn_at", null)
        .not("verified_at", "is", null)
        .gt("expires_at", new Date().toISOString())
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
        method: CONSENT_METHOD,
        adult_declaration: true,
      });
      await invoke("consent-confirm", { consent_id: started.consent_id });
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
        .select("id, first_name, avatar_key, year, exam_date, timezone, status")
        .order("created_at", { ascending: true });
      if (error) throw new FamilyError("NETWORK");
      return (data ?? []) as ChildSummary[];
    },
    async addChild(child) {
      const consent = await this.getConsent();
      if (!consent) throw new FamilyError("CONSENT_REQUIRED");
      const created = await invoke<{ child_id: string }>("child-create", {
        consent_id: consent.id,
        first_name: child.first_name.trim(),
        year: child.year,
        exam_date: child.exam_date,
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
      const { data, error } = await client.functions.invoke<{ token: string; expires_at: string }>(
        "child-session",
        { body: { child_id: child.id, pin, mode: "family", device_id: deviceId() } },
      );
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
      if (!data?.token || !data.expires_at) throw new FamilyError("SERVER");
      try {
        window.sessionStorage.setItem(
          childSessionKey,
          JSON.stringify({
            token: data.token,
            expiresAt: data.expires_at,
            child: { id: child.id, first_name: child.first_name, year: child.year },
          }),
        );
      } catch {
        throw new FamilyError("SERVER");
      }
      return { status: "signed-in" };
    },
    async updateChild(childId: string, patch: UpdateChildInput) {
      return invoke<ChildSummary>("child-update", { child_id: childId, ...patch });
    },
    async resetChildPin(childId: string, pin) {
      await invoke("child-pin-reset", { child_id: childId, pin });
    },
    async pauseChild(childId: string) {
      return invoke<ChildSummary>("child-status", { child_id: childId, status: "paused" });
    },
    async resumeChild(childId: string) {
      return invoke<ChildSummary>("child-status", { child_id: childId, status: "active" });
    },
    async withdrawConsent(childId: string) {
      await invoke("consent-withdraw", { child_id: childId });
    },
    async requestDataExport(childId: string) {
      return invoke<DataRequestRecord>("data-request-export", { child_id: childId });
    },
    async requestDataDeletion(childId: string, confirmationText: string) {
      return invoke<DataRequestRecord>("data-request-delete", {
        child_id: childId,
        confirmation: confirmationText,
      });
    },
    async listReports(childId: string) {
      const result = await invoke<{ reports: ParentReport[] }>("reports-list", {
        child_id: childId,
      });
      return result.reports ?? [];
    },
    async markReportOpened(childId: string, reportId: string) {
      await invoke("report-open", { child_id: childId, report_id: reportId });
    },
    async listDataRequests(childId: string) {
      const { data, error } = await client
        .from("data_requests")
        .select(
          "id, child_id, kind, status, requested_at, due_at, download_url, download_expires_at",
        )
        .eq("child_id", childId)
        .order("requested_at", { ascending: false });
      if (error) throw new FamilyError("NETWORK");
      return (data ?? []) as DataRequestRecord[];
    },
  };
}
