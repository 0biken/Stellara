"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { getContentStudioApi, type ContentSummary } from "../../lib/admin/content";

import { ContentBadge } from "./content-library";
import { useStaff } from "./staff-context";

export function ContentDetail({ kind }: { kind: "item" | "lesson" }) {
  const { api } = useStaff();
  const id = useSearchParams().get("id") ?? "";
  const key = `${api.mode}:${kind}:${id}`;
  const [loaded, setLoaded] = useState<{
    key: string;
    content: ContentSummary | null;
    message: string;
  } | null>(null);
  const content = loaded?.key === key ? loaded.content : null;
  const message = loaded?.key === key ? loaded.message : "Loading content…";
  useEffect(() => {
    let active = true;
    void getContentStudioApi(api.mode)
      .then((studio) => studio.getVersion(id))
      .then(
        (row) => {
          if (!active) return;
          if (!row || row.kind !== kind) {
            setLoaded({ key, content: null, message: "This content could not be found." });
            return;
          }
          setLoaded({ key, content: row, message: "" });
        },
        () => {
          if (active)
            setLoaded({
              key,
              content: null,
              message: "Content authoring is not connected to the live backend yet.",
            });
        },
      );
    return () => {
      active = false;
    };
  }, [api.mode, id, kind, key]);
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <Link href="/admin/content/" className="text-sm text-primary underline">
        ← Content library
      </Link>
      {!content ? (
        <p role="status">{message}</p>
      ) : (
        <>
          <header>
            <ContentBadge status={content.status} />
            <h1 className="mt-4 font-heading text-3xl font-bold">{content.title}</h1>
          </header>
          <dl className="grid grid-cols-2 gap-6 rounded-2xl border border-line bg-surface p-6">
            {[
              ["Subject", content.subject],
              ["Topic", content.topic],
              ["Year", content.year],
              ["Version", `v${content.version}`],
              ["Owner", content.ownerName],
              ["Purpose", content.purpose.replaceAll("_", " ")],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-sm text-muted">{label}</dt>
                <dd className="mt-1 font-semibold">{value}</dd>
              </div>
            ))}
          </dl>
          <p className="rounded-xl border border-line p-4 text-sm text-muted">
            This is the content record preview. Editing and review decisions are the next
            implementation milestone.
          </p>
        </>
      )}
    </div>
  );
}
