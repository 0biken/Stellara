import { cx } from "./cx.js";
import { Icon } from "./icons.js";
import { HintReveal } from "./picture-key.js";

import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from "react";

/* ---------- Answer tile ---------- */

export type AnswerState = "default" | "selected" | "correct" | "not-quite" | "disabled";

export type AnswerTileProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> &
  (
    | {
        state: "correct" | "not-quite";
        stateLabel: string;
      }
    | { state?: "default" | "selected" | "disabled"; stateLabel?: string }
  ) & {
    children: ReactNode;
    /** Word shown with correct and not-quite states, so colour is never the only signal. */
    stateLabel?: string;
  };

const tileStates: Record<AnswerState, string> = {
  default: "border-line bg-surface",
  selected: "border-primary bg-primary-tint text-primary-ink",
  correct: "border-success bg-success-tint text-success-ink",
  "not-quite": "border-dashed border-primary bg-surface",
  disabled: "border-line bg-sunk text-muted",
};

export function AnswerTile({
  state = "default",
  stateLabel,
  className,
  children,
  disabled,
  ...props
}: AnswerTileProps) {
  const locked = state === "correct" || state === "not-quite" || state === "disabled";
  return (
    <button
      {...props}
      type="button"
      aria-pressed={state === "selected" || state === "correct" || state === "not-quite"}
      aria-disabled={locked || undefined}
      disabled={locked || disabled}
      data-state={state}
      className={cx(
        "st-press flex min-h-14 w-full items-center gap-3 rounded-md border-[1.5px] px-4 py-3 text-left text-lg",
        tileStates[state],
        className,
      )}
    >
      <span className="flex-1">{children}</span>
      {state === "correct" && (
        <span className="inline-flex items-center gap-1 text-[15px] font-semibold">
          <Icon name="check" size={18} />
          {stateLabel}
        </span>
      )}
      {state === "not-quite" && (
        <span className="inline-flex items-center gap-1 text-[15px] font-semibold text-primary-ink">
          <span aria-hidden="true">↻</span>
          {stateLabel}
        </span>
      )}
    </button>
  );
}

/* ---------- Question card ---------- */

export type QuestionCardProps = {
  header: string;
  stem: ReactNode;
  children?: ReactNode;
} & (
  | { stimulus: ReactNode; stimulusLabel: string }
  | { stimulus?: undefined; stimulusLabel?: string }
);

export function QuestionCard({
  header,
  stem,
  stimulus,
  stimulusLabel,
  children,
}: QuestionCardProps) {
  return (
    <section className="flex flex-col gap-5">
      <p className="text-[15px] font-medium text-muted">{header}</p>
      {stimulus && (
        <>
          <details className="st-stimulus rounded-md bg-sunk p-4 open:pb-5">
            <summary className="cursor-pointer text-[15px] font-semibold">{stimulusLabel}</summary>
            <div className="mt-3 text-lg leading-7">{stimulus}</div>
          </details>
          <div className="st-stimulus-desktop rounded-md bg-sunk p-4 text-lg leading-7">
            {stimulus}
          </div>
        </>
      )}
      <h2 className="font-heading text-[22px] leading-[30px] font-extrabold text-balance">
        {stem}
      </h2>
      {children && <div className="flex flex-col gap-3">{children}</div>}
    </section>
  );
}

/* ---------- Hint card ---------- */

export function HintCard({
  avatarSrc,
  avatarAlt = "",
  title,
  children,
  onReveal,
}: {
  avatarSrc: string;
  avatarAlt?: string;
  title: string;
  onReveal?: () => void;
  children: ReactNode;
}) {
  return (
    <aside className="flex items-start gap-3 rounded-md bg-hint p-4 text-text">
      <img
        src={avatarSrc}
        alt={avatarAlt}
        width={32}
        height={32}
        className="st-illustration mt-0.5 size-8 shrink-0"
      />
      <div className="flex flex-col gap-1 text-[17px] leading-7">
        <HintReveal label={title} onReveal={onReveal}>
          {children}
        </HintReveal>
      </div>
    </aside>
  );
}

/* ---------- Progress bar ---------- */

