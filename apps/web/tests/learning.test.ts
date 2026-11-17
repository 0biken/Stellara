import { beforeEach, describe, expect, it, vi } from "vitest";

import { LearningError, type StartedSet, type SubmittedAnswer } from "../lib/learning";
import { createPreviewLearningApi } from "../lib/learning/preview";
import { KEYS } from "../lib/learning/preview-content";
import {
  answerFor,
  clearDraft,
  correctLine,
  loadDraft,
  practiceReducer,
  saveDraft,
  startPractice,
} from "../lib/learning/session";
import { createSupabaseLearningApi } from "../lib/learning/supabase";

const set: StartedSet = {
  set_id: "set-1",
  kind: "practice",
  items: [
    {
      id: "item-1",
      version: 1,
      type: "single_choice",
      stem: "Pick one",
      options: [
        { id: "a", text: "A" },
        { id: "b", text: "B" },
      ],
    },
    {
      id: "item-2",
      version: 1,
      type: "single_choice",
      stem: "Pick again",
      options: [
        { id: "a", text: "A" },
        { id: "b", text: "B" },
      ],
    },
  ] as unknown as StartedSet["items"],
};
const outcome = { results: [], mastery_changes: [], stardust_today: 0, run_length: 0 };

describe("practice session", () => {
  it("goes answer → checking → not quite with a hint → checking → worked answer → next", () => {
    let s = startPractice(set, { id: "t", title: "Fractions" }, 0);
    s = practiceReducer(s, { type: "select", response: { choice: "a" } });
    const first = answerFor(s, "c1", 4000)!;
    expect(first.response_ms).toBe(4000);
    s = practiceReducer(s, { type: "check", answer: first });
    expect(s.phase).toBe("checking");
    expect(s.pending).toHaveLength(1);

    s = practiceReducer(s, {
      type: "result",
      result: {
        client_id: "c1",
        is_correct: false,
        scored: true,
        explanation_html: "Why",
        hint_html: "Try B",
        stardust: 0,
      },
      outcome,
    });
    expect(s).toMatchObject({
      phase: "notQuite",
      hint: "Try B",
      missed: { choice: "a" },
      selected: null,
      pending: [],
    });

    s = practiceReducer(s, { type: "hint" });
    s = practiceReducer(s, { type: "select", response: { choice: "a" } });
    const second = answerFor(s, "c2", 6000)!;
    expect(second.hint_shown).toBe(true);
    s = practiceReducer(s, { type: "check", answer: second });
    s = practiceReducer(s, {
      type: "result",
      result: {
        client_id: "c2",
        is_correct: false,
        scored: false,
        explanation_html: "Why",
        stardust: 0,
      },
      outcome,
    });
    expect(s.phase).toBe("worked");
    expect(s.explanation).toBe("Why");

    s = practiceReducer(s, { type: "next", at: 7000 });
    expect(s).toMatchObject({
      index: 1,
      phase: "answer",
      attempt: 1,
      missed: null,
      hintShown: false,
    });
  });

  it("keeps an answer saved when offline and finishes the set", () => {
    let s = startPractice(set, { id: "t", title: "Fractions" }, 0);
    s = practiceReducer(s, { type: "select", response: { choice: "b" } });
    s = practiceReducer(s, { type: "check", answer: answerFor(s, "c1", 3000)! });
    s = practiceReducer(s, { type: "offline" });
    expect(s.phase).toBe("saved");
    expect(s.pending.map((p) => p.client_id)).toEqual(["c1"]);
    s = practiceReducer(s, { type: "next", at: 1 });
    s = practiceReducer(s, { type: "select", response: { choice: "b" } });
    s = practiceReducer(s, { type: "check", answer: answerFor(s, "c2", 3000)! });
    s = practiceReducer(s, {
      type: "synced",
      clientIds: ["c1"],
      outcome: {
        ...outcome,
        results: [
          { client_id: "c1", is_correct: true, scored: true, explanation_html: "", stardust: 10 },
        ],
      },
    });
    expect(s.pending.map((p) => p.client_id)).toEqual(["c2"]);
    expect(s.stardust).toBe(10);
    s = practiceReducer(s, {
      type: "result",
      result: {
        client_id: "c2",
        is_correct: true,
        scored: true,
        explanation_html: "",
        stardust: 10,
      },
      outcome: {
        ...outcome,
        mastery_changes: [{ topic_id: "t", from: "not_assessed", to: "foundation" }],
      },
    });
    expect(s.phase).toBe("correct");
    expect(s.levelChange).toEqual({ from: "not_assessed", to: "foundation" });
    expect(practiceReducer(s, { type: "next", at: 1 }).phase).toBe("done");
  });

  it("counts answers in a row after three", () => {
    const s = startPractice(set, { id: "t", title: "" }, 0);
    expect(correctLine({ ...s, inARow: 2 }).key).not.toBe("practice.inARow");
    expect(correctLine({ ...s, inARow: 4 })).toEqual({ key: "practice.inARow", count: 4 });
  });

  it("saves, loads and clears drafts per child", () => {
    saveDraft("kid", "placement", { index: 3 });
    expect(loadDraft("kid", "placement")).toEqual({ index: 3 });
    expect(loadDraft("other", "placement")).toBeNull();
    clearDraft("kid", "placement");
    expect(loadDraft("kid", "placement")).toBeNull();
  });
});

