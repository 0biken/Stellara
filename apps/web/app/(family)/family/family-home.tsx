"use client";

import { formatMessage, getCatalogue } from "@stellara/i18n";
import { Button, ProfilePicker, buttonClasses } from "@stellara/ui";
import { useEffect, useState } from "react";

import { getFamilyApi, type ChildSummary } from "../../../lib/family";

type State =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; consented: boolean; children: ChildSummary[] };

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** The parent's home: an empty state until a child exists, then "Who's learning today?". */
export function FamilyHome() {
  const copy = getCatalogue("en-NG");
  const [state, setState] = useState<State>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let live = true;
    const api = getFamilyApi();
    Promise.all([api.getConsent(), api.listChildren()])
      .then(([consent, children]) => {
        if (live) setState({ status: "ready", consented: consent !== null, children });
      })
      .catch(() => {
        if (live) setState({ status: "error" });
      });
    return () => {
      live = false;
    };
  }, [attempt]);

  if (state.status === "loading") {
    return (
      <div
        role="status"
        aria-live="polite"
        className="h-40 rounded-3xl bg-sunk motion-safe:animate-pulse"
      >
        <span className="sr-only">{copy["shell.loading"]}</span>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div
        role="alert"
        className="flex flex-col items-start gap-4 rounded-3xl border border-line bg-surface p-8"
      >
        <p className="m-0 text-base">{copy["family.loadError"]}</p>
        <Button variant="quiet" size="adult" onClick={() => setAttempt((n) => n + 1)}>
          {copy["family.tryAgain"]}
        </Button>
      </div>
    );
  }

  const addHref = state.consented ? "/family/add-child/" : "/family/consent/";

  if (state.children.length === 0) {
    return (
      <section className="flex flex-col items-start gap-4 rounded-3xl border border-line bg-surface p-8 sm:flex-row sm:items-center">
        <img
          src={`${basePath}/assets/auntie-stella/auntie-stella-smiling.svg`}
          alt=""
          width={96}
          height={96}
          className="st-illustration size-24 shrink-0"
        />
        <div className="flex flex-1 flex-col gap-2">
          <h2 className="m-0 font-heading text-[22px] leading-7 font-bold">
            {copy["family.emptyChildTitle"]}
          </h2>
          <p className="m-0 text-base text-muted">{copy["family.emptyChildBody"]}</p>
        </div>
        <a href={`${basePath}${addHref}`} className={buttonClasses("primary", "adult", "shrink-0")}>
          {copy["family.addChild"]}
        </a>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-6">
      <h2 className="m-0 font-heading text-[22px] leading-7 font-bold">{copy["profiles.title"]}</h2>
      <ProfilePicker
        title={copy["profiles.title"]}
        profiles={state.children.map((child) => ({
          id: child.id,
          name: child.first_name,
          picture: child.avatar_key,
          href: `${basePath}/family/child/?id=${encodeURIComponent(child.id)}`,
        }))}
      />
      <div className="flex flex-wrap gap-3">
        {state.children.map((child) => (
          <a
            key={child.id}
            href={`${basePath}/family/reports/?id=${encodeURIComponent(child.id)}`}
            className={buttonClasses("quiet", "adult")}
          >
            {formatMessage("report.read", { name: child.first_name })}
          </a>
        ))}
      </div>
      <div className="flex flex-wrap gap-3">
        <a href={`${basePath}${addHref}`} className={buttonClasses("quiet", "adult")}>
          {copy["family.addAnother"]}
        </a>
        <a href={`${basePath}/family/settings/`} className={buttonClasses("quiet", "adult")}>
          Parent settings
        </a>
      </div>
    </section>
  );
}
