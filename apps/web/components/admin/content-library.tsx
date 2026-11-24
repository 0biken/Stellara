"use client";

import { Button, Select, TextInput } from "@stellara/ui";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import {
  getContentStudioApi,
  itemTypeLabels,
  itemTypes,
  readFilters,
  statusLabels,
  writeFilters,
  type ContentPage,
  type EditorialStatus,
} from "../../lib/admin/content";

import { useStaff } from "./staff-context";

export function ContentBadge({ status }: { status: EditorialStatus }) {
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold ${status === "published" || status === "approved" ? "border-primary bg-hint text-text" : status === "changes_requested" ? "border-line-strong bg-surface text-text" : "border-line bg-bg text-muted"}`}
    >
      {statusLabels[status]}
    </span>
  );
}
export function ContentLibrary({ queue }: { queue?: "reviews" | "publishing" }) {
  const { api, session } = useStaff();
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname().replace(/\/$/, "");
  const filters = readFilters(new URLSearchParams(params.toString()));
  if (queue) filters.status = queue === "reviews" ? "in_review" : "approved";
  const [loaded, setLoaded] = useState<{
    key: string;
    result: ContentPage | null;
    error: string;
  } | null>(null);
  const [draftSearch, setDraftSearch] = useState({ base: filters.query, value: filters.query });
  if (draftSearch.base !== filters.query)
    setDraftSearch({ base: filters.query, value: filters.query });
  const search = draftSearch.value;
  const setSearch = (value: string) => setDraftSearch({ base: filters.query, value });
  const [retry, setRetry] = useState(0);
  const serial = useRef(0);
  const query = writeFilters(filters);
  const loadKey = `${api.mode}:${query}:${retry}`;
  const result = loaded?.key === loadKey ? loaded.result : null;
  const error = loaded?.key === loadKey ? loaded.error : "";
  const change = (key: keyof typeof filters, value: string | number) => {
    const next = {
      ...filters,
      [key]: value,
      page: key === "page" ? Number(value) : 1,
      ...(key === "kind" ? { type: "", purpose: "" } : {}),
    };
    router.replace(`${pathname}/?${writeFilters(next)}`, { scroll: false });
  };
  useEffect(() => {
    if (search === filters.query) return;
    const timer = setTimeout(() => {
      router.replace(
        `${pathname}/?${writeFilters({ ...readFilters(new URLSearchParams(query)), query: search, page: 1 })}`,
        { scroll: false },
      );
    }, 300);
    return () => clearTimeout(timer);
  }, [search, filters.query, pathname, router, query]);
  useEffect(() => {
    const request = ++serial.current;
    const controller = new AbortController();
    void getContentStudioApi(api.mode)
      .then((studio) =>
        studio.listContent(readFilters(new URLSearchParams(query)), controller.signal),
      )
      .then(
        (data) => {
          if (request === serial.current && !controller.signal.aborted)
            setLoaded({ key: loadKey, result: data, error: "" });
        },
        (failure: Error) => {
          if (request === serial.current && !controller.signal.aborted)
            setLoaded({ key: loadKey, result: null, error: failure.message });
        },
      );
    return () => controller.abort();
  }, [api.mode, query, loadKey]);
  const title =
    queue === "reviews"
      ? "Review queue"
      : queue === "publishing"
        ? "Publishing"
        : "Content library";
  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="mb-2 text-sm font-semibold text-primary">Content studio</p>
        <h1 className="font-heading text-3xl font-extrabold">{title}</h1>
        <p className="mt-3 max-w-2xl text-muted">
          {queue === "reviews"
            ? "Questions and lessons waiting for an independent review."
            : queue === "publishing"
              ? "Approved versions awaiting publication checks. Live publishing is not connected yet."
              : "Find questions and lessons across topics, versions and editorial stages."}
        </p>
      </header>
      <div className="flex gap-2" aria-label="Content kind">
        {(["item", "lesson"] as const).map((kind) => (
          <Button
            key={kind}
            variant={filters.kind === kind ? "primary" : "quiet"}
            aria-pressed={filters.kind === kind}
            onClick={() => change("kind", kind)}
          >
            {kind === "item" ? "Questions" : "Lessons"}
          </Button>
        ))}
      </div>
      <section
        className="rounded-2xl border border-line bg-surface p-5"
        aria-label="Library filters"
      >
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <label className="text-sm font-semibold xl:col-span-2" htmlFor="library-search">
            Search
            <TextInput
              id="library-search"
              value={search}
              placeholder="Title, topic or author"
              onChange={(event) => setSearch(event.target.value)}
              className="mt-2"
            />
          </label>
          {[
            { key: "year", label: "Year", values: ["P4", "P5", "P6"] },
            { key: "subject", label: "Subject", values: ["Mathematics", "English"] },
            {
              key: "topic",
              label: "Topic",
              values: ["Fractions", "Angles", "Reading comprehension", "Vocabulary"],
            },
            { key: "type", label: "Question type", values: [...itemTypes] },
            { key: "purpose", label: "Purpose", values: ["practice", "placement", "lesson_check"] },
            { key: "status", label: "Status", values: Object.keys(statusLabels) },
            {
              key: "owner",
              label: "Owner",
              values: [session.userId, "demo-author", "demo-publisher"],
            },
          ]
            .filter(
              (field) =>
                !(queue && field.key === "status") &&
                !(filters.kind === "lesson" && field.key === "type"),
            )
            .map((field) => (
              <label
                key={field.key}
                htmlFor={`filter-${field.key}`}
                className="text-sm font-semibold"
              >
                {field.label}
                <Select
                  id={`filter-${field.key}`}
                  className="mt-2"
                  value={String(filters[field.key as keyof typeof filters])}
                  onChange={(event) =>
                    change(field.key as keyof typeof filters, event.target.value)
                  }
                >
                  <option value="">All</option>
                  {[...new Set(field.values)].map((value) => (
                    <option key={value} value={value}>
                      {field.key === "status"
                        ? statusLabels[value as EditorialStatus]
                        : field.key === "type"
                          ? itemTypeLabels[value as keyof typeof itemTypeLabels]
                          : value === session.userId
                            ? "Assigned to me"
                            : value === "demo-author"
                              ? "Amara Okafor"
                              : value === "demo-publisher"
                                ? "Tunde Bello"
                                : value.replaceAll("_", " ")}
                    </option>
                  ))}
                </Select>
              </label>
            ))}
        </div>
        <Button
          variant="text"
          className="mt-4"
          onClick={() => {
            setSearch("");
            router.replace(`${pathname}/`, { scroll: false });
          }}
        >
          Clear filters
        </Button>
      </section>
      {error ? (
        <section className="rounded-2xl border border-line bg-surface p-6">
          <p role="alert">{error}</p>
          <Button className="mt-4" variant="quiet" onClick={() => setRetry((value) => value + 1)}>
            Retry
          </Button>
        </section>
      ) : !result ? (
        <p role="status">Loading content…</p>
      ) : (
        <>
          <div className="flex justify-between gap-4 text-sm text-muted">
            <p aria-live="polite">
              {result.total} {filters.kind === "lesson" ? "lessons" : "questions"} found
            </p>
            <p>
              Page {result.page} of {result.pages}
            </p>
          </div>
          {result.rows.length === 0 ? (
            <section className="rounded-2xl border border-line bg-surface p-10 text-center">
              <h2 className="font-heading text-xl font-bold">No content matches</h2>
              <p className="mt-2 text-muted">Try another search or clear your filters.</p>
            </section>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
              <table className="w-full min-w-[960px] text-left text-sm">
                <caption className="sr-only">{title}</caption>
                <thead className="border-b border-line bg-bg text-xs text-muted">
                  <tr>
                    {[
                      "Title",
                      "Topic / subject",
                      "Year",
                      "Type / purpose",
                      "Status",
                      "Version",
                      "Owner",
                      "Updated",
                    ].map((label) => (
                      <th scope="col" key={label} className="px-4 py-4 font-semibold">
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((row) => (
                    <tr key={row.id} className="border-b border-line last:border-0 hover:bg-bg">
                      <th scope="row" className="max-w-72 px-4 py-5 font-semibold">
                        <Link
                          href={`/admin/content/${row.kind}/?id=${encodeURIComponent(row.id)}`}
                          className="text-primary underline decoration-transparent hover:decoration-current"
                        >
                          {row.title}
                        </Link>
                      </th>
                      <td className="px-4 py-5">
                        {row.topic}
                        <span className="mt-1 block text-xs text-muted">{row.subject}</span>
                      </td>
                      <td className="px-4 py-5">{row.year}</td>
                      <td className="px-4 py-5">
                        {row.type === "lesson" ? "Lesson cards" : itemTypeLabels[row.type]}
                        <span className="mt-1 block text-xs text-muted">
                          {row.purpose.replaceAll("_", " ")}
                        </span>
                      </td>
                      <td className="px-4 py-5">
                        <ContentBadge status={row.status} />
                      </td>
                      <td className="px-4 py-5">v{row.version}</td>
                      <td className="px-4 py-5">{row.ownerName}</td>
                      <td className="whitespace-nowrap px-4 py-5">
                        {new Date(row.updatedAt).toLocaleDateString("en-NG", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          timeZone: "Africa/Lagos",
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <nav aria-label="Content pagination" className="flex items-center justify-between">
            <Button
              variant="quiet"
              disabled={result.page <= 1}
              onClick={() => change("page", result.page - 1)}
            >
              Previous
            </Button>
            <span className="text-sm text-muted">25 per page</span>
            <Button
              variant="quiet"
              disabled={result.page >= result.pages}
              onClick={() => change("page", result.page + 1)}
            >
              Next
            </Button>
          </nav>
        </>
      )}
    </div>
  );
}
