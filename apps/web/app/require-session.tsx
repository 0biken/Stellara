"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";

import { useSession } from "../lib/auth/session-provider";

let signingOut = false;

/** Sign-out leaves on its own, so the gate must not race it with a redirect. */
export function beginSignOut() {
  signingOut = true;
}

/**
 * Client-side gate for signed-in portals. The site is a static export, so this
 * only decides what to show; data access is enforced by RLS (TASKLIST 2.3).
 */
export function RequireSession({
  children,
  loadingLabel,
}: {
  children: ReactNode;
  loadingLabel: string;
}) {
  const { status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const redirected = useRef(false);

  useEffect(() => {
    // Redirect once: a second replace would cancel the first navigation.
    if (status !== "signed-out" || redirected.current || signingOut) return;
    redirected.current = true;
    router.replace(`/sign-in/?next=${encodeURIComponent(pathname)}`);
  }, [status, pathname, router]);

  if (status === "signed-in") return <>{children}</>;

  return (
    <div role="status" aria-live="polite" className="flex min-h-[60vh] items-center justify-center">
      <span className="sr-only">{loadingLabel}</span>
      <span
        aria-hidden="true"
        className="h-3 w-40 rounded-full bg-sunk motion-safe:animate-pulse"
      />
    </div>
  );
}
