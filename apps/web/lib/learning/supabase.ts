import { LearningError, type ChildProfile, type LearningApi, type SubmitOutcome } from "./types";

/**
 * Live adapter: calls the Edge Functions in docs/md/06 §2 with the child session
 * token from `child-session` (TASKLIST 2.5). The sky, lesson and strand reads
 * wait for their 2A views, so they report NOT_AVAILABLE until then.
 */
export const CHILD_SESSION_KEY = "stellara.childSession";

interface StoredChildSession {
  token: string;
  child: ChildProfile;
}

export function createSupabaseLearningApi(options: {
  url: string;
  publishableKey: string;
  fetch?: typeof fetch;
  session?: () => StoredChildSession | null;
}): LearningApi {
  const doFetch = options.fetch ?? ((...args: Parameters<typeof fetch>) => fetch(...args));
  const session =
    options.session ??
    (() => {
      try {
        const raw = window.sessionStorage.getItem(CHILD_SESSION_KEY);
        return raw ? (JSON.parse(raw) as StoredChildSession) : null;
      } catch {
        return null;
      }
    });

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

  const notYet = async (): Promise<never> => {
    throw new LearningError("NOT_AVAILABLE", false);
  };

  return {
    mode: "supabase",
    async getChild() {
      return session()?.child ?? null;
    },
    getSky: notYet,
    getLesson: notYet,
    checkLessonAnswer: notYet,
    placementStrands: notYet,
    startSet: (request) => invoke("set-start", { ...request, assignment_id: null }),
    submit: (request) => invoke<SubmitOutcome>("responses-submit", request),
  };
}
