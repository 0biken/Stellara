import { StellaraOfflineDB } from "../offline/db";
import { storeDownloadedPack } from "../offline/packs";
import { verifyPack, type SignedPack } from "../offline/verify-pack";

import { LearningError, type ChildProfile, type LearningApi, type SubmitOutcome } from "./types";

/**
 * Live adapter: calls the Edge Functions in docs/md/06 §2 with the child session
 * token from `child-session`.
 */
export const CHILD_SESSION_KEY = "stellara.childSession";

interface StoredChildSession {
  token: string;
  expiresAt?: string;
  child: ChildProfile;
}

export function createSupabaseLearningApi(options: {
  url: string;
  publishableKey: string;
  fetch?: typeof fetch;
  session?: () => StoredChildSession | null;
}): LearningApi {
  const doFetch = options.fetch ?? ((...args: Parameters<typeof fetch>) => fetch(...args));
  const readSession =
    options.session ??
    (() => {
      try {
        const raw = window.sessionStorage.getItem(CHILD_SESSION_KEY);
        return raw ? (JSON.parse(raw) as StoredChildSession) : null;
      } catch {
        return null;
      }
    });
  const session = () => {
    const current = readSession();
    if (current?.expiresAt && !(Date.parse(current.expiresAt) > Date.now())) return null;
    return current;
  };

  async function invoke<T>(name: string, body: unknown): Promise<T> {
    const current = session();
    if (!current) throw new LearningError("NO_CHILD_SESSION", false);
    let response: Response;
    try {
      response = await doFetch(`${options.url}/functions/v1/${name}`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          apikey: options.publishableKey,
          authorization: `Bearer ${current.token}`,
        },
        body: JSON.stringify(body),
      });
    } catch {
      throw new LearningError("NETWORK", true);
    }
    const json = (await response.json().catch(() => null)) as {
      error?: { code?: string; retryable?: boolean };
    } | null;
    if (!response.ok) {
      const code = json?.error?.code ?? "SERVER";
      throw new LearningError(code, json?.error?.retryable ?? response.status >= 500);
    }
    return json as T;
  }

  return {
    mode: "supabase",
    async downloadPack(topicId) {
      const current = session();
      if (!current) throw new LearningError("NO_CHILD_SESSION", false);
      const trustedKey = (process.env.NEXT_PUBLIC_PACK_PUBLIC_KEY ?? "").replaceAll("\\n", "\n");
      if (!trustedKey) throw new LearningError("NOT_AVAILABLE", false);
      const built = await invoke<{ pack_id: string }>("pack-build", { topic_id: topicId });
      const pack = await invoke<SignedPack>("pack-get", { pack_id: built.pack_id });
      const verified = await verifyPack(pack, current.child.id, trustedKey);
      const db = new StellaraOfflineDB();
      try {
        await storeDownloadedPack(db, verified);
      } finally {
        db.close();
      }
      return verified.id;
    },
    async getChild() {
      return session()?.child ?? null;
    },
    getSky: () => invoke("child-sky", {}),
    getLesson: (topicId) => invoke("lesson-get", { topic_id: topicId }),
    checkLessonAnswer: (itemId, response, context) =>
      invoke("lesson-check", {
        item_id: itemId,
        response,
        item_version: context?.version,
        topic_id: context?.topicId,
      }),
    async placementStrands() {
      return (await this.placementConfig()).strands;
    },
    placementConfig: () => invoke("placement-config", {}),
    getOwnedSet: (setId) => invoke("set-get", { set_id: setId }),
    startSet: (request) => invoke("set-start", { ...request, assignment_id: null }),
    submit: (request) => invoke<SubmitOutcome>("responses-submit", request),
  };
}
