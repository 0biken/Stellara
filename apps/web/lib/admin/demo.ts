import { AdminError, type AdminApi, type StaffMember, type StaffRole } from "./types";

/** Isolated staff preview. No production data and no persistence across reloads. */
export function createDemoAdminApi(role: StaffRole = "super_admin"): AdminApi {
  let signedIn = true;
  const members: StaffMember[] = [{ user_id: "demo-publisher", role, active: true }];
  const listeners = new Set<() => void>();
  const restrict = (allowed: StaffRole[]) => {
    if (!signedIn || !allowed.includes(role)) throw new AdminError("FORBIDDEN");
  };
  return {
    mode: "demo",
    async getSession() {
      return signedIn
        ? {
            userId: "demo-publisher",
            email: "staff@example.test",
            role,
            active: true,
            assurance: "aal2",
          }
        : null;
    },
    onAuthChange(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    async signOut() {
      signedIn = false;
      listeners.forEach((listener) => listener());
    },
    async listStaff() {
      restrict(["super_admin"]);
      return structuredClone(members);
    },
    async setStaffRole(input) {
      restrict(["super_admin"]);
      if (input.user_id === "demo-publisher") throw new AdminError("FORBIDDEN");
      const index = members.findIndex((member) => member.user_id === input.user_id);
      if (index < 0) members.push(input);
      else members[index] = input;
    },
    async getOperations() {
      restrict(["admin", "super_admin"]);
      return { requests: [] };
    },
    async getAudit() {
      restrict(["admin", "super_admin"]);
      return [];
    },
    async lookupChild() {
      restrict(["admin", "super_admin"]);
      return { child: null, requests: [] };
    },
    async getMfaFactor() {
      return "demo-factor";
    },
    async enrollMfa() {
      throw new AdminError("INVALID_REQUEST");
    },
    async verifyMfa() {
      throw new AdminError("INVALID_REQUEST");
    },
  };
}
