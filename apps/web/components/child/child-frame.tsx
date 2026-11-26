"use client";

import { formatMessage as m } from "@stellara/i18n";
import { buttonClasses } from "@stellara/ui";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";

import { auntie, useChild } from "./use-child";

import type { ChildProfile, LearningApi } from "../../lib/learning";

/** Quiet loading line, the same as the portal gate. */
export function Loading() {
  return (
    <div role="status" aria-live="polite" className="flex min-h-[50vh] items-center justify-center">
      <span className="sr-only">{m("shell.loading")}</span>
      <span
        aria-hidden="true"
        className="h-3 w-40 rounded-full bg-sunk motion-safe:animate-pulse"
      />
    </div>
  );
}

export function Problem({ onRetry }: { onRetry?: () => void }) {
  return (
    <section role="alert" className="flex flex-col items-center gap-4 py-12 text-center">
      <img src={auntie("listening")} alt="" width={96} height={96} className="st-illustration" />
      <p className="m-0 max-w-sm">{m("child.loadError")}</p>
      {onRetry && (
        <button type="button" className={buttonClasses("quiet", "child")} onClick={onRetry}>
          {m("child.tryAgain")}
        </button>
      )}
    </section>
  );
}

/** "No internet right now" while offline, then "All your answers are saved" once back. */
export function OfflineNotice({ pending }: { pending: number }) {
  const [online, setOnline] = useState(true);
  const [wasOffline, setWasOffline] = useState(false);
  useEffect(() => {
    const update = () => {
      setOnline(navigator.onLine);
      if (!navigator.onLine) setWasOffline(true);
    };
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  const message = !online
    ? m("offline.notice")
    : wasOffline && pending === 0
      ? m("offline.synced")
      : null;
  return (
    <p role="status" aria-live="polite" className="m-0 empty:hidden">
      {message && (
        <span className="block rounded-md bg-cloud px-4 py-3 text-[15px] text-text">{message}</span>
      )}
    </p>
  );
}

/**
 * Every child screen starts here: it finds the child on this device, or asks a
 * grown-up to open the profile (picture-key sign-in arrives with child-session).
 */
export function ChildFrame({
  children,
}: {
  children: (context: { api: LearningApi; child: ChildProfile }) => ReactNode;
}) {
  const state = useChild();
  if (state.status === "loading") return <Loading />;
  if (state.status === "error") return <Problem />;
  if (state.status === "no-child")
    return (
      <section className="flex flex-col items-center gap-5 py-12 text-center">
        <img src={auntie("smiling")} alt="" width={120} height={120} className="st-illustration" />
        <p className="m-0 font-heading text-[22px] leading-8 font-bold">{m("child.noProfile")}</p>
        <Link href="/family/" className={buttonClasses("primary", "child")}>
          {m("child.noProfileAction")}
        </Link>
      </section>
    );
  return (
    <div className="flex flex-col gap-6">
      {state.api.mode === "preview" && (
        <p className="m-0 self-start rounded-xl bg-sunk px-3 py-1.5 text-[13px] leading-5 font-medium text-muted">
          {m("child.preview")}
        </p>
      )}
      {children({ api: state.api, child: state.child })}
    </div>
  );
}
