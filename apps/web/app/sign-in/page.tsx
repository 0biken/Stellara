import { getCatalogue } from "@stellara/i18n";
import Link from "next/link";
import { Suspense } from "react";

import { SiteHeader } from "../site-header";

import { SignInCard } from "./sign-in-card";

export default function SignInPage() {
  const copy = getCatalogue("en-NG");

  return (
    <div className="flex min-h-screen flex-col bg-bg text-text">
      <SiteHeader />

      <main className="mx-auto flex w-full max-w-[460px] flex-1 flex-col justify-center gap-6 px-6 py-12">
        {/* useSearchParams needs a Suspense boundary in a static export. */}
        <Suspense
          fallback={<div className="min-h-[560px] rounded-3xl border border-line bg-surface" />}
        >
          <SignInCard
            copy={{
              title: copy["signIn.title"],
              subtitle: copy["signIn.subtitle"],
              ageRule: copy["signIn.ageRule"],
              ageConfirm: copy["signIn.ageConfirm"],
              ageError: copy["signIn.ageError"],
              googleButton: copy["signIn.googleButton"],
              or: copy["signIn.or"],
              emailLabel: copy["signIn.emailLabel"],
              emailButton: copy["signIn.emailButton"],
              emailInvalid: copy["signIn.emailInvalid"],
              emailSent: copy["signIn.emailSent"],
              previewNotice: copy["signIn.previewNotice"],
              error: copy["signIn.error"],
            }}
          />
        </Suspense>
        <Link
          href="/"
          className="inline-flex min-h-11 items-center justify-center text-[15px] font-semibold text-primary-ink underline"
        >
          {copy["signIn.backHome"]}
        </Link>
      </main>
    </div>
  );
}
