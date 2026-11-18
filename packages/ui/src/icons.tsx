import type { SVGProps } from "react";

/** Line icons drawn on a 24-unit grid. They use currentColor so they follow the theme. */
export type IconName =
  | "check"
  | "alert"
  | "sky"
  | "learn"
  | "practice"
  | "home"
  | "report"
  | "children"
  | "settings"
  | "privacy"
  | "items"
  | "review"
  | "flags"
  | "palette"
  | "cloud"
  | "chevron"
  | "plus"
  | "close";

const paths: Record<IconName, string> = {
  check: "M5 12.5l4.5 4.5L19 7.5",
  alert: "M12 8v5M12 16.5v.5M12 3.5l9 16H3z",
  sky: "M12 3.5l2.4 5 5.4.6-4 3.7 1.1 5.4L12 15.5l-4.9 2.7 1.1-5.4-4-3.7 5.4-.6z",
  learn:
    "M4 5.5c3-1 5.5-.5 8 1.5 2.5-2 5-2.5 8-1.5v13c-3-1-5.5-.5-8 1.5-2.5-2-5-2.5-8-1.5zM12 7v13",
  practice: "M9 5h6M9 3.5h6v3H9zM6.5 5H5v15.5h14V5h-1.5M8.5 12l2.5 2.5 4.5-4.5",
  home: "M4 11l8-6.5 8 6.5M6 9.5V20h12V9.5M10 20v-5.5h4V20",
  report: "M6 3.5h9l3.5 3.5v13.5H6zM9 12h6M9 15.5h6M9 8.5h3",
  children:
    "M9 10.5a3 3 0 100-6 3 3 0 000 6zM3.5 20c.5-3.5 2.5-5.5 5.5-5.5s5 2 5.5 5.5M16 10.5a2.5 2.5 0 100-5M17 14.5c2 .3 3.2 2 3.5 5.5",
  settings:
    "M12 15a3 3 0 100-6 3 3 0 000 6zM12 3.5v2.2M12 18.3v2.2M3.5 12h2.2M18.3 12h2.2M6 6l1.6 1.6M16.4 16.4L18 18M6 18l1.6-1.6M16.4 7.6L18 6",
  privacy: "M12 3.5l7 2.5v5.5c0 4.5-3 7.8-7 9-4-1.2-7-4.5-7-9V6zM9 12l2 2 4-4",
  items: "M5 5h14v14H5zM8.5 9.5h7M8.5 12.5h7M8.5 15.5h4",
  review:
    "M4 12s3-6.5 8-6.5 8 6.5 8 6.5-3 6.5-8 6.5S4 12 4 12zM12 14.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z",
  flags: "M5.5 21V4M5.5 4.5h11l-2 4 2 4h-11",
  palette:
    "M12 3.5a8.5 8.5 0 100 17c1.2 0 1.8-.8 1.8-1.7 0-1.3-1-1.5-1-2.6 0-1 .8-1.7 1.8-1.7h2.2c2 0 3.7-1.6 3.7-3.7 0-4.3-3.8-7.3-8.5-7.3zM7.5 12h.01M9.5 8h.01M14.5 8h.01",
  cloud: "M7 18.5h10a4 4 0 00.5-8 5.5 5.5 0 00-10.6 1.2A3.5 3.5 0 007 18.5z",
  chevron: "M9.5 6l6 6-6 6",
  plus: "M12 5v14M5 12h14",
  close: "M6.5 6.5l11 11M17.5 6.5l-11 11",
};

export type IconProps = SVGProps<SVGSVGElement> & { name: IconName; size?: number };

export function Icon({ name, size = 20, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <path d={paths[name]} />
    </svg>
  );
}
