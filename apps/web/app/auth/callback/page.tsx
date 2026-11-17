import { getCatalogue } from "@stellara/i18n";
import { Suspense } from "react";

import { SiteHeader } from "../../site-header";

import { CallbackStatus } from "./callback-status";

export default function AuthCallbackPage() {
  const copy = getCatalogue("en-NG");
  const checking = copy["signIn.callbackChecking"];

  return (
    <div className="flex min-h-screen flex-col bg-bg text-text">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-[460px] flex-1 flex-col justify-center px-6 py-12">
        <Suspense fallback={<p role="status">{checking}</p>}>
          <CallbackStatus
            copy={{
              checking,
              error: copy["signIn.callbackError"],
              tryAgain: copy["signIn.tryAgain"],
            }}
          />
        </Suspense>
      </main>
    </div>
  );
}
