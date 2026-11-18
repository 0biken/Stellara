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
  type FamilyApi,
  type NewChild,
} from "./types";

export const previewFamilyKey = "stellara.preview.family";
/** Read by the child side (apps/web/lib/learning/preview.ts). */
export const previewChildKey = "stellara.preview.child";

interface PreviewChild extends ChildSummary {
  pin: string[];
  failures: number;
  locked_until: number | null;
}

interface PreviewFamily {
  consent: ConsentRecord | null;
  children: PreviewChild[];
}

const empty = (): PreviewFamily => ({ consent: null, children: [] });

function load(storage: Storage | undefined): PreviewFamily | null {
  try {
    const raw = storage?.getItem(previewFamilyKey);
    if (!raw) return storage ? empty() : null;
    const parsed = JSON.parse(raw) as Partial<PreviewFamily>;
    return { consent: parsed.consent ?? null, children: parsed.children ?? [] };
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
      commit({ ...current(), consent });
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
  };
}
