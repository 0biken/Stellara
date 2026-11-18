"use client";

import { formatMessage, getCatalogue } from "@stellara/i18n";
import { Picture, PictureKey, buttonClasses, pictureIds, type PictureId } from "@stellara/ui";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { getFamilyApi, type ChildSummary } from "../../../../lib/family";

type State =
  | { status: "loading" }
  | { status: "missing" }
  | { status: "ready"; child: ChildSummary }
  | { status: "checking"; child: ChildSummary };

type Notice = "incorrect" | "locked" | "error" | null;

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** KID-01 on the family device: the child taps their picture key, then goes to their sky. */
export function ChildSignIn() {
  const copy = getCatalogue("en-NG");
  const router = useRouter();
  const childId = useSearchParams().get("id");
  const [state, setState] = useState<State>({ status: "loading" });
  const [notice, setNotice] = useState<Notice>(null);
  const [round, setRound] = useState(0);

  useEffect(() => {
    let live = true;
    getFamilyApi()
      .listChildren()
      .then((children) => {
        const child = children.find((c) => c.id === childId);
        if (live) setState(child ? { status: "ready", child } : { status: "missing" });
      })
      .catch(() => {
        if (live) setState({ status: "missing" });
      });
    return () => {
      live = false;
    };
  }, [childId]);

  const back = (
    <a href={`${basePath}/family/`} className={buttonClasses("text", "adult", "self-start")}>
      {copy["childSignIn.back"]}
    </a>
  );

  if (state.status === "loading") {
    return (
      <div role="status" className="h-40 rounded-3xl bg-sunk motion-safe:animate-pulse">
        <span className="sr-only">{copy["shell.loading"]}</span>
      </div>
    );
  }
  if (state.status === "missing") {
    return (
      <div className="flex flex-col gap-4">
        <p role="alert" className="m-0 text-lg">
          {copy["childSignIn.notFound"]}
        </p>
        {back}
      </div>
    );
  }

  const { child } = state;
  const labels = Object.fromEntries(
    pictureIds.map((id) => [id, copy[`pictureKey.${id}` as keyof typeof copy]]),
  ) as Record<PictureId, string>;

  const check = async (pin: PictureId[]) => {
    setState({ status: "checking", child });
    setNotice(null);
    try {
      const result = await getFamilyApi().signInChild(child, pin);
      if (result.status === "signed-in") {
        router.push("/sky/");
        return;
      }
      setNotice(result.status);
    } catch {
      setNotice("error");
    }
    setRound((n) => n + 1);
    setState({ status: "ready", child });
  };

  return (
    <div className="mx-auto flex w-full max-w-[480px] flex-col items-center gap-6 text-center">
      <span className="grid size-24 place-items-center rounded-full bg-primary-tint">
        <Picture id={child.avatar_key} size={56} />
      </span>
      <h1 className="m-0 font-heading text-[32px] leading-[38px] font-extrabold">
        {child.first_name}
      </h1>
      {notice && (
        <p role="alert" className="m-0 text-base font-medium">
          {
            copy[
              notice === "incorrect"
                ? "childSignIn.incorrect"
                : notice === "locked"
                  ? "childSignIn.locked"
                  : "childSignIn.error"
            ]
          }
        </p>
      )}
      {state.status === "checking" ? (
        <p role="status" className="m-0 text-base text-muted">
          {copy["childSignIn.checking"]}
        </p>
      ) : (
        <PictureKey
          key={round}
          labels={labels}
          prompt={copy["pictureKey.prompt"]}
          enteredLabel={(count) => formatMessage("pictureKey.progress", { count })}
          removeLabel={copy["pictureKey.removeLast"]}
          clearLabel={copy["pictureKey.reset"]}
          onComplete={(sequence) => void check([...sequence] as PictureId[])}
        />
      )}
      {back}
    </div>
  );
}
