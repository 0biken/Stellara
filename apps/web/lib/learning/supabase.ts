import { clearChildSession, getValidChildSession, readChildSession } from "../child-session";

import {
  LearningError,
  type ChildProfile,
  type LearningApi,
  type SkyTopic,
  type StartedSet,
  type SubmitOutcome,
} from "./types";
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
  async function request<T>(path: string, body?: unknown): Promise<T> {
    const current = options.session ? options.session() : await getValidChildSession(options);
    if (!current) throw new LearningError("NO_CHILD_SESSION", false);
    let response: Response;
    try {
      response = await doFetch(`${options.url}/${path}`, {
        method: body === undefined ? "GET" : "POST",
        headers: {
          "content-type": "application/json",
          apikey: options.publishableKey,
          authorization: `Bearer ${current.token}`,
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
    } catch {
      throw new LearningError("NETWORK", true);
    }
    const json = await response.json().catch(() => null);
    if (!response.ok) {
      if (response.status === 401) {
        if (!options.session && readChildSession()?.token === current.token) clearChildSession();
        throw new LearningError("NO_CHILD_SESSION", false);
      }
      throw new LearningError(
        json?.error?.code ?? "SERVER",
        json?.error?.retryable ?? response.status >= 500,
      );
    }
    return json as T;
  }
  const notYet = async (): Promise<never> => {
    throw new LearningError("NOT_AVAILABLE", false);
  };
  return {
    mode: "supabase",
    async getChild() {
      if (options.session) return options.session()?.child ?? null;
      if (!readChildSession()) return null;
      try {
        return (await getValidChildSession(options)).child;
      } catch (error) {
        if (error instanceof LearningError && error.code === "NO_CHILD_SESSION") return null;
        throw error;
      }
    },
    async getSky() {
      const children = await request<{ id: string; year: number }[]>(
        "rest/v1/children?select=id,year",
      );
      const child = children[0];
      if (!child) {
        clearChildSession();
        throw new LearningError("NO_CHILD_SESSION", false);
      }
      const [topics, items, mastery, sets] = await Promise.all([
        request<{ id: string; title: string }[]>(
          `rest/v1/topics?select=id,title&year=eq.${child.year}&order=sort,id`,
        ),
        request<{ id: string; topic_id: string }[]>("rest/v1/items?select=id,topic_id"),
        request<{ topic_id: string; level: number }[]>(
          "rest/v1/mastery_states?select=topic_id,level",
        ),
        request<{ kind: string; finished_at: string | null }[]>(
          "rest/v1/sets?select=kind,finished_at",
        ),
      ]);
      const levels = [
        "not_assessed",
        "foundation",
        "developing",
        "proficient",
        "advanced",
        "mastered",
      ] as const;
      const counts = new Map<string, number>();
      for (const item of items) counts.set(item.topic_id, (counts.get(item.topic_id) ?? 0) + 1);
      const available = topics.filter((t) => (counts.get(t.id) ?? 0) >= 8);
      const stars: SkyTopic[] = available.map((t, i) => ({
        ...t,
        level: levels[mastery.find((m) => m.topic_id === t.id)?.level ?? 0] ?? "not_assessed",
        x: available.length === 1 ? 50 : 15 + (i % 4) * 23,
        y: 25 + Math.floor(i / 4) * 25,
      }));
      const today = available[0];
      return {
        topics: stars,
        links: [],
        today: today
          ? {
              topic_id: today.id,
              topic_title: today.title,
              questions: Math.min(10, counts.get(today.id)!),
              minutes: 5,
            }
          : null,
        first_visit: sets.length === 0,
        placement_done: sets.some((s) => s.kind === "placement" && s.finished_at !== null),
        placement_available: false,
        lessons_available: false,
      };
    },
    getLesson: notYet,
    checkLessonAnswer: notYet,
    placementStrands: notYet,
    async startSet(requestBody) {
      const result = await request<Omit<StartedSet, "kind">>("functions/v1/set-start", {
        ...requestBody,
        assignment_id: null,
      });
      return { ...result, kind: requestBody.kind };
    },
    submit: (body) => request<SubmitOutcome>("functions/v1/responses-submit", body),
  };
}
