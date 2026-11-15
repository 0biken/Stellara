"use client";

import { useId, useRef, useState, type ReactNode } from "react";

import { cx } from "./cx.js";
import { Picture, pictureIds, type PictureId } from "./pictures.js";

/* ---------- Picture key (picture PIN) ---------- */

export function PictureKey({
  labels,
  prompt,
  enteredLabel,
  onComplete,
  removeLabel,
  clearLabel,
}: {
  /** Screen-reader name for each picture, from the catalogue. */
  labels: Record<PictureId, string>;
  prompt: string;
  /** Announces progress, e.g. "2 of 4 pictures chosen". */
  enteredLabel: (count: number) => string;
  removeLabel: string;
  clearLabel: string;
  onComplete?: (sequence: PictureId[]) => void;
}) {
  const [sequence, setSequence] = useState<PictureId[]>([]);
  const current = useRef<PictureId[]>([]);
  const update = (next: PictureId[]) => {
    current.current = next;
    setSequence(next);
  };
  const choose = (id: PictureId) => {
    if (current.current.length >= 4) return;
    const next = [...current.current, id];
    update(next);
    if (next.length === 4) onComplete?.(next);
  };
  return (
    <div className="flex flex-col items-center gap-6">
      <p className="m-0 font-heading text-[22px] leading-[30px] font-extrabold">{prompt}</p>
      <div className="flex flex-wrap gap-3" role="status" aria-live="polite" aria-atomic="true">
        <span className="sr-only">{enteredLabel(sequence.length)}</span>
        {[0, 1, 2, 3].map((slot) => (
          <span
            key={slot}
            aria-hidden="true"
            className={cx(
              "size-4 rounded-full border-2",
              slot < sequence.length ? "border-primary bg-primary" : "border-line-strong",
            )}
          />
        ))}
      </div>
      <div className="grid w-full max-w-80 grid-cols-3 gap-3">
        {pictureIds.map((id) => (
          <button
            key={id}
            type="button"
            aria-label={labels[id]}
            onClick={() => choose(id)}
            disabled={sequence.length >= 4}
            className="st-press grid min-h-12 min-w-12 aspect-square place-items-center rounded-md border border-line bg-surface"
          >
            <Picture id={id} size={44} />
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          className="st-press min-h-12 rounded-full border border-line px-4"
          disabled={!sequence.length}
          onClick={() => update(current.current.slice(0, -1))}
        >
          {removeLabel}
        </button>
        <button
          type="button"
          className="st-press min-h-12 rounded-full border border-line px-4"
          disabled={!sequence.length}
          onClick={() => update([])}
        >
          {clearLabel}
        </button>
      </div>
    </div>
  );
}

/** Reveal only; scoring decisions stay with the caller. */
export function HintReveal({
  label,
  onReveal,
  children,
}: {
  label: string;
  onReveal?: (() => void) | undefined;
  children: ReactNode;
}) {
  const [revealed, setRevealed] = useState(false);
  const id = useId();
  return (
    <>
      <button
        type="button"
        className="min-h-12 text-left font-semibold"
        aria-expanded={revealed}
        aria-controls={id}
        onClick={() => {
          if (!revealed) {
            setRevealed(true);
            onReveal?.();
          }
        }}
      >
        {label}
      </button>
      <div id={id}>{revealed && children}</div>
    </>
  );
}
