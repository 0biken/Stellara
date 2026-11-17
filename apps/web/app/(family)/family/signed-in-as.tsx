"use client";

import { formatMessage } from "@stellara/i18n";

import { useSession } from "../../../lib/auth/session-provider";

export function SignedInAs() {
  const { session } = useSession();
  const name = session?.displayName ?? session?.email;
  if (!name) return null;
  return <p className="m-0 text-base text-muted">{formatMessage("family.signedInAs", { name })}</p>;
}
