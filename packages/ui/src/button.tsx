import { cx } from "./cx.js";

import type { ButtonHTMLAttributes, ReactNode } from "react";

export type ButtonVariant = "primary" | "quiet" | "text";
/** Children get 48 px targets; adults 44 px (08 §6). */
export type ButtonSize = "child" | "adult";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-primary text-on-primary",
  quiet: "border border-line-strong bg-surface text-text",
  text: "text-primary px-2",
};

/** Class string for anything that should look like a button, such as a link. */
export function buttonClasses(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "adult",
  className?: string,
): string {
  return cx(
    "st-press inline-flex items-center justify-center gap-2 rounded-full font-semibold select-none",
    "disabled:cursor-not-allowed disabled:opacity-50",
    size === "child" ? "min-h-12 px-6 text-lg" : "min-h-11 px-5 text-[15px]",
    variants[variant],
    className,
  );
}

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** While true the button is busy; `loadingLabel` replaces the label for everyone. */
  loading?: boolean;
  loadingLabel?: ReactNode;
  block?: boolean;
};

export function Button({
  variant = "primary",
  size = "adult",
  loading = false,
  loadingLabel,
  block = false,
  className,
  children,
  disabled,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      type={type}
      className={buttonClasses(variant, size, cx(block && "w-full", className))}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
    >
      {loading ? (
        <>
          <span
            aria-hidden="true"
            className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent motion-reduce:animate-none"
          />
          {loadingLabel ?? children}
        </>
      ) : (
        children
      )}
    </button>
  );
}