export function ProgressBar({
  value,
  max,
  label,
  valueText,
  tone = "success",
}: {
  value: number;
  max: number;
  /** Accessible name, such as "Today's set". */
  label: string;
  /** Visible text, such as "6 of 10". Always shown so the bar never relies on colour. */
  valueText: string;
  tone?: "success" | "primary";
}) {
  const safeMax = Number.isFinite(max) ? Math.max(1, max) : 1;
  const safeValue = Number.isFinite(value) ? Math.min(safeMax, Math.max(0, value)) : 0;
  const ratio = safeValue / safeMax;
  return (
    <div className="flex items-center gap-3">
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={safeMax}
        aria-valuenow={safeValue}
        aria-valuetext={valueText}
        className="h-2.5 flex-1 overflow-hidden rounded-full bg-sunk"
      >
        <div
          className={cx(
            "st-fill h-full w-full rounded-full",
            tone === "success" ? "bg-success" : "bg-primary",
          )}
          style={{ transform: `scaleX(${ratio})` }}
        />
      </div>
      <span className="text-[13px] font-medium text-muted tabular-nums">{valueText}</span>
    </div>
  );
}

/* ---------- Star state ---------- */

export type StarLevel =
  "not_assessed" | "foundation" | "developing" | "proficient" | "advanced" | "mastered";

/** The plump star from the logo, so topic stars and the brand mark share one shape. */
const STAR_PATH =
  "M45.94 32.93Q50 27 54.06 32.93L58.8 39.84Q61.29 43.47 65.5 44.71L73.54 47.08Q80.43 49.11 76.05 54.81L70.94 61.45Q68.26 64.93 68.38 69.32L68.61 77.7Q68.81 84.89 62.04 82.48L54.14 79.67Q50 78.2 45.86 79.67L37.96 82.48Q31.19 84.89 31.39 77.7L31.62 69.32Q31.74 64.93 29.06 61.45L23.95 54.81Q19.57 49.11 26.46 47.08L34.5 44.71Q38.71 43.47 41.2 39.84Z";

