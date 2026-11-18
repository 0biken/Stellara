import { LearningError } from "./learning/types";

export const childSessionKey = "stellara.childSession";
export const childSessionChanged = "stellara:child-session";
export interface ChildSession {
  token: string;
  expires_at: string;
  refresh_until: string;
  refresh_token: string;
  device_id: string;
  child: { id: string; first_name: string };
}
export interface ChildTransport {
  url: string;
  publishableKey: string;
  fetch?: typeof fetch;
}
function valid(value: unknown): value is ChildSession {
  if (!value || typeof value !== "object") return false;
  const s = value as Partial<ChildSession>;
  return (
    typeof s.token === "string" &&
    s.token.length > 0 &&
    typeof s.refresh_token === "string" &&
    /^[0-9a-f]{64}$/.test(s.refresh_token) &&
    typeof s.device_id === "string" &&
    /^[0-9a-f-]{36}$/.test(s.device_id) &&
    typeof s.expires_at === "string" &&
    Number.isFinite(Date.parse(s.expires_at)) &&
    typeof s.refresh_until === "string" &&
    Number.isFinite(Date.parse(s.refresh_until)) &&
    typeof s.child?.id === "string" &&
    typeof s.child.first_name === "string"
  );
}
export function readChildSession(): ChildSession | null {
  try {
    const raw = sessionStorage.getItem(childSessionKey);
    const s = raw ? JSON.parse(raw) : null;
    return valid(s) ? s : null;
  } catch {
    return null;
  }
}
export function clearChildSession() {
  try {
    const existed = sessionStorage.getItem(childSessionKey) !== null;
    sessionStorage.removeItem(childSessionKey);
    if (existed) window.dispatchEvent(new Event(childSessionChanged));
  } catch {
    /* Storage may be unavailable. */
  }
}
export function saveChildSession(s: ChildSession) {
  if (!valid(s)) throw new LearningError("NO_CHILD_SESSION", false);
  sessionStorage.setItem(childSessionKey, JSON.stringify(s));
}
/** Tab-scoped credentials avoid cross-tab refresh races on a shared family device. */
export function deviceId() {
  const key = "stellara.childDevice";
  let id = sessionStorage.getItem(key);
  if (!id || !/^[0-9a-f-]{36}$/.test(id)) {
    id = crypto.randomUUID();
    sessionStorage.setItem(key, id);
  }
  return id;
}
const pending = new Map<string, Promise<ChildSession>>();
export async function getValidChildSession(
  options: ChildTransport,
  force = false,
): Promise<ChildSession> {
  const current = readChildSession();
  if (!current || Date.parse(current.refresh_until) <= Date.now()) {
    clearChildSession();
    throw new LearningError("NO_CHILD_SESSION", false);
  }
  if (!force && Date.parse(current.expires_at) > Date.now() + 30000) return current;
  const key = current.refresh_token;
  const existing = pending.get(key);
  if (existing) return existing;
  const refresh = (async () => {
    try {
      const res = await (options.fetch ?? fetch)(
        `${options.url}/functions/v1/child-session-refresh`,
        {
          method: "POST",
          headers: { apikey: options.publishableKey, "content-type": "application/json" },
          body: JSON.stringify({ refresh_token: key, device_id: current.device_id }),
        },
      );
      if (!res.ok) throw new Error("refresh rejected");
      const body = await res.json();
      const replacement = { ...body, child: current.child, device_id: current.device_id };
      if (readChildSession()?.refresh_token !== key) throw new Error("session changed");
      saveChildSession(replacement);
      return replacement as ChildSession;
    } catch {
      // A lost response may have consumed the credential. Require PIN login, never replay it.
      if (readChildSession()?.refresh_token === key) clearChildSession();
      throw new LearningError("NO_CHILD_SESSION", false);
    } finally {
      pending.delete(key);
    }
  })();
  pending.set(key, refresh);
  return refresh;
}
