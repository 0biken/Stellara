"use client";

import { formatMessage as m } from "@stellara/i18n";
import {
  Button,
  HintCard,
  ProgressBar,
  QuestionCard,
  StardustChip,
  StarGrow,
  WorkedAnswer,
  buttonClasses,
  type StarLevel,
} from "@stellara/ui";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";

import {
  LearningError,
  type ChildProfile,
  type LearningApi,
  type SubmittedAnswer,
} from "../../lib/learning";
import {
  answerFor,
  clearDraft,
  correctLine,
  loadDraft,
  practiceReducer,
  saveDraft,
  startPractice,
  type PracticeEvent,
  type PracticeState,
} from "../../lib/learning/session";

import { ChildFrame, Loading, OfflineNotice, Problem } from "./child-frame";
import { QuestionView } from "./question-view";
import { auntie, newClientId } from "./use-child";

type Holder = { state: PracticeState | null };
function reducer(holder: Holder, event: PracticeEvent | { type: "load"; state: PracticeState }) {
  if (event.type === "load") return { state: event.state };
  return holder.state ? { state: practiceReducer(holder.state, event) } : holder;
}

function SetDone({ state, startLevel }: { state: PracticeState; startLevel: StarLevel }) {
  const change = state.levelChange;
  const to = change?.to ?? startLevel;
  const from = change ? change.from : startLevel;
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => heading.current?.focus(), []);
  return (
    <section className="flex flex-col items-center gap-5 py-6 text-center">
      <StarGrow
        from={from}
        to={to}
        label={m("star.label", { topic: state.topicTitle, state: m(`star.${to}`) })}
      />
      {change && (
        <p className="m-0 font-heading text-[24px] leading-8 font-extrabold">
          {to === "mastered"
            ? m("setDone.sprouted", { topic: state.topicTitle })
            : m("setDone.grew", { topic: state.topicTitle })}
        </p>
      )}
      <h1
        ref={heading}
        tabIndex={-1}
        className="m-0 max-w-sm text-[18px] leading-7 font-normal outline-none"
      >
        {m("setDone.summary", {
          correct: state.firstTryCorrect,
          total: state.set.items.length,
          stardust: state.stardust,
        })}
      </h1>
      <StardustChip text={m("stardust.amount", { amount: state.stardust })} />
      {state.stardustToday >= 200 && (
        <p className="m-0 max-w-sm text-[15px] text-muted">{m("setDone.cap")}</p>
      )}
      {state.pending.length > 0 && (
        <p className="m-0 max-w-sm text-[15px] text-muted">{m("setDone.pending")}</p>
      )}
      <Link href="/sky/" className={buttonClasses("primary", "child", "w-full")}>
        {m("practice.leave")}
      </Link>
    </section>
  );
}

