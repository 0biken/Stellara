export const staffRoles = ["super_admin", "admin", "author", "reviewer", "content_lead"] as const;
export type StaffRole = (typeof staffRoles)[number];
export const roleLabels: Record<StaffRole, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  author: "Author",
  reviewer: "Reviewer",
  content_lead: "Content Lead",
};
export interface StaffSession {
  userId: string;
  role: StaffRole;
  active: boolean;
  email?: string;
  assurance: "aal1" | "aal2";
}
export interface StaffMember {
  user_id: string;
  role: StaffRole;
  active: boolean;
}
export interface RequestCount {
  kind: string;
  status: string;
  count: number;
}
export interface AuditEntry {
  id: string;
  actor_id: string;
  actor_role: string;
  action: string;
  entity: string;
  entity_id: string | null;
  created_at: string;
}
export interface SupportResult {
  child: { id: string; first_name: string; year: string; status: string } | null;
  requests: { id: string; kind: string; status: string; requested_at: string; due_at: string }[];
}
export type AdminErrorCode =
  | "NOT_CONFIGURED"
  | "SIGNED_OUT"
  | "FORBIDDEN"
  | "MFA_REQUIRED"
  | "NETWORK"
  | "SERVER"
  | "INVALID_REQUEST";
export class AdminError extends Error {
  constructor(readonly code: AdminErrorCode) {
    super(code);
    this.name = "AdminError";
  }
}
export interface MfaSetup {
  id: string;
  qrCode: string;
  secret: string;
}
export interface AdminApi {
  readonly mode: "live" | "demo";
  getSession(): Promise<StaffSession | null>;
  onAuthChange(listener: () => void): () => void;
  signOut(): Promise<void>;
  listStaff(): Promise<StaffMember[]>;
  setStaffRole(input: StaffMember): Promise<void>;
  getOperations(): Promise<{ requests: RequestCount[] }>;
  getAudit(): Promise<AuditEntry[]>;
  lookupChild(input: { childId: string; reason: string }): Promise<SupportResult>;
  getMfaFactor(): Promise<string | null>;
  enrollMfa(): Promise<MfaSetup>;
  verifyMfa(factorId: string, code: string): Promise<void>;
}