export function StarState({
  level,
  label,
  size = 40,
  className,
}: {
  level: StarLevel;
  /** Text equivalent, such as "Fractions: mastered". Required: shape is never the only signal. */
  label: string;
  size?: number;
  className?: string;
}) {
  const filled = level === "proficient" || level === "advanced" || level === "mastered";
  return (
    <svg
      viewBox={level === "mastered" ? "16 4 68 84" : "16 20 68 68"}
      width={size}
      height={level === "mastered" ? size * (84 / 68) : size}
      role={label ? "img" : undefined}
      aria-label={label || undefined}
      aria-hidden={label ? undefined : true}
      className={className}
    >
      {level === "mastered" && (
        <g strokeLinejoin="round">
          <path
            d="M50 30 Q49 24 50 19"
            stroke="var(--success-ink)"
            strokeWidth="2.6"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M50 20.5C44 11 35 10.5 30.5 14.5c4 7 13 9 19.5 6z"
            fill="var(--success)"
            stroke="var(--outline)"
            strokeWidth="2.4"
          />
          <path
            d="M50 18.5C55 8 65.5 5.5 70.5 9.5c-3 8-13 12-20.5 9z"
            fill="var(--success)"
            stroke="var(--outline)"
            strokeWidth="2.4"
          />
          <path
            data-part="bud"
            d="M50 19C44 15 45 8 50 5c5 3 6 10 0 14z"
            fill="var(--primary)"
            stroke="var(--outline)"
            strokeWidth="2.4"
          />
        </g>
      )}
      {level === "developing" && (
        <path d={STAR_PATH} fill="var(--reward)" style={{ clipPath: "inset(50% 0 0 0)" }} />
      )}
      <path
        d={STAR_PATH}
        fill={filled ? "var(--reward)" : "none"}
        stroke={filled ? "var(--outline)" : "var(--reward-edge)"}
        strokeWidth={level === "advanced" || level === "mastered" ? 4.2 : 2.6}
        strokeDasharray={level === "not_assessed" ? "5 4" : undefined}
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ---------- Sky (constellation) ---------- */

export type SkyStar = { id: string; label: string; level: StarLevel; x: number; y: number };
export type SkyLink = { from: string; to: string; lit: boolean };

export function Sky({
  stars,
  links,
  label,
  onSelect,
}: {
  stars: SkyStar[];
  links: SkyLink[];
  label: string;
  onSelect?: (id: string) => void;
}) {
  const byId = new Map(stars.map((star) => [star.id, star]));
  return (
    <figure aria-label={label} className="relative m-0 aspect-[4/3] w-full rounded-lg bg-sunk">
      <svg
        viewBox="0 0 100 75"
        preserveAspectRatio="none"
        className="absolute inset-0 size-full"
        aria-hidden="true"
      >
        {links.map(({ from, to, lit }) => {
          const a = byId.get(from);
          const b = byId.get(to);
          if (!a || !b) return null;
          return (
            <line
              key={`${from}-${to}`}
              x1={a.x}
              y1={a.y * 0.75}
              x2={b.x}
              y2={b.y * 0.75}
              stroke={lit ? "var(--link-on)" : "var(--link-off)"}
              strokeDasharray={lit ? undefined : "1.6 1.4"}
              vectorEffect="non-scaling-stroke"
              style={{ strokeWidth: lit ? 2.5 : 2 }}
            />
          );
        })}
      </svg>
      <ul className="m-0 list-none p-0">
        {stars.map((star) => (
          <li
            key={star.id}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={
              {
                left: `clamp(24px, ${Number.isFinite(star.x) ? star.x : 50}%, calc(100% - 24px))`,
                top: `clamp(24px, ${Number.isFinite(star.y) ? star.y : 50}%, calc(100% - 24px))`,
              } as CSSProperties
            }
          >
            <button
              type="button"
              aria-label={star.label}
              onClick={onSelect ? () => onSelect(star.id) : undefined}
              className="st-press grid size-12 place-items-center rounded-full"
            >
              <StarState level={star.level} label="" size={34} />
            </button>
          </li>
        ))}
      </ul>
    </figure>
  );
}

/* ---------- Day row ---------- */

export type DayMark = "star" | "cloud" | "empty";

export function DayRow({
  days,
  label,
}: {
  days: Array<{ letter: string; label: string; mark: DayMark }>;
  label: string;
}) {
  return (
    <ol aria-label={label} className="m-0 flex list-none justify-between gap-1 p-0">
      {days.map((day, index) => (
        <li key={index} className="flex flex-col items-center gap-1.5" aria-label={day.label}>
          <span
            className={cx(
              "grid size-10 place-items-center rounded-full",
              day.mark === "star" && "bg-reward-tint",
              day.mark === "cloud" && "bg-cloud text-muted",
              day.mark === "empty" && "border border-dashed border-line-strong",
            )}
          >
            {day.mark === "star" && <StarState level="proficient" label="" size={22} />}
            {day.mark === "cloud" && <Icon name="cloud" size={20} />}
          </span>
          <span aria-hidden="true" className="text-[12px] font-medium text-muted">
            {day.letter}
          </span>
        </li>
      ))}
    </ol>
  );
}

/* ---------- Stardust chip ---------- */

export function StardustChip({ text, className }: { text: string; className?: string }) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 rounded-full bg-reward-tint py-1 pr-3 pl-2 text-[15px] font-semibold text-reward-ink tabular-nums",
        className,
      )}
    >
      <StarState level="proficient" label="" size={16} />
      {text}
    </span>
  );
}

/* ---------- Timer ---------- */

export function formatClock(ms: number): string {
  const total = Number.isFinite(ms) ? Math.max(0, Math.ceil(ms / 1000)) : 0;
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

/**
 * Calm by design: topic assessments show only a bar; practice tests add mm:ss.
 * No red and no pulsing as time runs low.
 */
export function Timer({
  remainingMs,
  totalMs,
  mode,
  label,
  valueText,
}: {
  remainingMs: number;
  totalMs: number;
  mode: "bar" | "numeric";
  label: string;
  valueText?: string;
}) {
  const ratio =
    Number.isFinite(totalMs) && Number.isFinite(remainingMs) && totalMs > 0
      ? Math.min(1, Math.max(0, remainingMs / totalMs))
      : 0;
  return (
    <div className="flex items-center gap-3" role="timer" aria-label={label}>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-sunk" aria-hidden="true">
        <div
          className="st-fill h-full w-full rounded-full bg-primary-ink/60"
          style={{ transform: `scaleX(${ratio})` }}
        />
      </div>
      {mode === "bar" && valueText && <span className="sr-only">{valueText}</span>}
      {mode === "numeric" && (
        <span className="min-w-12 text-right text-[15px] font-semibold tabular-nums">
          {formatClock(remainingMs)}
        </span>
      )}
    </div>
  );
}
