"use client";

import { formatMessage as m } from "@stellara/i18n";
import {
  Button,
  PlacementResult,
  ProgressBar,
  QuestionCard,
  buttonClasses,
  type PlacementTone,
} from "@stellara/ui";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  LearningError,
  type ChildProfile,
  type ChildResponse,
  type LearningApi,
  type StartedSet,
  type SubmittedAnswer,
} from "../../lib/learning";
import { clearDraft, loadDraft, saveDraft } from "../../lib/learning/session";

import { ChildFrame, Loading, OfflineNotice, Problem } from "./child-frame";
import { QuestionView } from "./question-view";
import { auntie, newClientId } from "./use-child";

interface PlacementDraft {
  set: StartedSet;
  index: number;
  pending: SubmittedAnswer[];
}
type Strands = { strand_id: string; label: PlacementTone }[];

/**
 * Optional and resumable: 20 questions, no marks shown along the way, then
 * strand-level results only. Never called a test (02 §9).
 */
function Placement({ api, child }: { api: LearningApi; child: ChildProfile }) {
  const [draft, setDraft] = useState<PlacementDraft | null>(null);
  // ChildFrame only mounts this on the client, so the saved copy can be read up front.
  const [saved] = useState(() => loadDraft<PlacementDraft>(child.id, "placement"));
  const [selected, setSelected] = useState<ChildResponse | null>(null);
  const [result, setResult] = useState<Strands | null>(null);
  const [names, setNames] = useState<Record<string, string>>({});
  const [failed, setFailed] = useState(false);
  const shownAt = useRef(0);
  const questionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api
      .placementStrands()
      .then((list) => setNames(Object.fromEntries(list.map((s) => [s.id, s.name]))))
      .catch(() => setNames({}));
  }, [api, child.id]);

  const persist = useCallback(
    (next: PlacementDraft | null) => {
      if (next) saveDraft(child.id, "placement", next);
      else clearDraft(child.id, "placement");
      setDraft(next);
    },
    [child.id],
  );

  const flush = useCallback(
    async (current: PlacementDraft) => {
      if (current.pending.length === 0) return;
      try {
        const outcome = await api.submit({
          responses: current.pending,
          device_clock: new Date().toISOString(),
        });
        const sent = new Set(current.pending.map((p) => p.client_id));
        if (outcome.placement) {
          clearDraft(child.id, "placement");
          setResult(outcome.placement);
          return;
        }
        setDraft((latest) =>
          latest
            ? { ...latest, pending: latest.pending.filter((p) => !sent.has(p.client_id)) }
            : latest,
        );
      } catch (error) {
        if (!(error instanceof LearningError && error.retryable)) setFailed(true);
      }
    },
    [api, child.id],
  );

  // Keep the saved copy current: answers are on this phone before any network call.
  useEffect(() => {
    if (draft && !result) saveDraft(child.id, "placement", draft);
  }, [draft, result, child.id]);

  useEffect(() => {
    const online = () => draft && void flush(draft);
    window.addEventListener("online", online);
    return () => window.removeEventListener("online", online);
  }, [draft, flush]);

  useEffect(() => {
    if (draft && draft.index > 0) questionRef.current?.focus();
  }, [draft?.index]); // eslint-disable-line react-hooks/exhaustive-deps

  const start = async () => {
    if (saved) {
      persist(saved);
      shownAt.current = Date.now();
      void flush(saved);
      return;
    }
    try {
      const set = await api.startSet({ kind: "placement", topic_ids: [] });
      shownAt.current = Date.now();
      persist({ set, index: 0, pending: [] });
    } catch {
      setFailed(true);
    }
  };

  if (failed) return <Problem onRetry={() => setFailed(false)} />;

  if (result)
    return (
      <>
        <PlacementResult
          title={m("placement.resultTitle")}
          body={m("placement.resultBody")}
          strands={result.map((s) => ({
            id: s.strand_id,
            name: names[s.strand_id] ?? s.strand_id,
            tone: s.label,
            label: m(`placement.${s.label}`),
          }))}
        />
        <Link href="/sky/" className={buttonClasses("primary", "child", "w-full")}>
          {m("practice.leave")}
        </Link>
      </>
    );

  if (!draft)
    return (
      <section className="flex flex-col gap-5">
        <img
          src={auntie("smiling")}
          alt=""
          width={120}
          height={120}
          className="st-illustration self-center"
        />
        <h1 className="m-0 font-heading text-[28px] leading-9 font-extrabold">
          {m("placement.cardTitle")}
        </h1>
        <p className="m-0">{m("placement.cardBody")}</p>
        <Button size="child" block onClick={() => void start()}>
          {saved ? m("placement.resume") : m("placement.start")}
        </Button>
        <Link href="/sky/" className={buttonClasses("text", "child", "self-center")}>
          {m("placement.later")}
        </Link>
      </section>
    );

  const total = draft.set.items.length;
  const finished = draft.index >= total;
  if (finished)
    return (
      <section className="flex flex-col items-center gap-5 py-10 text-center">
        <OfflineNotice pending={draft.pending.length} />
        <Loading />
        {draft.pending.length > 0 && (
          <p className="m-0 text-[15px] text-muted">{m("setDone.pending")}</p>
        )}
      </section>
    );

  const item = draft.set.items[draft.index]!;
  const next = () => {
    if (!selected) return;
    const at = Date.now();
    const answer: SubmittedAnswer = {
      client_id: newClientId(),
      set_id: draft.set.set_id,
      item_id: item.id,
      item_version: item.version,
      response: selected,
      hint_shown: false,
      response_ms: Math.round(at - shownAt.current),
      recorded_at: new Date(at).toISOString(),
      key_on_device: false,
    };
    const updated = { ...draft, index: draft.index + 1, pending: [...draft.pending, answer] };
    persist(updated);
    setSelected(null);
    shownAt.current = at;
    void flush(updated);
  };

  return (
    <>
      <OfflineNotice pending={draft.pending.length} />
      <ProgressBar
        value={draft.index}
        max={total}
        label={m("placement.cardTitle")}
        valueText={m("progress.count", { current: draft.index + 1, total })}
        tone="primary"
      />
      <div ref={questionRef} tabIndex={-1} className="outline-none" key={item.id}>
        <QuestionCard
          header={m("placement.header", { current: draft.index + 1, total })}
          stem={item.stem}
        >
          <QuestionView
            item={item}
            phase="answer"
            selected={selected}
            missed={null}
            onSelect={setSelected}
            onSubmit={next}
          />
        </QuestionCard>
      </div>
      <div className="sticky bottom-0 -mx-5 bg-bg/95 px-5 pt-2 pb-5">
        <Button size="child" block disabled={!selected} onClick={next}>
          {m("common.next")}
        </Button>
      </div>
    </>
  );
}

export function PlacementScreen() {
  return <ChildFrame>{(ctx) => <Placement {...ctx} />}</ChildFrame>;
}
