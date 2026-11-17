import { getCatalogue } from "@stellara/i18n";
import Link from "next/link";
import { ViewTransition, type ReactNode } from "react";

import { ThemeToggle } from "./theme-toggle";

/** Wordmark, Appearance toggle and an optional action slot (sign-out on portal pages). */
export function SiteHeader({ children }: { children?: ReactNode }) {
  const copy = getCatalogue("en-NG");
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

  return (
    <header className="border-b border-line">
      <div className="mx-auto flex max-w-[1120px] items-center justify-between gap-4 px-6 py-4">
        <ViewTransition name="brand">
          <Link
            href="/"
            aria-label={copy["landing.nav.homeAriaLabel"]}
            className="flex min-h-11 shrink-0 items-center gap-2.5 no-underline"
          >
            <img
              src={`${basePath}/assets/logo/stellara-mark.svg`}
              alt=""
              width={36}
              height={36}
              className="st-illustration size-9"
            />
            <span
              className={`font-heading text-2xl font-extrabold tracking-[-0.02em] text-primary-ink ${
                children ? "hidden min-[420px]:inline" : ""
              }`}
            >
              {copy["landing.wordmark"]}
            </span>
          </Link>
        </ViewTransition>
        <div className="flex items-center gap-2">
          <ThemeToggle
            lightLabel={copy["landing.theme.toLight"]}
            darkLabel={copy["landing.theme.toDark"]}
            switchToLightLabel={copy["landing.theme.switchToLight"]}
            switchToDarkLabel={copy["landing.theme.switchToDark"]}
          />
          {children}
        </div>
      </div>
    </header>
  );
}
