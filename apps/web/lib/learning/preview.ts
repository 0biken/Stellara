import {
  ITEMS,
  KEYS,
  LESSONS,
  SKY_LINKS,
  SKY_TOPICS,
  STRANDS_BY_YEAR,
  TOPICS,
} from "./preview-content";
import {
  LearningError,
  type AnswerResult,
  type ChildProfile,
  type ChildResponse,
  type LearningApi,
  type SetKind,
  type SubmitOutcome,
} from "./types";

import type { PlacementTone, StarLevel } from "@stellara/ui";

/**
 * Preview mode: a small learning engine in the browser so the child screens can
 * be tried before the backend exists. It follows the published rules closely
 * enough to demo (02 §2, §3.1 Levels 1–3, §6), but it is not the scoring
 * authority: real scoring is `@stellara/runtime` on the server.
 */

const LEVELS: StarLevel[] = [
  "not_assessed",
  "foundation",
  "developing",
  "proficient",
  "advanced",
  "mastered",
];
const DAY = 86_400_000;
const STORE_KEY = "stellara.preview.learning";
const CHILD_KEY = "stellara.preview.child";

interface Evidence {
  correct: boolean;
  set: string;
  day: string;
  hardish: boolean;
}
interface PreviewState {
  placementDone: boolean;
  completedPlacementSetId?: string;
  placementBySetId?: Record<string, { strand_id: string; label: PlacementTone }[]>;
  seen: Record<string, number>;
  evidence: Record<string, Evidence[]>;
  levels: Record<string, number>;
  highwater: Record<string, number>;
  stardustByDay: Record<string, number>;
  sets: Record<string, { kind: SetKind; items: string[]; finished_at?: number | null }>;
  results: Record<string, AnswerResult & { item_id: string; set_id: string }>;
}

const empty = (): PreviewState => ({
  placementDone: false,
  placementBySetId: {},
  seen: {},
  evidence: {},
  levels: {},
  highwater: {},
  stardustByDay: {},
  sets: {},
  results: {},
});

function read<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
function write(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* Storage can be unavailable (private mode); the demo then forgets on reload. */
  }
}

const today = (at: number) => new Date(at).toISOString().slice(0, 10);
const uuid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `00000000-0000-4000-8000-${Math.floor(Math.random() * 2 ** 48)
        .toString(16)
        .padStart(12, "0")}`;

/** 02 §3.1, Levels 1–3. Levels 4–5 need retention checks, which the preview does not run. */
function levelFor(evidence: Evidence[], prior: number): number {
  let level = prior;
  const last = evidence.slice(-10);
  if (evidence.length >= 4) level = Math.max(level, 1);
  if (evidence.length >= 6 && last.filter((e) => e.correct).length >= 5) level = Math.max(level, 2);
  const right = last.filter((e) => e.correct);
  if (
    evidence.length >= 10 &&
    right.length >= 8 &&
    right.filter((e) => e.hardish).length >= 6 &&
    new Set(last.map((e) => e.set)).size >= 2 &&
    new Set(last.map((e) => e.day)).size >= 2
  )
    level = Math.max(level, 3);
  return level;
}

function mark(itemId: string, response: ChildResponse): boolean {
  const key = KEYS.get(itemId);
  if (!key) throw new LearningError("SET_CLOSED", false);
  if ("choice" in response) return response.choice === key.correct;
  if ("value" in response) {
    const text = String(response.value).replace(/[\s,]/g, "");
    return /^[+-]?(\d+\.?\d*|\.\d+)$/.test(text) && Number(text) === Number(key.correct);
  }
  return false;
}

function strandLabel(correct: number, answered: number): PlacementTone {
  if (answered >= 4 && correct / answered >= 0.75) return "looks_secure_so_far";
  if (answered > 0 && correct / answered < 0.5) return "check_this";
  return "not_yet_measured_enough";
}

export interface PreviewOptions {
  /** Simulated server time, so the "checking" state is visible. */
  latencyMs?: number;
  now?: () => number;
  random?: () => number;
}

