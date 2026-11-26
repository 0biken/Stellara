import { FunctionsHttpError, type SupabaseClient } from "@supabase/supabase-js";

import { buildEnv } from "../auth";
import { supabaseClient } from "../auth/supabase";

import { isStaffRole } from "./permissions";
import { AdminError, type AdminApi, type AdminErrorCode } from "./types";

export function createLiveAdminApi(client: SupabaseClient): AdminApi {
  async function invoke<T>(action: string, body: Record<string, unknown> = {}): Promise<T> {
    const { data, error } = await client.functions.invoke("admin", { body: { ...body, action } });
    if (!error) return data as T;
    if (error instanceof FunctionsHttpError) {
      const envelope = (await (error.context as Response).json().catch(() => null)) as {
        error?: { code?: string };
      } | null;
      const code = envelope?.error?.code;
      const known = ["MFA_REQUIRED", "FORBIDDEN", "INVALID_REQUEST", "UNAUTHORIZED"];
      throw new AdminError(
        code === "UNAUTHORIZED"
          ? "SIGNED_OUT"
          : known.includes(code ?? "")
            ? (code as AdminErrorCode)
            : "SERVER",
      );
    }
    throw new AdminError("NETWORK");
  }
  return {
    mode: "live",
    async getSession() {
      const { data, error } = await client.auth.getSession();
      if (error) throw new AdminError("NETWORK");
      if (!data.session) return null;
      const staff = await invoke<{ role: unknown }>("session");
      if (!isStaffRole(staff.role)) throw new AdminError("FORBIDDEN");
      const assurance = await client.auth.mfa.getAuthenticatorAssuranceLevel();
      if (assurance.error) throw new AdminError("SERVER");
      return {
        userId: data.session.user.id,
        role: staff.role,
        active: true,
        ...(data.session.user.email ? { email: data.session.user.email } : {}),
        assurance: assurance.data.currentLevel === "aal2" ? "aal2" : "aal1",
      };
    },
    onAuthChange(listener) {
      const { data } = client.auth.onAuthStateChange(() => {
        listener();
      });
      return () => data.subscription.unsubscribe();
    },
    async signOut() {
      const { error } = await client.auth.signOut();
      if (error) throw new AdminError("NETWORK");
    },
    listStaff: () => invoke("staff-list"),
    async setStaffRole(input) {
      await invoke("staff-set", { ...input });
    },
    getOperations: () => invoke("operations"),
    getAudit: () => invoke("audit"),
    lookupChild: (input) => invoke("support", { child_id: input.childId, reason: input.reason }),
    async getMfaFactor() {
      const { data, error } = await client.auth.mfa.listFactors();
      if (error) throw new AdminError("SERVER");
      return data.totp.find((factor) => factor.status === "verified")?.id ?? null;
    },
    async enrollMfa() {
      const existing = await client.auth.mfa.listFactors();
      if (existing.error) throw new AdminError("SERVER");
      for (const factor of existing.data.all.filter(
        (factor) => factor.factor_type === "totp" && factor.status === "unverified",
      )) {
        const removed = await client.auth.mfa.unenroll({ factorId: factor.id });
        if (removed.error) throw new AdminError("SERVER");
      }
      const { data, error } = await client.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "Stellara staff",
      });
      if (error) throw new AdminError("SERVER");
      return { id: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret };
    },
    async verifyMfa(factorId, code) {
      const { error } = await client.auth.mfa.challengeAndVerify({ factorId, code });
      if (error) throw new AdminError("INVALID_REQUEST");
    },
  };
}

let shared: AdminApi | undefined;
export async function getAdminApi(): Promise<AdminApi> {
  if (shared) return shared;
  if (process.env.NEXT_PUBLIC_ADMIN_DEMO === "true") {
    const { createDemoAdminApi } = await import("./demo");
    shared = createDemoAdminApi();
    return shared;
  }
  if (!buildEnv.url || !buildEnv.publishableKey) throw new AdminError("NOT_CONFIGURED");
  shared = createLiveAdminApi(
    supabaseClient({ url: buildEnv.url, publishableKey: buildEnv.publishableKey }),
  );
  return shared;
}