function Practice({ api, child }: { api: LearningApi; child: ChildProfile }) {
  const topicId = useSearchParams().get("topic") ?? "";
  const slot = `practice.${topicId}`;
  const [{ state }, dispatch] = useReducer(reducer, { state: null });
  const [failed, setFailed] = useState<"load" | "empty" | null>(null);
  const [startLevel, setStartLevel] = useState<StarLevel>("not_assessed");
  const questionRef = useRef<HTMLDivElement>(null);
  const sending = useRef(false);

  const begin = useCallback(async () => {
    const sky = await api.getSky().catch(() => null);
    const topic = sky?.topics.find((t) => t.id === topicId);
    if (topic) setStartLevel(topic.level);
    const draft = loadDraft<PracticeState>(child.id, slot);
    if (draft && draft.phase !== "done") {
      dispatch({ type: "load", state: { ...draft, questionShownAt: Date.now() } });
      return;
    }
    try {
      const set = await api.startSet({ kind: "practice", topic_ids: [topicId] });
      dispatch({
        type: "load",
        state: startPractice(set, { id: topicId, title: topic?.title ?? "" }, Date.now()),
      });
    } catch (error) {
      setFailed(
        error instanceof LearningError && error.code === "NO_ITEMS_AVAILABLE" ? "empty" : "load",
      );
    }
  }, [api, child.id, slot, topicId]);

  useEffect(() => {
    // Every state update in begin() happens after its first await.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void begin();
  }, [begin]);

  // Save before every network call and after every change (09 §3 rule 3).
  useEffect(() => {
    if (!state) return;
    if (state.phase === "done" && state.pending.length === 0) clearDraft(child.id, slot);
    else saveDraft(child.id, slot, state);
  }, [state, child.id, slot]);

  const send = useCallback(
    async (answers: SubmittedAnswer[], current?: string) => {
      if (answers.length === 0 || sending.current) return;
      sending.current = true;
      try {
        const outcome = await api.submit({
          responses: answers,
          device_clock: new Date().toISOString(),
        });
        const mine = outcome.results.find((r) => r.client_id === current);
        const others = answers.map((a) => a.client_id).filter((id) => id !== current);
        if (others.length)
          dispatch({
            type: "synced",
            clientIds: others,
            outcome: {
              ...outcome,
              results: outcome.results.filter((r) => r.client_id !== current),
            },
          });
        if (mine) dispatch({ type: "result", result: mine, outcome: { ...outcome, results: [] } });
      } catch (error) {
        if (current) dispatch({ type: "offline" });
        if (!(error instanceof LearningError && error.retryable)) throw error;
      } finally {
        sending.current = false;
      }
    },
    [api],
  );

  // Back online: send anything saved on this phone.
  useEffect(() => {
    const flush = () => {
      if (state?.pending.length && state.phase !== "checking")
        void send(state.pending).catch(() => {});
    };
    window.addEventListener("online", flush);
    return () => window.removeEventListener("online", flush);
  }, [state, send]);

  const index = state?.index;
  useEffect(() => {
    if (index !== undefined && index > 0) questionRef.current?.focus();
  }, [index]);

  if (failed === "empty")
    return (
      <section className="flex flex-col items-center gap-5 py-12 text-center">
        <img src={auntie("listening")} alt="" width={96} height={96} className="st-illustration" />
        <p className="m-0">{m("learn.notYet")}</p>
        <Link href="/sky/" className={buttonClasses("quiet", "child")}>
          {m("practice.leave")}
        </Link>
      </section>
    );
  if (failed)
    return (
      <Problem
        onRetry={() => {
          setFailed(null);
          void begin();
        }}
      />
    );
  if (!state) return <Loading />;
  if (state.phase === "done") return <SetDone state={state} startLevel={startLevel} />;

  const item = state.set.items[state.index]!;
  const total = state.set.items.length;
  const check = () => {
    const answer = answerFor(state, newClientId(), Date.now());
    if (!answer) return;
    dispatch({ type: "check", answer });
    void send([...state.pending, answer], answer.client_id).catch(() => setFailed("load"));
  };
  const next = () => dispatch({ type: "next", at: Date.now() });
  const line = correctLine(state);

  return (
    <>
      <OfflineNotice pending={state.pending.length} />
      <ProgressBar
        value={state.index + (["answer", "notQuite", "checking"].includes(state.phase) ? 0 : 1)}
        max={total}
        label={m("practice.progress")}
        valueText={m("progress.count", { current: state.index + 1, total })}
        tone="success"
      />
      <div ref={questionRef} tabIndex={-1} className="outline-none" key={item.id}>
        <QuestionCard
          header={m("practice.header", {
            topic: state.topicTitle,
            current: state.index + 1,
            total,
          })}
          stem={item.stem}
        >
          <QuestionView
            item={item}
            phase={state.phase}
            selected={state.selected}
            missed={state.missed}
            onSelect={(response) => dispatch({ type: "select", response })}
            onSubmit={check}
          />
        </QuestionCard>
      </div>

      <div aria-live="polite" className="flex flex-col gap-4">
        {state.phase === "checking" && <span className="sr-only">{m("practice.checking")}</span>}
        {state.phase === "correct" && (
          <p className="m-0 font-heading text-[22px] font-extrabold text-success-ink">
            {line.key === "practice.inARow" ? m(line.key, { count: line.count }) : m(line.key)}
          </p>
        )}
        {state.phase === "notQuite" && (
          <>
            <p className="m-0 font-heading text-[22px] font-extrabold">{m("answer.notQuite")}</p>
            {state.hint && (
              <HintCard
                avatarSrc={auntie("avatar-round")}
                title={m("hint.reveal")}
                onReveal={() => dispatch({ type: "hint" })}
              >
                {state.hint}
              </HintCard>
            )}
          </>
        )}
        {state.phase === "saved" && <p className="m-0">{m("practice.saved")}</p>}
        {state.phase === "worked" && (
          <WorkedAnswer
            title={m("explanation.title")}
            actionLabel={m("explanation.next")}
            onAction={next}
          >
            {state.explanation}
          </WorkedAnswer>
        )}
      </div>

      <div className="sticky bottom-0 -mx-5 bg-bg/95 px-5 pt-2 pb-5">
        {(state.phase === "answer" || state.phase === "notQuite" || state.phase === "checking") && (
          <Button
            size="child"
            block
            disabled={!state.selected}
            loading={state.phase === "checking"}
            loadingLabel={m("practice.checking")}
            onClick={check}
          >
            {m("practice.check")}
          </Button>
        )}
        {(state.phase === "correct" || state.phase === "saved") && (
          <Button size="child" block onClick={next}>
            {m("practice.next")}
          </Button>
        )}
      </div>
    </>
  );
}

export function PracticeScreen() {
  return <ChildFrame>{(ctx) => <Practice {...ctx} />}</ChildFrame>;
}
