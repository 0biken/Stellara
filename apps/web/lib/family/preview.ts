import {
  CONSENT_METHOD,
  FamilyError,
  NOTICE_VERSION,
  PIN_ATTEMPTS,
  PIN_LOCK_MS,
  isValidFirstName,
  isValidPin,
  type ChildSummary,
  type ConsentRecord,
  type DataRequestRecord,
  type FamilyApi,
  type NewChild,
  type ParentReport,
  type UpdateChildInput,
} from "./types";

const WEEK_MS = 7 * 86_400_000;
const previewTopics = {
  "preview-fractions": "Fractions",
  "preview-ratios": "Ratios",
  "preview-place-value": "Place value",
};

/** Last completed Sunday 18:00 Lagos (17:00 UTC), as the weekly job uses. */
function lastReportEnd(now: number): number {
  const lagos = new Date(now + 3_600_000);
  const sunday = Date.UTC(
    lagos.getUTCFullYear(),
    lagos.getUTCMonth(),
    lagos.getUTCDate() - lagos.getUTCDay(),
    17,
  );
  return now >= sunday ? sunday : sunday - WEEK_MS;
}

/**
 * Preview reports: fixed examples so the report screen can be reviewed without
 * a backend. They are labelled as examples and never use the child's practice.
 */
export function previewReports(childId: string, now: number): ParentReport[] {
  const end = lastReportEnd(now);
  // The month that has fully ended in Lagos at `now`, as the monthly job uses.
  const lagos = new Date(now + 3_600_000);
  const monthEnd = Date.UTC(lagos.getUTCFullYear(), lagos.getUTCMonth(), 1) - 3_600_000;
  const monthStart = Date.UTC(lagos.getUTCFullYear(), lagos.getUTCMonth() - 1, 1) - 3_600_000;
  return [
    {
      id: `preview-weekly-${childId}`,
      child_id: childId,
      kind: "weekly",
      period_start: end - WEEK_MS,
      period_end: end,
      template_version: "report-v1",
      opened_at: null,
      payload: {
        kind: "weekly",
        topics: previewTopics,
        report: {
          stats: { mastered: 1, inProgress: 2, activeDaysTerm: 18 },
          celebrate: { key: "topic_gain", values: { topicId: "preview-fractions", gain: 1 } },
          next: ["preview-ratios", "preview-place-value"],
          coverage: [],
          note: { key: "celebrate_and_review", values: { topicIds: ["preview-ratios"] } },
        },
      },
    },
    {
      id: `preview-monthly-${childId}`,
      child_id: childId,
      kind: "monthly",
      period_start: monthStart,
      period_end: monthEnd,
      template_version: "report-v1",
      opened_at: now,
      payload: {
        kind: "monthly",
        month: new Date(monthStart + 3_600_000).toISOString().slice(0, 7),
        topics: previewTopics,
        summary: {
          stats: { activeDays: 12, mastered: 1, inProgress: 2 },
          newlyMastered: ["preview-fractions"],
          workingOn: ["preview-ratios", "preview-place-value"],
          note: { key: "month_mastered", values: { topicIds: ["preview-fractions"] } },
        },
      },
    },
  ].sort((a, b) => b.period_end - a.period_end) as ParentReport[];
}

export const previewFamilyKey = "stellara.preview.family";
/** Read by the child side (apps/web/lib/learning/preview.ts). */
export const previewChildKey = "stellara.preview.child";

interface PreviewChild extends ChildSummary {
  pin: string[];
  failures: number;
  locked_until: number | null;
  consent_withdrawn?: boolean;
}

interface PreviewFamily {
  consent: ConsentRecord | null;
  children: PreviewChild[];
  dataRequests?: DataRequestRecord[];
}

const empty = (): PreviewFamily => ({ consent: null, children: [], dataRequests: [] });

function load(storage: Storage | undefined): PreviewFamily | null {
  try {
    const raw = storage?.getItem(previewFamilyKey);
    if (!raw) return storage ? empty() : null;
    const parsed = JSON.parse(raw) as Partial<PreviewFamily>;
    return {
      consent: parsed.consent ?? null,
      children: parsed.children ?? [],
      dataRequests: parsed.dataRequests ?? [],
    };
  } catch {
    return null;
  }
}

function uuid(): string {
  return globalThis.crypto?.randomUUID?.() ?? `preview-${Date.now()}-${Math.random()}`;
}

