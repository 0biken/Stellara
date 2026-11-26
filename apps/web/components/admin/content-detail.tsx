"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import {
  canWriteDrafts,
  emptyItemDraft,
  getContentStudioApi,
  type ContentSummary,
  type ItemDraft,
} from "../../lib/admin/content";

import { ContentBadge } from "./content-library";
import { ItemEditor } from "./item-editor";
import { useStaff } from "./staff-context";

export function ContentDetail({ kind }: { kind: "item" | "lesson" }) {
  const { api, session } = useStaff();
  const { role, userId } = session;
  const id = useSearchParams().get("id") ?? "";
  const key = `${api.mode}:${role}:${userId}:${kind}:${id}`;
  const newDraft = api.mode === "demo" && kind === "item" && !id && canWriteDrafts(session);
  const [loaded, setLoaded] = useState<{
    key: string;
    content: ContentSummary | null;
    draft?: ItemDraft | null;
    message: string;
  } | null>(null);
  const content = loaded?.key === key ? loaded.content : null;
  const message = loaded?.key === key ? loaded.message : "Loading content…";
  useEffect(() => {
    if (newDraft) return;
    let active = true;
    void getContentStudioApi(api.mode)
      .then(async (studio) => {
        const row = await studio.getVersion(id);
        const draft =
          row?.kind === "item" && kind === "item"
            ? await studio.getItemDraft({ role, userId }, id)
            : null;
        return { row, draft };
      })
      .then(
        ({ row, draft }) => {
          if (!active) return;
          if (!row || row.kind !== kind) {
            setLoaded({ key, content: null, message: "This content could not be found." });
            return;
          }
          setLoaded({ key, content: row, draft, message: "" });
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
  }, [api.mode, id, kind, key, newDraft, role, userId]);
  if (newDraft) return <ItemEditor key={key} initial={emptyItemDraft()} />;
  if (loaded?.key === key && loaded.draft) return <ItemEditor key={key} initial={loaded.draft} />;
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
            This record is available as a read-only preview.
          </p>
        </>
      )}
    </div>
  );
}