export function createPreviewLearningApi(options: PreviewOptions = {}): LearningApi {
  const latency = options.latencyMs ?? 350;
  const now = options.now ?? (() => Date.now());
  const random = options.random ?? Math.random;
  const wait = <T>(value: T, ms = latency) =>
    new Promise<T>((resolve) => setTimeout(() => resolve(value), ms));

  const child = () => read<ChildProfile>(CHILD_KEY);
  const storeKey = () => `${STORE_KEY}.${child()?.id ?? "none"}`;
  const load = () => ({ ...empty(), ...read<PreviewState>(storeKey()) });
  const requireChild = () => {
    if (!child()) throw new LearningError("NO_CHILD_SESSION", false);
  };
  const shuffle = <T>(values: T[]) => {
    const out = [...values];
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [out[i], out[j]] = [out[j]!, out[i]!];
    }
    return out;
  };

  return {
    mode: "preview",

    async startPreviewChild(override?: Partial<ChildProfile>) {
      const profile: ChildProfile = { id: uuid(), first_name: "Tolu", year: "P5", ...override };
      write(CHILD_KEY, profile);
      return profile;
    },

    async getChild() {
      return child();
    },

    async getSky() {
      requireChild();
      const state = load();
      const topics = SKY_TOPICS.map((t) => ({
        ...t,
        level: LEVELS[state.levels[t.id] ?? 0]!,
        has_lesson: Boolean(LESSONS[t.id]),
      }));
      const practisable = topics.filter((t) => ITEMS.some((i) => i.topic_id === t.id));
      const next = [...practisable].sort(
        (a, b) => LEVELS.indexOf(a.level) - LEVELS.indexOf(b.level),
      )[0];
      const sky = {
        topics,
        links: SKY_LINKS,
        today: next
          ? { topic_id: next.id, topic_title: next.title, questions: 10, minutes: 10 }
          : null,
        first_visit: Object.keys(state.sets).length === 0,
        placement_done: state.placementDone,
      };
      return wait(sky, latency / 3);
    },

    async getLesson(topicId) {
      requireChild();
      const lesson = LESSONS[topicId];
      if (!lesson) throw new LearningError("NO_ITEMS_AVAILABLE", false);
      return wait({ topic_id: topicId, ...lesson }, latency / 3);
    },

    async checkLessonAnswer(itemId, response) {
      const is_correct = mark(itemId, response);
      return wait({ is_correct, explanation_html: KEYS.get(itemId)!.explanation });
    },

    async placementStrands() {
      const currentChild = child();
      const year = currentChild?.year ?? "P5";
      const list = STRANDS_BY_YEAR[year] ?? STRANDS_BY_YEAR.P5;
      return list.map(({ id, name }) => ({ id, name }));
    },

    async placementConfig() {
      requireChild();
      const currentChild = child()!;
      const year = currentChild.year ?? "P5";
      const strands = (STRANDS_BY_YEAR[year] ?? STRANDS_BY_YEAR.P5).map(({ id, name }) => ({
        id,
        name,
      }));
      const state = load();
      const completed = Boolean(state.placementDone && state.completedPlacementSetId);
      return wait(
        {
          year,
          strands,
          total_questions: 20,
          available: !completed,
          completed,
          ...(state.completedPlacementSetId
            ? { completed_set_id: state.completedPlacementSetId }
            : {}),
        },
        latency / 3,
      );
    },

    async getOwnedSet(setId: string) {
      requireChild();
      const state = load();
      const set = state.sets[setId];
      if (!set) throw new LearningError("NOT_AVAILABLE", false);
      const items = set.items.map((id) => ITEMS.find((i) => i.id === id)!).filter(Boolean);
      const placement = state.placementBySetId?.[setId] ?? null;
      return wait(
        {
          set_id: setId,
          kind: set.kind,
          finished_at: set.finished_at ?? (state.placementDone ? now() : null),
          completed: Boolean(set.finished_at || (set.kind === "placement" && state.placementDone)),
          total_items: items.length,
          items,
          placement,
        },
        latency / 3,
      );
    },

    async startSet({ kind, topic_ids }) {
      requireChild();
      const state = load();
      const at = now();
      const fresh = (itemId: string) => !(at - (state.seen[itemId] ?? -Infinity) < 30 * DAY);
      const pick = (topic: string, count: number, purpose?: "placement" | "practice") => {
        const pool = ITEMS.filter((i) => {
          if (i.topic_id !== topic) return false;
          if (purpose === "placement") return i.purpose === "placement";
          return i.purpose !== "placement" && i.purpose !== "lesson_check";
        });
        return [
          ...shuffle(pool.filter((i) => fresh(i.id))),
          ...shuffle(pool.filter((i) => !fresh(i.id))),
        ].slice(0, count);
      };
      let items;
      if (kind === "placement") {
        const currentChild = child();
        const year = currentChild?.year ?? "P5";
        const strands = STRANDS_BY_YEAR[year] ?? STRANDS_BY_YEAR.P5;
        const groups = strands.map((s) => pick(s.topic, 10, "placement"));
        items = groups[0]!.flatMap((item, i) => [item, groups[1]![i]!]).filter(Boolean);
      } else {
        const topic = topic_ids[0] ?? TOPICS.fractions;
        items = pick(topic, 10, "practice");
      }
      if (items.length === 0) throw new LearningError("NO_ITEMS_AVAILABLE", false);
      const set_id = uuid();
      write(storeKey(), {
        ...state,
        sets: { ...state.sets, [set_id]: { kind, items: items.map((i) => i.id) } },
      });
      return wait({ set_id, kind, items }, latency / 2);
    },

    async submit({ responses }) {
      requireChild();
      const state = load();
      const at = now();
      const day = today(at);
      const results: AnswerResult[] = [];
      const before = { ...state.levels };
      const touchedSets = new Set<string>();
      for (const r of responses) {
        const stored = state.results[r.client_id];
        if (stored) {
          const { client_id, is_correct, scored, explanation_html, hint_html, stardust } = stored;
          results.push({
            client_id,
            is_correct,
            scored,
            explanation_html,
            stardust,
            ...(hint_html ? { hint_html } : {}),
          });
          continue;
        }
        const set = state.sets[r.set_id];
        if (!set || !set.items.includes(r.item_id)) throw new LearningError("SET_CLOSED", false);
        const item = ITEMS.find((i) => i.id === r.item_id)!;
        const key = KEYS.get(r.item_id)!;
        const is_correct = mark(r.item_id, r.response);
        const seenRecently = at - (state.seen[r.item_id] ?? -Infinity) < 30 * DAY;
        const quick = item.tags.includes("quick");
        const scored = !seenRecently && !r.hint_shown && r.response_ms >= (quick ? 1500 : 2500);
        state.seen[r.item_id] = at;
        let stardust = 0;
        if (set.kind !== "placement" && scored) {
          const evidence = [
            ...(state.evidence[item.topic_id] ?? []),
            { correct: is_correct, set: r.set_id, day, hardish: item.difficulty !== "easy" },
          ];
          state.evidence[item.topic_id] = evidence;
          state.levels[item.topic_id] = levelFor(evidence, state.levels[item.topic_id] ?? 0);
        }
        if (scored && is_correct) stardust = 10;
        const used = state.stardustByDay[day] ?? 0;
        stardust = Math.min(stardust, Math.max(0, 200 - used));
        state.stardustByDay[day] = used + stardust;
        const result: AnswerResult = {
          client_id: r.client_id,
          is_correct,
          scored,
          explanation_html: key.explanation,
          ...(is_correct ? {} : { hint_html: key.hint }),
          stardust,
        };
        state.results[r.client_id] = { ...result, item_id: r.item_id, set_id: r.set_id };
        touchedSets.add(r.set_id);
        results.push(result);
      }
      const mastery_changes: SubmitOutcome["mastery_changes"] = [];
      for (const [topic, level] of Object.entries(state.levels)) {
        const from = before[topic] ?? 0;
        if (level === from) continue;
        mastery_changes.push({ topic_id: topic, from: LEVELS[from]!, to: LEVELS[level]! });
        if (level > (state.highwater[topic] ?? 0)) {
          const used = state.stardustByDay[day] ?? 0;
          state.stardustByDay[day] = used + Math.min(25, Math.max(0, 200 - used));
          state.highwater[topic] = level;
        }
      }
      let placement: SubmitOutcome["placement"];
      for (const setId of touchedSets) {
        const set = state.sets[setId]!;
        const answered = Object.values(state.results).filter((x) => x.set_id === setId);
        if (
          set.kind !== "placement" ||
          !set.items.every((i) => answered.some((a) => a.item_id === i))
        )
          continue;
        state.placementDone = true;
        const currentChild = child();
        const year = currentChild?.year ?? "P5";
        const strands = STRANDS_BY_YEAR[year] ?? STRANDS_BY_YEAR.P5;
        placement = strands.map((strand) => {
          const mine = answered.filter(
            (a, index, all) =>
              ITEMS.find((i) => i.id === a.item_id)?.topic_id === strand.topic &&
              all.findIndex((b) => b.item_id === a.item_id) === index,
          );
          return {
            strand_id: strand.id,
            label: strandLabel(mine.filter((a) => a.is_correct).length, mine.length),
          };
        });
        state.completedPlacementSetId = setId;
        if (!state.placementBySetId) state.placementBySetId = {};
        state.placementBySetId[setId] = placement;
        if (state.sets[setId]) {
          state.sets[setId].finished_at = at;
        }
      }
      write(storeKey(), state);
      return wait({
        results,
        mastery_changes,
        stardust_today: state.stardustByDay[day] ?? 0,
        run_length: 0,
        ...(placement ? { placement } : {}),
      });
    },
  };
}
