import type { AuthAdapter, Session } from "./types";

export const previewStorageKey = "stellara.previewSession";

export const previewSession: Session = {
  userId: "preview-guardian",
  displayName: "Preview parent",
  roles: ["guardian"],
};

function read(storage: Storage | undefined): Session | null {
  try {
    const raw = storage?.getItem(previewStorageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Session>;
    return typeof parsed.userId === "string" ? { ...previewSession, ...parsed } : null;
  } catch {
    return null;
  }
}

function write(storage: Storage | undefined, session: Session | null) {
  try {
    if (session) storage?.setItem(previewStorageKey, JSON.stringify(session));
    else storage?.removeItem(previewStorageKey);
  } catch {
    // Private windows can block storage; the session then lasts for this page only.
  }
}

/**
 * Used until Supabase is provisioned (TASKLIST 2.4). Nothing leaves the browser:
 * no account is created and no email is sent.
 */
export function createPreviewAdapter(
  storage: Storage | undefined = typeof window === "undefined" ? undefined : window.localStorage,
): AuthAdapter {
  const listeners = new Set<(session: Session | null) => void>();
  let memory: Session | null = read(storage);
  const set = (session: Session | null) => {
    memory = session;
    write(storage, session);
    for (const listener of listeners) listener(session);
  };

  return {
    mode: "preview",
    async getSession() {
      return read(storage) ?? memory;
    },
    onChange(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    async signInWithGoogle() {
      set(previewSession);
      return { status: "signed-in", session: previewSession };
    },
    async signInWithEmail() {
      return { status: "email-sent" };
    },
    async signOut() {
      set(null);
    },
  };
}