describe("preview learning api", () => {
  beforeEach(() => window.localStorage.clear());

  const answer = (setId: string, itemId: string, choice: string, id: string): SubmittedAnswer => ({
    client_id: id,
    set_id: setId,
    item_id: itemId,
    item_version: 1,
    response: { choice },
    hint_shown: false,
    response_ms: 5000,
    recorded_at: new Date().toISOString(),
    key_on_device: false,
  });

  it("needs a child", async () => {
    const api = createPreviewLearningApi({ latencyMs: 0 });
    await expect(api.getSky()).rejects.toMatchObject({ code: "NO_CHILD_SESSION" });
  });

  it("marks answers, replays a repeated client id and never sends keys with items", async () => {
    const api = createPreviewLearningApi({ latencyMs: 0 });
    await api.startPreviewChild!();
    const sky = await api.getSky();
    expect(sky.first_visit).toBe(true);
    const started = await api.startSet({ kind: "practice", topic_ids: [sky.today!.topic_id] });
    expect(JSON.stringify(started.items)).not.toMatch(/"correct"|"explanation"|"hint"/);

    const item = started.items.find((i) => i.type === "single_choice")!;
    const key = KEYS.get(item.id)!;
    const wrong =
      item.type === "single_choice" ? item.options.find((o) => o.id !== key.correct)!.id : "";

    const first = await api.submit({
      responses: [answer(started.set_id, item.id, wrong, "x1")],
      device_clock: "",
    });
    expect(first.results[0]).toMatchObject({ is_correct: false, hint_html: key.hint, stardust: 0 });

    const again = await api.submit({
      responses: [answer(started.set_id, item.id, key.correct, "x1")],
      device_clock: "",
    });
    expect(again.results[0]).toEqual(first.results[0]);
    expect((await api.getSky()).first_visit).toBe(false);
  });

  it("gives placement labels once every item is answered", async () => {
    const api = createPreviewLearningApi({ latencyMs: 0 });
    await api.startPreviewChild!();
    const placement = await api.startSet({ kind: "placement", topic_ids: [] });
    expect(placement.items).toHaveLength(20);
    const responses = placement.items.map((item, i) => ({
      ...answer(placement.set_id, item.id, String(KEYS.get(item.id)!.correct), `p${i}`),
      response:
        item.type === "numeric"
          ? { value: String(KEYS.get(item.id)!.correct) }
          : { choice: KEYS.get(item.id)!.correct },
    }));
    const partial = await api.submit({ responses: responses.slice(0, 19), device_clock: "" });
    expect(partial.placement).toBeUndefined();
    const done = await api.submit({ responses: responses.slice(19), device_clock: "" });
    expect(done.placement?.map((p) => p.label)).toEqual([
      "looks_secure_so_far",
      "looks_secure_so_far",
    ]);
    expect((await api.getSky()).placement_done).toBe(true);
  });
});

describe("supabase learning api", () => {
  const session = () => ({ token: "child-jwt", child: { id: "c", first_name: "Ada" } });

  it("sends the child token and maps the error envelope", async () => {
    const fetch = vi.fn(
      async () =>
        new Response(JSON.stringify({ error: { code: "SET_CLOSED", retryable: false } }), {
          status: 409,
        }),
    );
    const api = createSupabaseLearningApi({
      url: "https://x.test",
      publishableKey: "pk",
      fetch,
      session,
    });
    const error = await api.startSet({ kind: "practice", topic_ids: ["t"] }).catch((e) => e);
    expect(error).toBeInstanceOf(LearningError);
    expect(error).toMatchObject({ code: "SET_CLOSED", retryable: false });
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://x.test/functions/v1/set-start");
    expect((init.headers as Record<string, string>).authorization).toBe("Bearer child-jwt");
  });

  it("treats a failed request as a retryable network error", async () => {
    const fetch = vi.fn(async () => {
      throw new TypeError("offline");
    });
    const api = createSupabaseLearningApi({
      url: "https://x.test",
      publishableKey: "pk",
      fetch,
      session,
    });
    const error = await api.submit({ responses: [], device_clock: "" }).catch((e) => e);
    expect(error).toMatchObject({ code: "NETWORK", retryable: true, network: true });
  });

  it("asks for a child session before calling", async () => {
    const api = createSupabaseLearningApi({
      url: "https://x.test",
      publishableKey: "pk",
      session: () => null,
    });
    await expect(api.startSet({ kind: "practice", topic_ids: [] })).rejects.toMatchObject({
      code: "NO_CHILD_SESSION",
    });
  });
});
