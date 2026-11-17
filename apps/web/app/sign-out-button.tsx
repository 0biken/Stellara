"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { useSession } from "../lib/auth/session-provider";

import { beginSignOut } from "./require-session";

export function SignOutButton({ label }: { label: string }) {
  const router = useRouter();
  const { adapter, status } = useSession();
  const [busy, setBusy] = useState(false);

  if (status !== "signed-in") return null;

  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        beginSignOut();
        await adapter.signOut();
        router.replace("/");
      }}
      className="st-press inline-flex min-h-11 items-center rounded-full whitespace-nowrap border border-line px-4 text-[15px] font-semibold text-text hover:border-line-strong disabled:opacity-60"
    >
      {label}
    </button>
  );
}
