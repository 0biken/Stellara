import { getCatalogue } from "@stellara/i18n";
import Link from "next/link";
import { ViewTransition } from "react";

import { ThemeToggle } from "../theme-toggle";

import { SignInCard } from "./sign-in-card";

export default function SignInPage() {
  const copy = getCatalogue("en-NG");
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

  return (
    <div className="flex min-h-screen flex-col bg-bg text-text">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-[1120px] items-center justify-between gap-4 px-6 py-4">
          <ViewTransition name="brand">
            <Link
              href="/"
              aria-label={copy["landing.nav.homeAriaLabel"]}
              className="flex min-h-11 items-center gap-2.5 no-underline"
            >
              <img
                src={`${basePath}/assets/logo/stellara-mark.svg`}
                alt=""
                width={36}
                height={36}
                className="st-illustration size-9"
              />
              <span className="font-heading text-2xl font-extrabold tracking-[-0.02em] text-primary-ink">
                {copy["landing.wordmark"]}
              </span>
            </Link>
          </ViewTransition>
          <ThemeToggle
            lightLabel={copy["landing.theme.toLight"]}
            darkLabel={copy["landing.theme.toDark"]}
            switchToLightLabel={copy["landing.theme.switchToLight"]}
            switchToDarkLabel={copy["landing.theme.switchToDark"]}
          />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[460px] flex-1 flex-col justify-center gap-6 px-6 py-12">
        <SignInCard
          copy={{
            title: copy["signIn.title"],
            subtitle: copy["signIn.subtitle"],
            ageRule: copy["signIn.ageRule"],
            ageConfirm: copy["signIn.ageConfirm"],
            ageError: copy["signIn.ageError"],
            googleButton: copy["signIn.googleButton"],
            pendingNotice: copy["signIn.pendingNotice"],
          }}
        />
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
