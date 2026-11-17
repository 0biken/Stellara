"use client";

import { formatMessage as m } from "@stellara/i18n";
import { Button, EmptyState, SetCard, Sky } from "@stellara/ui";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { ChildFrame, Loading, Problem } from "./child-frame";
import { auntie, basePath } from "./use-child";

import type { ChildProfile, LearningApi, SkyData } from "../../lib/learning";

const PLACEMENT_LATER = "stellara.placement.later";

function SkyView({ api, child }: { api: LearningApi; child: ChildProfile }) {
  const router = useRouter();
  const [sky, setSky] = useState<SkyData | null>(null);
  const [failed, setFailed] = useState(false);
  // ChildFrame only mounts this on the client, so storage can be read up front.
  const [placementLater, setPlacementLater] = useState(() => {
    try {
      return window.localStorage.getItem(`${PLACEMENT_LATER}.${child.id}`) === "1";
    } catch {
      return false;
    }
  });

  const load = useCallback(() => {
    api.getSky().then(setSky, () => setFailed(true));
  }, [api]);
  useEffect(load, [load]);

  if (failed)
    return (
      <Problem
        onRetry={() => {
          setFailed(false);
          load();
        }}
      />
    );
  if (!sky) return <Loading />;

  const started = sky.topics.some((t) => t.level !== "not_assessed");
  const greeting = sky.first_visit
    ? m("child.greetingFirst", { name: child.first_name })
    : m("child.greetingReturning", { name: child.first_name });

  return (
    <>
      <h1 className="m-0 font-heading text-[28px] leading-9 font-extrabold text-balance">
        {greeting}
      </h1>

      {sky.today && (
        <SetCard
          topic={sky.today.topic_title}
          title={m("todaySet.title")}
          detail={m("todaySet.detail", {
            count: sky.today.questions,
            minutes: sky.today.minutes,
          })}
          action={{
            label: m("todaySet.start"),
            href: `${basePath}/practice/?topic=${sky.today.topic_id}`,
          }}
        />
      )}

      {!sky.placement_done && !placementLater && (
        <section className="flex flex-col gap-3 rounded-lg bg-hint p-5">
          <h2 className="m-0 font-heading text-xl font-bold">{m("placement.cardTitle")}</h2>
          <p className="m-0 text-[17px] leading-7">{m("placement.cardBody")}</p>
          <div className="flex flex-wrap gap-3">
            <Button size="child" onClick={() => router.push("/placement/")}>
              {m("placement.start")}
            </Button>
            <Button
              size="child"
              variant="text"
              onClick={() => {
                setPlacementLater(true);
                try {
                  window.localStorage.setItem(`${PLACEMENT_LATER}.${child.id}`, "1");
                } catch {
                  /* Shown again next time. */
                }
              }}
            >
              {m("placement.later")}
            </Button>
          </div>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="m-0 font-heading text-xl font-bold">{m("sky.title")}</h2>
        {!started && (
          <EmptyState title={m("empty.title")} avatarSrc={auntie("listening")} avatarAlt="">
            {m("empty.description")}
          </EmptyState>
        )}
        <Sky
          label={m("sky.title")}
          stars={sky.topics.map((t) => ({
            id: t.id,
            x: t.x,
            y: t.y,
            level: t.level,
            label: m("star.label", { topic: t.title, state: m(`star.${t.level}`) }),
          }))}
          links={sky.links.map((l) => ({
            ...l,
            lit: [l.from, l.to].every(
              (id) => sky.topics.find((t) => t.id === id)?.level !== "not_assessed",
            ),
          }))}
          onSelect={(id) => router.push(`/learn/?topic=${id}`)}
        />
      </section>
    </>
  );
}

export function SkyScreen() {
  return <ChildFrame>{(ctx) => <SkyView {...ctx} />}</ChildFrame>;
}
