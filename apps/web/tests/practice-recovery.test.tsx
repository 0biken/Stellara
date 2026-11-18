import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { PracticeScreen } from "../components/child/practice-screen";
import { answerFor, saveDraft, startPractice, type PracticeState } from "../lib/learning/session";

import type { LearningApi, StartedSet, SubmitOutcome } from "../lib/learning/types";
const { getApi } = vi.hoisted(() => ({ getApi: vi.fn() }));
vi.mock("../lib/learning", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getLearningApi: getApi,
}));
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams("topic=t") }));
const set: StartedSet = {
  set_id: "s",
  kind: "practice",
  items: [1, 2].map((n) => ({
    id: `i${n}`,
    version: 1,
    type: "single_choice",
    stem: `Question ${n}`,
    options: [
      { id: "a", text: "Answer A" },
      { id: "b", text: "Answer B" },
    ],
  })) as StartedSet["items"],
};
let api: LearningApi;
const result = (ids: string[]): SubmitOutcome => ({
  results: ids.map((client_id) => ({
    client_id,
    is_correct: true,
    scored: true,
    explanation_html: "Why",
    stardust: 5,
  })),
  mastery_changes: [],
  stardust_today: 10,
  run_length: 1,
});
function pendingDraft(): PracticeState {
  const s = startPractice(set, { id: "t", title: "Topic" }, 0);
  s.selected = { choice: "a" };
  s.pending = [answerFor(s, "old-id", 3000)!];
  s.phase = "saved";
  return s;
}
beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  api = {
    mode: "supabase",
    getChild: vi.fn(async () => ({ id: "c", first_name: "Ada" })),
    getSky: vi.fn(async () => ({
      topics: [],
      links: [],
      today: null,
      first_visit: false,
      placement_done: false,
    })),
    startSet: vi.fn(async () => set),
    submit: vi.fn(async ({ responses }: Parameters<LearningApi["submit"]>[0]) =>
      result(responses.map((r) => r.client_id)),
    ),
    getLesson: vi.fn(),
    checkLessonAnswer: vi.fn(),
    placementStrands: vi.fn(),
  };
  getApi.mockResolvedValue(api);
});
afterEach(cleanup);
it("drains a completed offline draft before replacing it with a new set", async () => {
  const s = pendingDraft();
  s.phase = "done";
  s.index = 2;
  saveDraft("c", "practice.t", s);
  render(<PracticeScreen />);
  await waitFor(() => expect(api.submit).toHaveBeenCalledTimes(1));
  expect(api.startSet).not.toHaveBeenCalled();
  expect(vi.mocked(api.submit).mock.calls[0]![0].responses[0]!.client_id).toBe("old-id");
  await waitFor(() => expect(localStorage.getItem("stellara.draft.c.practice.t")).toBeNull());
});
it("queues Check during a slow background flush and awards each answer once", async () => {
  let finish!: (outcome: SubmitOutcome) => void;
  vi.mocked(api.submit).mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  saveDraft("c", "practice.t", pendingDraft());
  render(<PracticeScreen />);
  await waitFor(() => expect(api.submit).toHaveBeenCalledTimes(1));
  fireEvent.click(screen.getByRole("button", { name: "Next question" }));
  fireEvent.click(screen.getByRole("button", { name: "Answer A" }));
  fireEvent.click(screen.getByRole("button", { name: "Check" }));
  await act(async () => finish(result(["old-id"])));
  await waitFor(() => expect(api.submit).toHaveBeenCalledTimes(2));
  const second = vi.mocked(api.submit).mock.calls[1]![0].responses;
  expect(second).toHaveLength(1);
  expect(second[0]!.client_id).not.toBe("old-id");
  await screen.findByRole("button", { name: "Next question" });
  fireEvent.click(screen.getByRole("button", { name: "Next question" }));
  expect(await screen.findByText(/earned 10 Stardust/)).toBeTruthy();
});