const strip = (child: PreviewChild): ChildSummary => ({
  id: child.id,
  first_name: child.first_name,
  avatar_key: child.avatar_key,
  year: child.year,
  exam_date: child.exam_date,
  timezone: child.timezone ?? "Africa/Lagos",
  status: child.status ?? "active",
});

/**
 * Preview mode: everything stays in this browser. No consent record, child
 * profile or picture key leaves the device, and nothing here is evidence of
 * real consent. The picture key is compared in the browser only because this
 * is a demo; the real check is argon2id in `child-session`.
 */
export function createPreviewFamilyApi(
  storage: Storage | undefined = typeof window === "undefined" ? undefined : window.localStorage,
  clock: () => number = Date.now,
): FamilyApi {
  let memory: PreviewFamily = load(storage) ?? empty();
  const opened = new Set<string>();
  const current = () => load(storage) ?? memory;
  const commit = (family: PreviewFamily) => {
    memory = family;
    try {
      storage?.setItem(previewFamilyKey, JSON.stringify(family));
    } catch {
      // Storage can be blocked in private windows; the preview then lasts for this page.
    }
  };

  return {
    mode: "preview",
    async getConsent() {
      return current().consent;
    },
    async giveConsent(purposes) {
      const consent: ConsentRecord = {
        id: uuid(),
        notice_version: NOTICE_VERSION,
        method: CONSENT_METHOD,
        purposes,
        given_at: new Date(clock()).toISOString(),
      };
      const prev = current();
      const children = prev.children.map((c) => ({ ...c, consent_withdrawn: false }));
      commit({ ...prev, consent, children });
      return consent;
    },
    async listChildren() {
      return current().children.map(strip);
    },
    async addChild(input: NewChild) {
      const family = current();
      if (!family.consent) throw new FamilyError("CONSENT_REQUIRED");
      if (!isValidFirstName(input.first_name)) throw new FamilyError("SERVER");
      if (!isValidPin(input.pin)) throw new FamilyError("PIN_INVALID");
      const child: PreviewChild = {
        id: uuid(),
        first_name: input.first_name.trim(),
        avatar_key: input.avatar_key,
        year: input.year,
        exam_date: input.exam_date,
        pin: [...input.pin],
        failures: 0,
        locked_until: null,
      };
      commit({ ...family, children: [...family.children, child] });
      return strip(child);
    },
    async signInChild(summary, pin) {
      const family = current();
      const index = family.children.findIndex((c) => c.id === summary.id);
      const child = family.children[index];
      if (!child) throw new FamilyError("SERVER");
      const now = clock();
      if (child.locked_until && child.locked_until > now) {
        return { status: "locked", lockedUntil: new Date(child.locked_until).toISOString() };
      }
      const children = [...family.children];
      if (pin.length === 4 && pin.every((p, i) => p === child.pin[i])) {
        children[index] = { ...child, failures: 0, locked_until: null };
        commit({ ...family, children });
        try {
          storage?.setItem(previewChildKey, JSON.stringify(strip(child)));
        } catch {
          // Without storage the child side shows its "ask a grown-up" screen.
        }
        return { status: "signed-in" };
      }
      const failures = child.failures + 1;
      if (failures >= PIN_ATTEMPTS) {
        const lockedUntil = now + PIN_LOCK_MS;
        children[index] = { ...child, failures: 0, locked_until: lockedUntil };
        commit({ ...family, children });
        return { status: "locked", lockedUntil: new Date(lockedUntil).toISOString() };
      }
      children[index] = { ...child, failures, locked_until: null };
      commit({ ...family, children });
      return { status: "incorrect", attemptsLeft: PIN_ATTEMPTS - failures };
    },
    async updateChild(childId: string, patch: UpdateChildInput) {
      const family = current();
      const index = family.children.findIndex((c) => c.id === childId);
      const child = family.children[index];
      if (!child) throw new FamilyError("SERVER");
      if (patch.first_name !== undefined && !isValidFirstName(patch.first_name)) {
        throw new FamilyError("SERVER");
      }
      const updated: PreviewChild = {
        ...child,
        ...(patch.first_name !== undefined ? { first_name: patch.first_name.trim() } : {}),
        ...(patch.avatar_key !== undefined ? { avatar_key: patch.avatar_key } : {}),
        ...(patch.year !== undefined ? { year: patch.year } : {}),
        ...(patch.exam_date !== undefined ? { exam_date: patch.exam_date } : {}),
        ...(patch.timezone !== undefined ? { timezone: patch.timezone } : {}),
      };
      const children = [...family.children];
      children[index] = updated;
      commit({ ...family, children });
      return strip(updated);
    },
    async resetChildPin(childId: string, pin) {
      if (!isValidPin(pin)) throw new FamilyError("PIN_INVALID");
      const family = current();
      const index = family.children.findIndex((c) => c.id === childId);
      const child = family.children[index];
      if (!child) throw new FamilyError("SERVER");
      const children = [...family.children];
      children[index] = { ...child, pin: [...pin], failures: 0, locked_until: null };
      commit({ ...family, children });
      try {
        storage?.removeItem(previewChildKey);
      } catch {
        // Ignore
      }
    },
    async pauseChild(childId: string) {
      const family = current();
      const index = family.children.findIndex((c) => c.id === childId);
      const child = family.children[index];
      if (!child) throw new FamilyError("SERVER");
      const updated: PreviewChild = { ...child, status: "paused" };
      const children = [...family.children];
      children[index] = updated;
      commit({ ...family, children });
      try {
        storage?.removeItem(previewChildKey);
      } catch {
        // Ignore
      }
      return strip(updated);
    },
    async resumeChild(childId: string) {
      const family = current();
      const index = family.children.findIndex((c) => c.id === childId);
      const child = family.children[index];
      if (!child) throw new FamilyError("SERVER");
      if (!family.consent || child.consent_withdrawn) {
        throw new FamilyError("CONSENT_REQUIRED");
      }
      const updated: PreviewChild = { ...child, status: "active" };
      const children = [...family.children];
      children[index] = updated;
      commit({ ...family, children });
      return strip(updated);
    },
    async withdrawConsent(childId: string) {
      const family = current();
      const index = family.children.findIndex((c) => c.id === childId);
      const child = family.children[index];
      if (!child) throw new FamilyError("SERVER");
      const children = [...family.children];
      children[index] = { ...child, status: "paused", consent_withdrawn: true };
      commit({ ...family, consent: null, children });
      try {
        storage?.removeItem(previewChildKey);
      } catch {
        // Ignore
      }
    },
    async requestDataExport(childId: string) {
      const family = current();
      const child = family.children.find((c) => c.id === childId);
      if (!child) throw new FamilyError("SERVER");
      const existing = (family.dataRequests ?? []).find(
        (r) => r.child_id === childId && r.kind === "export" && r.status !== "failed",
      );
      if (existing) return existing;
      const now = clock();
      const exportPayload = {
        profile: strip(child),
        exported_at: new Date(now).toISOString(),
      };
      const req: DataRequestRecord = {
        id: uuid(),
        child_id: childId,
        kind: "export",
        status: "ready",
        requested_at: new Date(now).toISOString(),
        due_at: new Date(now + 7 * 86_400_000).toISOString(),
        download_url: `data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify(exportPayload))}`,
        download_expires_at: new Date(now + 24 * 3_600_000).toISOString(),
      };
      commit({ ...family, dataRequests: [...(family.dataRequests ?? []), req] });
      return req;
    },
    async requestDataDeletion(childId: string, confirmationText: string) {
      const family = current();
      const index = family.children.findIndex((c) => c.id === childId);
      const child = family.children[index];
      if (!child) throw new FamilyError("SERVER");
      if (confirmationText !== `DELETE ${child.first_name}`) {
        throw new FamilyError("SERVER");
      }
      const existing = (family.dataRequests ?? []).find(
        (r) => r.child_id === childId && r.kind === "deletion" && r.status !== "failed",
      );
      if (existing) return existing;
      const now = clock();
      const children = [...family.children];
      children[index] = { ...child, status: "deletion_pending" };
      const req: DataRequestRecord = {
        id: uuid(),
        child_id: childId,
        kind: "deletion",
        status: "pending",
        requested_at: new Date(now).toISOString(),
        due_at: new Date(now + 30 * 86_400_000).toISOString(),
      };
      commit({ ...family, children, dataRequests: [...(family.dataRequests ?? []), req] });
      try {
        storage?.removeItem(previewChildKey);
      } catch {
        // Ignore
      }
      return req;
    },
    async listDataRequests(childId: string) {
      const family = current();
      return (family.dataRequests ?? []).filter((r) => r.child_id === childId);
    },
    async listReports(childId: string) {
      if (!current().children.some((c) => c.id === childId)) return [];
      return previewReports(childId, clock()).map((report) =>
        opened.has(report.id) ? { ...report, opened_at: report.opened_at ?? clock() } : report,
      );
    },
    async markReportOpened(_childId: string, reportId: string) {
      opened.add(reportId);
    },
  };
}
