import { useId, type CSSProperties } from "react";

export type StarStage = 0 | 1 | 2 | 3 | 4;

const stageConfig: Record<StarStage, { fillY: number; dashed: boolean; sprouted: boolean }> = {
  0: { fillY: 48, dashed: true, sprouted: false },
  1: { fillY: 33, dashed: false, sprouted: false },
  2: { fillY: 20, dashed: false, sprouted: false },
  3: { fillY: 0, dashed: false, sprouted: false },
  4: { fillY: 0, dashed: false, sprouted: true },
};

const STAR_POLYGON =
  "M24.0 6.0 L29.6 18.3 L43.0 19.8 L33.0 28.9 L35.8 42.2 L24.0 35.5 L12.2 42.2 L15.0 28.9 L5.0 19.8 L18.4 18.3Z";

/**
 * Five-stage star growth glyph used in the hero constellation and "How a star grows".
 * Uses semantic theme tokens so Daytime and Starlight adapt automatically.
 */
export function LandingStar({
  stage,
  size = "step",
  index = 0,
  className,
}: {
  stage: StarStage;
  size?: "hero" | "step";
  /** Position in a group; staggers the fill when it plays inside <Reveal>. */
  index?: number;
  className?: string;
}) {
  const clipId = useId();
  const { fillY, dashed, sprouted } = stageConfig[stage];
  const width = size === "hero" ? 52 : 56;
  const height = size === "hero" ? 60 : 64;

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 -10 48 56"
      aria-hidden="true"
      className={className}
    >
      <defs>
        <clipPath id={clipId}>
          <path d={STAR_POLYGON} />
        </clipPath>
      </defs>
      <path d={STAR_POLYGON} fill="var(--sunk)" />
      {/* The clip sits on the group so the fill can slide up through a fixed star shape. */}
      <g clipPath={`url(#${clipId})`}>
        <rect
          x="0"
          y="0"
          width="48"
          height="48"
          fill="var(--reward)"
          className="st-star-fill"
          style={{ "--fill-y": `${fillY}px`, "--i": index } as CSSProperties}
        />
      </g>
      <path
        d={STAR_POLYGON}
        fill="none"
        stroke={dashed ? "var(--muted)" : "var(--outline)"}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeDasharray={dashed ? "3 3" : undefined}
      />
      {sprouted && (
        <g className="st-sprout" style={{ "--i": index } as CSSProperties}>
          <path
            d="M24 7 Q23.5 2 24 -2"
            stroke="var(--success-ink)"
            strokeWidth="1.8"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M24 -1 C20 -6 15 -6 13 -4 C15 0 20 1 24 -1Z"
            fill="var(--success)"
            stroke="var(--outline)"
            strokeWidth="1"
          />
          <path
            d="M24 -2 C27 -7 32 -8 35 -6 C33 -2 28 0 24 -2Z"
            fill="var(--success)"
            stroke="var(--outline)"
            strokeWidth="1"
          />
          <circle
            cx="24"
            cy="-2.5"
            r="2.4"
            fill="var(--primary)"
            stroke="var(--outline)"
            strokeWidth="1"
          />
        </g>
      )}
    </svg>
  );
}
