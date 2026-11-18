"use client";

import { useEffect, useRef, useState } from "react";

import { Button, buttonClasses } from "./button.js";
import { cx } from "./cx.js";
import { ProgressBar, StarState, type StarLevel } from "./learning.js";

import type { ReactNode } from "react";

/* ---------- Today's set card ---------- */

export function SetCard({
  topic,
  title,
  detail,
  action,
}: {
  /** The topic the set comes from, shown above the title. */
  topic: string;
  title: string;
  /** Plain facts, such as "10 questions · about 10 minutes". */
  detail: string;
  action: { label: string; href: string };
}) {
  return (
    <section className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-5">
      <div className="flex items-start gap-3">
        <div className="flex flex-1 flex-col gap-1">
          <p className="m-0 text-[15px] font-semibold text-primary-ink">{topic}</p>
          <h2 className="m-0 font-heading text-[24px] leading-8 font-extrabold">{title}</h2>
          <p className="m-0 text-[15px] text-muted">{detail}</p>
        </div>
      </div>
      <a href={action.href} className={buttonClasses("primary", "child", "w-full")}>
        {action.label}
      </a>
    </section>
  );
}

/* ---------- Worked answer ---------- */

/** Shown after a second "Not quite", or after the hint. Focus moves to the title. */
export function WorkedAnswer({
  title,
  children,
  actionLabel,
  onAction,
}: {
  title: string;
  children: ReactNode;
  actionLabel: string;
  onAction: () => void;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => heading.current?.focus(), []);
  return (
    <section className="st-reward-in flex flex-col gap-3 rounded-md bg-sunk p-5">
      <h3 ref={heading} tabIndex={-1} className="m-0 font-heading text-xl font-bold outline-none">
        {title}
      </h3>
      <div className="text-[18px] leading-7">{children}</div>
      <Button size="child" block onClick={onAction}>
        {actionLabel}
      </Button>
    </section>
  );
}

/* ---------- Lesson cards ---------- */

export type LessonCardView =
  | { kind: "explain"; body: string }
  | { kind: "worked_example"; body: string; steps: string[] }
  | { kind: "summary"; body: string }
  | { kind: "check"; content: ReactNode }
  | { kind: "try_it"; content: ReactNode };

/** One card at a time, 3–6 cards per lesson (03 §4.3). */
export function LessonCards({
  cards,
  labels,
  onDone,
}: {
  cards: LessonCardView[];
  labels: {
    cards: string;
    progress: (current: number, total: number) => string;
    worked: string;
    summary: string;
    check: string;
    tryIt?: string;
    next: string;
    back: string;
    done: string;
  };
  onDone: () => void;
}) {
  const [index, setIndex] = useState(0);
  const heading = useRef<HTMLDivElement>(null);
  const card = cards[Math.min(index, cards.length - 1)];
  const last = index >= cards.length - 1;
  const move = (next: number) => {
    setIndex(next);
    requestAnimationFrame(() => heading.current?.focus());
  };
  if (!card) return null;
  return (
    <section aria-label={labels.cards} className="flex flex-col gap-5">
      <ProgressBar
        value={index + 1}
        max={cards.length}
        label={labels.cards}
        valueText={labels.progress(index + 1, cards.length)}
        tone="primary"
      />
      <div
        ref={heading}
        tabIndex={-1}
        key={index}
        className="st-reward-in flex min-h-56 flex-col gap-4 rounded-lg border border-line bg-surface p-6 outline-none"
      >
        {card.kind === "explain" && <p className="m-0 text-[20px] leading-8">{card.body}</p>}
        {card.kind === "worked_example" && (
          <>
            <h2 className="m-0 font-heading text-xl font-bold">{labels.worked}</h2>
            <p className="m-0 text-[18px] leading-7">{card.body}</p>
            <ol className="m-0 flex flex-col gap-2 pl-6 text-[18px] leading-7">
              {card.steps.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </>
        )}
        {card.kind === "summary" && (
          <>
            <h2 className="m-0 font-heading text-xl font-bold">{labels.summary}</h2>
            <p className="m-0 text-[20px] leading-8">{card.body}</p>
          </>
        )}
        {card.kind === "check" && (
          <>
            <h2 className="m-0 font-heading text-xl font-bold">{labels.check}</h2>
            {card.content}
          </>
        )}
        {card.kind === "try_it" && (
          <>
            <h2 className="m-0 font-heading text-xl font-bold">{labels.tryIt ?? labels.check}</h2>
            {card.content}
          </>
        )}
      </div>
      <div className="flex gap-3">
        {index > 0 && (
          <Button variant="quiet" size="child" onClick={() => move(index - 1)}>
            {labels.back}
          </Button>
        )}
        <Button size="child" className="flex-1" onClick={last ? onDone : () => move(index + 1)}>
          {last ? labels.done : labels.next}
        </Button>
      </div>
    </section>
  );
}

/* ---------- Star grow (set done) ---------- */

/**
 * The one celebratory moment: the topic's new star rises up through the old one.
 * Reduced motion shows the new star straight away.
 */
export function StarGrow({
  from,
  to,
  label,
  size = 112,
}: {
  from: StarLevel;
  to: StarLevel;
  /** Text equivalent of the new state, such as "Fractions: Growing". */
  label: string;
  size?: number;
}) {
  const changed = from !== to;
  return (
    <div className="relative inline-grid place-items-end" data-changed={changed || undefined}>
      {changed && (
        <StarState
          level={from}
          label=""
          size={size}
          className="st-grow-under col-start-1 row-start-1"
        />
      )}
      <StarState
        level={to}
        label={label}
        size={size}
        className={cx("col-start-1 row-start-1", changed && "st-grow")}
      />
    </div>
  );
}

/* ---------- Placement result ---------- */

export type PlacementTone = "looks_secure_so_far" | "check_this" | "not_yet_measured_enough";
const toneStar: Record<PlacementTone, StarLevel> = {
  looks_secure_so_far: "proficient",
  check_this: "foundation",
  not_yet_measured_enough: "not_assessed",
};

/** Strand-level only. Never a score, never called a test (02 §9). */
export function PlacementResult({
  title,
  body,
  strands,
}: {
  title: string;
  body: string;
  strands: { id: string; name: string; tone: PlacementTone; label: string }[];
}) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="m-0 font-heading text-[28px] leading-9 font-extrabold">{title}</h2>
      <p className="m-0 text-[18px] leading-7 text-muted">{body}</p>
      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {strands.map((strand) => (
          <li
            key={strand.id}
            data-tone={strand.tone}
            className="flex items-center gap-4 rounded-md border border-line bg-surface p-4"
          >
            <StarState level={toneStar[strand.tone]} label="" size={36} />
            <div className="flex flex-col">
              <span className="font-heading text-lg font-bold">{strand.name}</span>
              <span className="text-[15px] text-muted">{strand.label}</span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
