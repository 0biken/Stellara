/**
 * The nine picture-key pictures and the profile avatars share one simple, flat set.
 * Each is drawn on a 48-unit grid with the Sweet Garden palette and the cocoa outline.
 */
export type PictureId =
  "sun" | "moon" | "leaf" | "flower" | "fish" | "ball" | "cup" | "house" | "kite";
export const pictureIds: readonly PictureId[] = [
  "sun",
  "moon",
  "leaf",
  "flower",
  "fish",
  "ball",
  "cup",
  "house",
  "kite",
];

const stroke = {
  stroke: "var(--outline)",
  strokeWidth: 2.2,
  strokeLinejoin: "round",
  strokeLinecap: "round",
} as const;

function PictureArt({ id }: { id: PictureId }) {
  switch (id) {
    case "sun":
      return (
        <>
          <path
            d="M24 6v5M24 37v5M6 24h5M37 24h5M11.3 11.3l3.5 3.5M33.2 33.2l3.5 3.5M11.3 36.7l3.5-3.5M33.2 14.8l3.5-3.5"
            {...stroke}
            fill="none"
          />
          <circle cx="24" cy="24" r="9" fill="var(--reward)" {...stroke} />
        </>
      );
    case "moon":
      return (
        <path d="M30 8a16 16 0 1 0 10 26A13 13 0 0 1 30 8z" fill="var(--reward)" {...stroke} />
      );
    case "leaf":
      return (
        <>
          <path d="M10 38C10 20 22 9 40 9c0 18-11 29-30 29z" fill="var(--success)" {...stroke} />
          <path d="M12 36L30 18" {...stroke} fill="none" />
        </>
      );
    case "flower":
      return (
        <>
          {[0, 72, 144, 216, 288].map((r) => (
            <ellipse
              key={r}
              cx="24"
              cy="13"
              rx="6"
              ry="8"
              transform={`rotate(${r} 24 24)`}
              fill="var(--primary-tint)"
              {...stroke}
            />
          ))}
          <circle cx="24" cy="24" r="5.5" fill="var(--reward)" {...stroke} />
        </>
      );
    case "fish":
      return (
        <>
          <path
            d="M8 24c6-9 18-11 26-4l6-5v18l-6-5c-8 7-20 5-26-4z"
            fill="var(--primary-tint)"
            {...stroke}
          />
          <circle cx="16" cy="22.5" r="1.8" fill="var(--outline)" />
        </>
      );
    case "ball":
      return (
        <>
          <circle cx="24" cy="24" r="15" fill="var(--surface)" {...stroke} />
          <path
            d="M9.5 20c9 3 20 3 29 0M12 33c7-4 17-4 24 0M24 9c-5 9-5 21 0 30"
            {...stroke}
            fill="none"
          />
        </>
      );
    case "cup":
      return (
        <>
          <path
            d="M11 16h22v12a9 9 0 0 1-9 9h-4a9 9 0 0 1-9-9z"
            fill="var(--success-tint)"
            {...stroke}
          />
          <path d="M33 19h3a5 5 0 0 1 0 10h-3" {...stroke} fill="none" />
          <path d="M17 7c-2 3 2 4 0 7M24 7c-2 3 2 4 0 7" {...stroke} fill="none" />
        </>
      );
    case "house":
      return (
        <>
          <path d="M9 22L24 9l15 13v17H9z" fill="var(--reward-tint)" {...stroke} />
          <path d="M20 39V29h8v10" fill="var(--primary-tint)" {...stroke} />
        </>
      );
    case "kite":
      return (
        <>
          <path d="M24 5l12 15-12 17-12-17z" fill="var(--primary-tint)" {...stroke} />
          <path d="M24 5v32M12 20h24M24 37c-2 3 2 4 0 7" {...stroke} fill="none" />
        </>
      );
  }
}

export function Picture({
  id,
  size = 40,
  className,
}: {
  id: PictureId;
  size?: number;
  className?: string;
}) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden="true" className={className}>
      <PictureArt id={id} />
    </svg>
  );
}

/* ---------- Profile picker ---------- */

export type Profile = { id: string; name: string; picture: PictureId; href: string };

export function ProfilePicker({ profiles, title }: { profiles: Profile[]; title: string }) {
  return (
    <nav aria-label={title} className="grid w-full grid-cols-2 gap-4">
      {profiles.map((profile) => (
        <a
          key={profile.id}
          href={profile.href}
          className="st-press flex min-w-0 flex-col items-center gap-3 rounded-lg border border-line bg-surface px-4 py-6 no-underline"
        >
          <span className="grid size-20 place-items-center rounded-full bg-primary-tint">
            <Picture id={profile.picture} size={48} />
          </span>
          <span className="max-w-full break-words text-center font-heading text-xl font-bold text-text">
            {profile.name}
          </span>
        </a>
      ))}
    </nav>
  );
}
