"use client";

import { formatMessage as m } from "@stellara/i18n";
import { Button, LessonCards, buttonClasses, type LessonCardView } from "@stellara/ui";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import {
  LearningError,
  type ChildResponse,
  type LearningApi,
  type LessonData,
} from "../../lib/learning";

import { ChildFrame, Loading, Problem } from "./child-frame";
import { QuestionView, type QuestionPhase } from "./question-view";
import { auntie } from "./use-child";

import type { ClientItem } from "@stellara/content-schema/client";

/** A lesson "check" card: unscored, with plain feedback and the explanation. */
function LessonCheck({ api, item }: { api: LearningApi; item: ClientItem }) {
  const [selected, setSelected] = useState<ChildResponse | null>(null);
  const [phase, setPhase] = useState<QuestionPhase>("answer");
  const [explanation, setExplanation] = useState("");
  const check = async () => {
    if (!selected) return;
    setPhase("checking");
    try {
      const result = await api.checkLessonAnswer(item.id, selected);
      setExplanation(result.explanation_html);
      setPhase(result.is_correct ? "correct" : "worked");
    } catch {
      setPhase("answer");
    }
  };
  return (
    <div className="flex flex-col gap-3">
      <p className="m-0 font-heading text-[20px] leading-7 font-bold">{item.stem}</p>
      <QuestionView
        item={item}
        phase={phase}
        selected={selected}
        missed={null}
        onSelect={(r) => phase === "answer" && setSelected(r)}
        onSubmit={() => void check()}
      />
      <div aria-live="polite">
        {(phase === "correct" || phase === "worked") && (
          <p className="m-0 text-[17px] leading-7">
            <strong>{phase === "correct" ? m("answer.correct") : m("answer.notQuiteShort")}</strong>{" "}
            {explanation}
          </p>
        )}
      </div>
      {(phase === "answer" || phase === "checking") && (
        <Button
          variant="quiet"
          size="child"
          disabled={!selected}
          loading={phase === "checking"}
          loadingLabel={m("practice.checking")}
          onClick={() => void check()}
        >
          {m("practice.check")}
        </Button>
      )}
    </div>
  );
}

function Learn({ api }: { api: LearningApi }) {
  const topicId = useSearchParams().get("topic") ?? "";
  const router = useRouter();
  const [lesson, setLesson] = useState<LessonData | null>(null);
  const [failed, setFailed] = useState<"load" | "empty" | null>(null);

  const load = useCallback(() => {
    api
      .getLesson(topicId)
      .then(setLesson, (error) =>
        setFailed(
          error instanceof LearningError &&
            (error.code === "NO_ITEMS_AVAILABLE" || error.code === "NOT_AVAILABLE")
            ? "empty"
            : "load",
        ),
      );
  }, [api, topicId]);
  useEffect(load, [load]);

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
          load();
        }}
      />
    );
  if (!lesson) return <Loading />;

  const cards: LessonCardView[] = lesson.cards.map((card) =>
    card.kind === "check"
      ? { kind: "check", content: <LessonCheck key={card.item.id} api={api} item={card.item} /> }
      : card,
  );
  return (
    <>
      <h1 className="m-0 font-heading text-[28px] leading-9 font-extrabold">{lesson.title}</h1>
      <LessonCards
        cards={cards}
        labels={{
          cards: m("learn.cards"),
          progress: (current, total) => m("progress.count", { current, total }),
          worked: m("learn.workedTitle"),
          summary: m("learn.summaryTitle"),
          check: m("learn.checkTitle"),
          next: m("common.next"),
          back: m("common.back"),
          done: m("learn.start"),
        }}
        onDone={() => router.push(`/practice/?topic=${topicId}`)}
      />
    </>
  );
}

export function LearnScreen() {
  return <ChildFrame>{({ api }) => <Learn api={api} />}</ChildFrame>;
}
