import { getCatalogue } from "@stellara/i18n";
import { AdultShell } from "@stellara/ui";

import { RequireSession } from "../require-session";
import { SignOutButton } from "../sign-out-button";
import { SiteHeader } from "../site-header";

import type { ReactNode } from "react";

export default function FamilyLayout({ children }: { children: ReactNode }) {
  const copy = getCatalogue("en-NG");
  return (
    <div className="min-h-screen bg-bg text-text">
      <SiteHeader>
        <SignOutButton label={copy["portal.signOut"]} />
      </SiteHeader>
      <RequireSession loadingLabel={copy["shell.loading"]}>
        <AdultShell>{children}</AdultShell>
      </RequireSession>
    </div>
  );
}
