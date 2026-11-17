"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useId, useState } from "react";

import { safeNext } from "../../lib/auth/safe-next";
import { useSession } from "../../lib/auth/session-provider";

export interface SignInCopy {
  title: string;
  subtitle: string;
  ageRule: string;
  ageConfirm: string;
  ageError: string;
  googleButton: string;
  or: string;
  emailLabel: string;
  emailButton: string;
  emailInvalid: string;
  emailSent: string;
  previewNotice: string;
  error: string;
}

type Status = "idle" | "age-error" | "email-invalid" | "busy" | "email-sent" | "error";

const ageConfirmedKey = "stellara.ageConfirmedAt";
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;

export function isValidEmail(value: string): boolean {
  return emailPattern.test(value.trim());
}

function rememberAgeConfirmation() {
  // TODO(2.5): record this with the consent record in `consent-start`.
  try {
    window.sessionStorage.setItem(ageConfirmedKey, new Date().toISOString());
  } catch {
    // Storage can be blocked; the consent step asks again.
  }
}

export function SignInCard({ copy }: { copy: SignInCopy }) {
  const checkboxId = useId();
  const ageErrorId = useId();
  const emailId = useId();
  const emailErrorId = useId();
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const { status: sessionStatus, adapter } = useSession();
  const [over18, setOver18] = useState(false);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  useEffect(() => {
    if (sessionStatus === "signed-in") router.replace(next);
  }, [sessionStatus, next, router]);

  const confirmAge = () => {
    if (over18) return true;
    setStatus("age-error");
    return false;
  };

  const handleGoogle = async () => {
    if (!adapter || !confirmAge()) return;
    rememberAgeConfirmation();
    setStatus("busy");
    const result = await adapter.signInWithGoogle({ next });
    if (result.status === "error") setStatus("error");
    // "redirecting" leaves the page; "signed-in" is handled by the session effect.
  };

  const handleEmail = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!adapter || !confirmAge()) return;
    if (!isValidEmail(email)) {
      setStatus("email-invalid");
      return;
    }
    rememberAgeConfirmation();
    setStatus("busy");
    const result = await adapter.signInWithEmail({ email: email.trim(), next });
    setStatus(result.status === "email-sent" ? "email-sent" : "error");
  };

  const busy = status === "busy" || sessionStatus === "loading";

  return (
    <div className="flex flex-col gap-5 rounded-3xl border border-line bg-surface p-8">
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
          aria-invalid={status === "age-error" ? true : undefined}
          aria-describedby={status === "age-error" ? ageErrorId : undefined}
          onChange={(e) => {
            setOver18(e.target.checked);
            if (e.target.checked && status === "age-error") setStatus("idle");
          }}
          className="mt-1 size-5 shrink-0 accent-primary"
        />
        <span>{copy.ageConfirm}</span>
      </label>

      {status === "age-error" && (
        <p id={ageErrorId} role="alert" className="m-0 text-sm font-medium text-error">
          {copy.ageError}
        </p>
      )}

      <button
        type="button"
        onClick={handleGoogle}
        disabled={busy}
        className="st-press inline-flex h-[52px] w-full items-center justify-center gap-3 rounded-full bg-primary px-6 font-heading text-[17px] font-bold text-on-primary disabled:opacity-60"
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

      <div className="flex items-center gap-3 text-sm text-muted" aria-hidden="true">
        <span className="h-px flex-1 bg-line" />
        <span>{copy.or}</span>
        <span className="h-px flex-1 bg-line" />
      </div>

      {status === "email-sent" ? (
        <p
          role="status"
          className="m-0 rounded-2xl bg-primary-tint px-4 py-3 text-[15px] text-primary-ink"
        >
          {copy.emailSent}
        </p>
      ) : (
        <form onSubmit={handleEmail} noValidate className="flex flex-col gap-3">
          <label htmlFor={emailId} className="text-[15px] font-semibold text-text">
            {copy.emailLabel}
          </label>
          <input
            id={emailId}
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            value={email}
            aria-invalid={status === "email-invalid" ? true : undefined}
            aria-describedby={status === "email-invalid" ? emailErrorId : undefined}
            onChange={(e) => {
              setEmail(e.target.value);
              if (status === "email-invalid") setStatus("idle");
            }}
            className="h-12 rounded-2xl border border-line bg-bg px-4 text-base text-text outline-none focus-visible:border-primary"
          />
          {status === "email-invalid" && (
            <p id={emailErrorId} role="alert" className="m-0 text-sm font-medium text-error">
              {copy.emailInvalid}
            </p>
          )}
          <button
            type="submit"
            disabled={busy}
            className="st-press inline-flex h-12 w-full items-center justify-center rounded-full border border-line-strong px-6 font-heading text-base font-bold text-text disabled:opacity-60"
          >
            {copy.emailButton}
          </button>
        </form>
      )}

      {status === "error" && (
        <p role="alert" className="m-0 text-sm font-medium text-error">
          {copy.error}
        </p>
      )}

      {adapter?.mode === "preview" && (
        <p className="m-0 rounded-2xl bg-sunk px-4 py-3 text-sm text-muted">{copy.previewNotice}</p>
      )}
    </div>
  );
}
