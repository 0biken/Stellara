import type { PictureId } from "@stellara/ui";

/**
 * Parent-side contracts from docs/md/06 §1 (consent and children). The web app
 * only describes requests; the backend checks consent, hashes the picture key
 * and owns every record.
 */

export const NOTICE_VERSION = "2026-11-v1";

/** Placeholder until the lawyer picks the s.31(2) method (07 §3). Never production. */
export const CONSENT_METHOD = "declaration_v0";

export interface ConsentPurposes {
  /** Required: answers and progress are used to choose practice and report to the parent. */
  core_learning: true;
  progress_messages: boolean;
  product_research: boolean;
}

export interface ConsentRecord {
  id: string;
  notice_version: string;
  method: string;
  purposes: ConsentPurposes;
  given_at: string;
}

export type SchoolYear = "P4" | "P5" | "P6";
export const schoolYears: readonly SchoolYear[] = ["P4", "P5", "P6"];

export type ChildStatus = "active" | "paused" | "deletion_pending";

export interface ChildSummary {
  id: string;
  first_name: string;
  avatar_key: PictureId;
  year: SchoolYear;
  exam_date: string | null;
  timezone?: string;
  status?: ChildStatus;
}

export interface UpdateChildInput {
  first_name?: string;
  avatar_key?: PictureId;
  year?: SchoolYear;
  exam_date?: string | null;
  timezone?: string;
}

export interface DataRequestRecord {
  id: string;
  child_id: string;
  kind: "export" | "deletion";
  status: "pending" | "ready" | "completed" | "failed";
  requested_at: string;
  due_at: string;
  download_url?: string;
  download_expires_at?: string;
}

export interface NewChild {
  first_name: string;
  year: SchoolYear;
  /** `YYYY-MM-DD`, or null when the family has no exam date yet. */
  exam_date: string | null;
  avatar_key: PictureId;
  /** Four picture ids, chosen by the child with the parent. */
  pin: PictureId[];
}

export type FamilyErrorCode = "CONSENT_REQUIRED" | "PIN_INVALID" | "NETWORK" | "SERVER";

export class FamilyError extends Error {
  constructor(readonly code: FamilyErrorCode) {
    super(code);
    this.name = "FamilyError";
  }
}

export interface FamilyApi {
  readonly mode: "supabase" | "preview";
  getConsent(): Promise<ConsentRecord | null>;
  giveConsent(purposes: ConsentPurposes): Promise<ConsentRecord>;
  listChildren(): Promise<ChildSummary[]>;
  addChild(child: NewChild): Promise<ChildSummary>;
  /**
   * KID-01: the child taps their picture key on the family device. On success
   * the child session is stored for the child side, which starts at `/sky/`.
   */
  signInChild(child: ChildSummary, pin: PictureId[]): Promise<ChildSignInResult>;
  updateChild?(childId: string, patch: UpdateChildInput): Promise<ChildSummary>;
  resetChildPin?(childId: string, pin: PictureId[]): Promise<void>;
  pauseChild?(childId: string): Promise<ChildSummary>;
  resumeChild?(childId: string): Promise<ChildSummary>;
  withdrawConsent?(childId: string): Promise<void>;
  requestDataExport?(childId: string): Promise<DataRequestRecord>;
  requestDataDeletion?(childId: string, confirmationText: string): Promise<DataRequestRecord>;
  listDataRequests?(childId: string): Promise<DataRequestRecord[]>;
}

export type ChildSignInResult =
  | { status: "signed-in" }
  | { status: "incorrect"; attemptsLeft: number }
  | { status: "locked"; lockedUntil: string };

/** 04 §6: five wrong picture keys lock the profile for five minutes. */
export const PIN_ATTEMPTS = 5;
export const PIN_LOCK_MS = 5 * 60_000;

const namePattern = /^[\p{L}][\p{L}\p{M}' -]{0,29}$/u;

/** First names only: letters, spaces, apostrophes and hyphens, up to 30 characters. */
export function isValidFirstName(value: string): boolean {
  return namePattern.test(value.trim());
}

export function isValidPin(pin: readonly string[]): boolean {
  return pin.length === 4;
}
