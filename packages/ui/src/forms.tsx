import { cx } from "./cx.js";
import { Icon } from "./icons.js";

import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";

const control =
  "min-h-11 w-full rounded-sm border border-line-strong bg-surface px-3.5 text-base text-text placeholder:text-muted aria-invalid:border-error";

/** Label above, help below, errors in `error` with an icon (08 §6). */
export function Field({
  id,
  label,
  help,
  error,
  children,
}: {
  id: string;
  label: string;
  help?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[15px] font-semibold">
        {label}
      </label>
      {children}
      {help && !error && (
        <p id={`${id}-help`} className="m-0 text-[13px] leading-[18px] text-muted">
          {help}
        </p>
      )}
      {error && (
        <p
          id={`${id}-error`}
          className="m-0 flex items-start gap-1.5 text-[13px] leading-[18px] text-error"
        >
          <Icon name="alert" size={16} className="mt-px shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}

function describedBy(id: string, help?: string, error?: string) {
  return error ? `${id}-error` : help ? `${id}-help` : undefined;
}

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  id: string;
  help?: string;
  error?: string;
};

export function TextInput({ id, help, error, className, ...props }: InputProps) {
  return (
    <input
      {...props}
      id={id}
      aria-invalid={error ? true : undefined}
      aria-describedby={cx(props["aria-describedby"], describedBy(id, help, error)) || undefined}
      className={cx(control, className)}
    />
  );
}

/** Nigerian mobile numbers; +234 is shown, the person types the local number. */
export function PhoneInput({ id, help, error, className, ...props }: InputProps) {
  return (
    <div
      className={cx(
        "flex items-stretch overflow-hidden rounded-sm border border-line-strong bg-surface",
        className,
      )}
    >
      <span
        className="grid place-items-center border-r border-line bg-sunk px-3 text-base text-muted"
        aria-hidden="true"
      >
        +234
      </span>
      <input
        {...props}
        id={id}
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        aria-invalid={error ? true : undefined}
        aria-describedby={cx(props["aria-describedby"], describedBy(id, help, error)) || undefined}
        className="min-h-11 flex-1 bg-transparent px-3.5 text-base text-text outline-offset-[-2px]"
      />
    </div>
  );
}

export function OtpInput({ id, help, error, className, ...props }: InputProps) {
  return (
    <input
      {...props}
      id={id}
      inputMode="numeric"
      autoComplete="one-time-code"
      pattern="[0-9]{6}"
      maxLength={6}
      aria-invalid={error ? true : undefined}
      aria-describedby={cx(props["aria-describedby"], describedBy(id, help, error)) || undefined}
      className={cx(
        control,
        "max-w-56 text-center text-2xl tracking-[0.4em] tabular-nums",
        className,
      )}
    />
  );
}

export function Select({
  id,
  help,
  error,
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { id: string; help?: string; error?: string }) {
  return (
    <select
      {...props}
      id={id}
      aria-invalid={error ? true : undefined}
      aria-describedby={cx(props["aria-describedby"], describedBy(id, help, error)) || undefined}
      className={cx(control, "appearance-auto", className)}
    >
      {children}
    </select>
  );
}

/** A labelled on/off switch built on a checkbox, so it works without JavaScript. */
export function Toggle({
  id,
  label,
  description,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  id: string;
  label: string;
  description?: string;
}) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-start justify-between gap-4 py-2">
      <span className="flex flex-col gap-0.5">
        <span className="text-[15px] font-semibold">{label}</span>
        {description && (
          <span className="text-[13px] leading-[18px] text-muted">{description}</span>
        )}
      </span>
      <span className="relative mt-0.5 inline-flex shrink-0">
        <input id={id} type="checkbox" role="switch" className="peer sr-only" {...props} />
        <span
          aria-hidden="true"
          className="h-7 w-12 rounded-full border border-line-strong bg-sunk peer-checked:border-transparent peer-checked:bg-primary peer-focus-visible:outline-2 peer-focus-visible:outline-offset-3 peer-focus-visible:outline-focus"
        />
        <span
          aria-hidden="true"
          className="absolute top-1 left-1 size-5 rounded-full bg-surface shadow-sm transition-transform duration-200 ease-out peer-checked:translate-x-5 motion-reduce:transition-none"
        />
      </span>
    </label>
  );
}
