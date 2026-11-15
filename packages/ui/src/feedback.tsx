import { buttonClasses } from "./button.js";
import { cx } from "./cx.js";
import { Icon } from "./icons.js";

import type { ReactNode } from "react";

export interface EmptyStateProps {
  title: string;
  children: ReactNode;
  /** Public URL for the static Auntie Stella listening SVG. */
  avatarSrc: string;
  avatarAlt: string;
  action?: { label: string; href: string };
}
export function EmptyState({ title, children, avatarSrc, avatarAlt, action }: EmptyStateProps) {
  return (
    <section className="flex flex-col items-center gap-4 py-8 text-center">
      <img className="st-illustration" src={avatarSrc} alt={avatarAlt} width={120} height={120} />
      <h2 className="font-heading text-[28px] font-bold">{title}</h2>
      <div className="max-w-prose text-[18px] leading-7">{children}</div>
      {action && (
        <a href={action.href} className={buttonClasses("primary", "child")}>
          {action.label}
        </a>
      )}
    </section>
  );
}
type ReportContent = { title: string; children: ReactNode; value?: ReactNode; className?: string };
export type ReportBlockProps = ReportContent &
  (
    | { kind: "coverage"; disclaimer: string }
    | { kind: "stat" | "celebrate" | "practise-next" | "note"; disclaimer?: never }
  );
/** Display facts already computed by the application; coverage always includes its supplied disclaimer. */
export function ReportBlock(props: ReportBlockProps) {
  return (
    <section
      className={cx(
        "min-w-0 rounded-md border border-line bg-surface p-5 break-words",
        props.kind === "celebrate" && "bg-success-tint",
        props.kind === "note" && "bg-hint",
        props.className,
      )}
      data-kind={props.kind}
    >
      <h2 className="flex items-center gap-2 font-heading text-xl font-bold">
        {props.kind === "celebrate" && <Icon name="check" />}
        {props.title}
      </h2>
      {props.value !== undefined && (
        <p className="mt-3 font-heading text-[28px] font-extrabold text-text">{props.value}</p>
      )}
      <div className="mt-3 text-[15px] leading-6">{props.children}</div>
      {props.kind === "coverage" && (
        <p className="mt-3 text-[15px] text-muted">{props.disclaimer}</p>
      )}
    </section>
  );
}
