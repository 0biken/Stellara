"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

import { safeNext } from "../../../lib/auth/safe-next";
import { useSession } from "../../../lib/auth/session-provider";

/**
 * Landing spot for the Google and email-link redirects. supabase-js finishes the
 * PKCE exchange from the URL when the client starts; this waits for the result.
 */
export function CallbackStatus({
  copy,
}: {
  copy: { checking: string; error: string; tryAgain: string };
}) {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const providerError = params.has("error") || params.has("error_description");
  const { status } = useSession();
  const failed = providerError || status === "signed-out";

  useEffect(() => {
    if (status === "signed-in") router.replace(next);
  }, [status, next, router]);

  if (!failed) {
    return (
      <p role="status" className="m-0 text-center text-base text-muted">
        {copy.checking}
      </p>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 rounded-3xl border border-line bg-surface p-8 text-center">
      <p role="alert" className="m-0 text-base text-text">
        {copy.error}
      </p>
      <Link
        href={`/sign-in/?next=${encodeURIComponent(next)}`}
        className="st-press inline-flex min-h-11 items-center rounded-full bg-primary px-6 font-heading font-bold text-on-primary no-underline"
      >
        {copy.tryAgain}
      </Link>
    </div>
  );
}
