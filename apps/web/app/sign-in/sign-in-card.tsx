"use client";

import { useId, useState } from "react";

export interface SignInCopy {
  title: string;
  subtitle: string;
  ageRule: string;
  ageConfirm: string;
  ageError: string;
  googleButton: string;
  pendingNotice: string;
}

export function SignInCard({ copy }: { copy: SignInCopy }) {
  const checkboxId = useId();
  const errorId = useId();
  const [over18, setOver18] = useState(false);
  const [status, setStatus] = useState<"idle" | "error" | "pending">("idle");

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!over18) {
      setStatus("error");
      return;
    }
    setStatus("pending");
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-5 rounded-3xl border border-line bg-surface p-8"
      noValidate
    >
      <div className="flex flex-col gap-2">
        <h1 className="m-0 font-heading text-[28px] leading-[34px] font-extrabold text-text">
          {copy.title}
        </h1>
        <p className="m-0 text-base text-muted">{copy.subtitle}</p>
      </div>

      <p className="m-0 rounded-2xl bg-primary-tint px-4 py-3 text-[15px] font-medium text-primary-ink">
        {copy.ageRule}
      </p>

      <label
        htmlFor={checkboxId}
        className="flex min-h-11 cursor-pointer items-start gap-3 rounded-2xl border border-line p-3.5 text-[15px] leading-6 text-text hover:border-line-strong"
      >
        <input
          id={checkboxId}
          type="checkbox"
          checked={over18}
          aria-invalid={status === "error" ? true : undefined}
          aria-describedby={status === "error" ? errorId : undefined}
          onChange={(e) => {
            setOver18(e.target.checked);
            if (e.target.checked && status === "error") setStatus("idle");
          }}
          className="mt-1 size-5 shrink-0 accent-primary"
        />
        <span>{copy.ageConfirm}</span>
      </label>

      {status === "error" && (
        <p id={errorId} role="alert" className="m-0 text-sm font-medium text-error">
          {copy.ageError}
        </p>
      )}

      <button
        type="submit"
        className="st-press inline-flex h-[52px] w-full items-center justify-center gap-3 rounded-full bg-primary px-6 font-heading text-[17px] font-bold text-on-primary"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="currentColor"
            d="M21.8 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.5c-.2 1.2-1 2.3-2.1 3v2.5h3.4c2-1.8 3-4.5 3-7.3z"
          />
          <path
            fill="currentColor"
            d="M12 22c2.8 0 5.1-.9 6.8-2.5l-3.4-2.5c-.9.6-2.1 1-3.4 1-2.6 0-4.9-1.8-5.7-4.2H2.8v2.6C4.5 19.8 8 22 12 22z"
          />
          <path
            fill="currentColor"
            d="M6.3 13.8c-.2-.6-.3-1.2-.3-1.8s.1-1.2.3-1.8V7.6H2.8C2.1 9 1.8 10.5 1.8 12s.4 3 1.1 4.4l3.4-2.6z"
          />
          <path
            fill="currentColor"
            d="M12 6c1.5 0 2.9.5 3.9 1.5l2.9-2.9C17.1 3 14.8 2 12 2 8 2 4.5 4.2 2.8 7.6l3.5 2.6C7.1 7.8 9.4 6 12 6z"
          />
        </svg>
        <span>{copy.googleButton}</span>
      </button>

      {status === "pending" && (
        <p role="status" className="m-0 rounded-2xl bg-sunk px-4 py-3 text-sm text-muted">
          {copy.pendingNotice}
        </p>
      )}
    </form>
  );
}
