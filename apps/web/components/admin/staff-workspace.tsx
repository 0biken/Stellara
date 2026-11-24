"use client";

import { Button } from "@stellara/ui";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

import { ThemeToggle } from "../../app/theme-toggle";
import { getAdminApi } from "../../lib/admin/api";
import { canAccessPath, navigationFor } from "../../lib/admin/permissions";
import { AdminError, roleLabels, type AdminApi, type StaffSession } from "../../lib/admin/types";

import { SecurityPanel } from "./security-panel";
import { StaffProvider } from "./staff-context";

type Access =
  | { status: "ready"; session: StaffSession }
  | { status: "loading" | "signed-out" | "error" | "mfa" | "forbidden"; message?: string };
const messages = {
  NOT_CONFIGURED:
    "Connect the staff backend or enable the local staff demo to open this workspace.",
  FORBIDDEN: "This account does not have active staff access.",
  NETWORK: "We could not reach the staff service. Check your connection and retry.",
  SERVER: "The staff service is unavailable. Please try again.",
  INVALID_REQUEST: "This request could not be completed.",
  SIGNED_OUT: "Sign in with your staff account to continue.",
  MFA_REQUIRED: "Verify your authenticator to continue.",
};

export function StaffWorkspace({
  children,
  api: injected,
  path: injectedPath,
}: {
  children: ReactNode;
  api?: AdminApi;
  path?: string;
}) {
  const pathname = usePathname();
  const path = injectedPath ?? pathname;
  const [api, setApi] = useState<AdminApi | null>(injected ?? null);
  const [access, setAccess] = useState<Access>({ status: "loading" });
  const generation = useRef(0);
  const refresh = useCallback(() => {
    const current = ++generation.current;
    setAccess({ status: "loading" });
    void (async () => {
      try {
        const client = injected ?? (await getAdminApi());
        if (current !== generation.current) return;
        setApi(client);
        const session = await client.getSession();
        if (current !== generation.current) return;
        setAccess(
          !session
            ? { status: "signed-out" }
            : !session.active
              ? { status: "forbidden" }
              : { status: "ready", session },
        );
      } catch (failure) {
        if (current !== generation.current) return;
        const code = failure instanceof AdminError ? failure.code : "SERVER";
        setAccess({
          status:
            code === "MFA_REQUIRED"
              ? "mfa"
              : code === "FORBIDDEN"
                ? "forbidden"
                : code === "SIGNED_OUT"
                  ? "signed-out"
                  : "error",
          message: messages[code],
        });
      }
    })();
  }, [injected]);
  const invalidate = useCallback(() => {
    generation.current++;
  }, []);
  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => {
      if (active) refresh();
    });
    return () => {
      active = false;
      invalidate();
    };
  }, [refresh, invalidate]);
  useEffect(() => {
    if (!api) return;
    // Defer Auth work out of Supabase's synchronous auth callback.
    let timer: ReturnType<typeof setTimeout> | undefined;
    const off = api.onAuthChange(() => {
      generation.current++;
      setAccess({ status: "loading" });
      timer = setTimeout(refresh, 0);
    });
    const focus = () => refresh();
    window.addEventListener("focus", focus);
    return () => {
      off();
      clearTimeout(timer);
      window.removeEventListener("focus", focus);
    };
  }, [api, refresh]);
  async function signOut() {
    generation.current++;
    setAccess({ status: "signed-out" });
    try {
      await api?.signOut();
    } catch {
      setAccess({
        status: "error",
        message: "Sign-out could not be confirmed. Retry before leaving this device.",
      });
    }
  }
  if (access.status !== "ready" || !api)
    return (
      <main
        id="staff-main"
        className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 px-6 py-16"
      >
        <Link href="/" className="font-heading text-2xl font-bold">
          stellara
        </Link>
        <h1 className="font-heading text-3xl font-bold">Staff workspace</h1>
        {access.status === "loading" ? (
          <p role="status">Checking staff access…</p>
        ) : (
          <>
            <p role={access.status === "error" ? "alert" : undefined}>
              {("message" in access ? access.message : undefined) ??
                (access.status === "signed-out" ? messages.SIGNED_OUT : messages.FORBIDDEN)}
            </p>
            {access.status === "mfa" && api && <SecurityPanel api={api} onVerified={refresh} />}
            <div className="flex flex-wrap gap-3">
              <Link href={`/sign-in/?next=${encodeURIComponent(path)}`} className="underline">
                Sign in with staff account
              </Link>
              <Button variant="quiet" onClick={refresh}>
                Retry access
              </Button>
              {api && (
                <Button variant="text" onClick={() => void signOut()}>
                  Sign out
                </Button>
              )}
            </div>
          </>
        )}
      </main>
    );
  const links = navigationFor(access.session.role);
  const allowed = canAccessPath(access.session.role, path);
  const current = links.find((entry) => path.replace(/\/$/, "") === entry.href);
  return (
    <StaffProvider value={{ api, session: access.session, refresh }}>
      <a
        href="#staff-main"
        className="sr-only focus:not-sr-only focus:fixed focus:z-50 focus:bg-surface focus:p-4"
      >
        Skip to workspace
      </a>
      <div className="min-h-screen bg-bg text-text lg:grid lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="border-b border-line bg-surface p-5 lg:sticky lg:top-0 lg:h-screen lg:border-r lg:border-b-0">
          <Link href="/admin/" className="font-heading text-2xl font-extrabold tracking-tight">
            stellara<span className="ml-2 text-xs font-medium text-muted">STAFF</span>
          </Link>
          <p className="mt-4 text-sm text-muted">{roleLabels[access.session.role]} workspace</p>
          <nav aria-label="Staff navigation" className="mt-5 flex flex-wrap gap-1 lg:flex-col">
            {links.map((entry, index) => (
              <div key={entry.href}>
                {(index === 0 || links[index - 1]?.section !== entry.section) && (
                  <p className="mt-5 mb-2 hidden px-3 text-xs font-semibold tracking-wider text-muted uppercase lg:block">
                    {entry.section}
                  </p>
                )}
                <Link
                  href={`${entry.href}/`}
                  aria-current={current?.href === entry.href ? "page" : undefined}
                  className={`block rounded-xl px-3 py-3 text-sm font-semibold ${current?.href === entry.href ? "bg-hint text-text" : "text-text hover:bg-bg"}`}
                >
                  {entry.label}
                </Link>
              </div>
            ))}
          </nav>
        </aside>
        <div className="min-w-0">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-surface px-6 py-3">
            <p className="text-sm text-muted">
              Workspace <span aria-hidden="true">/</span>{" "}
              <span className="text-text">{current?.label ?? "Content workspace"}</span>
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <span className="max-w-48 truncate text-sm text-muted">
                {access.session.email ?? roleLabels[access.session.role]}
              </span>
              <ThemeToggle
                lightLabel="Daylight"
                darkLabel="Starlight"
                switchToLightLabel="Switch to Daylight appearance"
                switchToDarkLabel="Switch to Starlight appearance"
              />
              <Button variant="text" onClick={() => void signOut()}>
                Sign out
              </Button>
            </div>
          </header>
          {api.mode === "demo" && (
            <div className="border-b border-line bg-hint px-6 py-3 text-sm">
              <strong>Staff demo.</strong> Sample content only. Changes reset when you reload.
              Nothing is published to families.
            </div>
          )}
          <main
            id="staff-main"
            className="mx-auto max-w-[1440px] p-5 md:p-8"
            key={`${access.session.userId}:${access.session.role}`}
          >
            {allowed ? (
              children
            ) : (
              <section className="flex flex-col gap-4">
                <h1 className="font-heading text-3xl font-bold">Access restricted</h1>
                <p>Your staff role cannot open this page.</p>
                <Link href="/admin/" className="text-primary underline">
                  Return to your overview
                </Link>
              </section>
            )}
          </main>
        </div>
      </div>
    </StaffProvider>
  );
}
