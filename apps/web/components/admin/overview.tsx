"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { navigationFor } from "../../lib/admin/permissions";
import { AdminError, roleLabels, type RequestCount } from "../../lib/admin/types";

import { useStaff } from "./staff-context";

const descriptions: Record<string, string> = {
  "/admin/content": "Find questions and lessons, check their status, and continue editing.",
  "/admin/reviews": "Check submitted content, verify answers, and give authors clear feedback.",
  "/admin/publishing": "Inspect approved versions and their remaining publication checks.",
  "/admin/team": "Manage staff roles and deactivate access when responsibilities change.",
  "/admin/support": "Look up a child by ID with a recorded reason for access.",
  "/admin/audit": "Read the latest staff actions and support access records.",
  "/admin/security": "Set up or verify the authenticator for your staff account.",
};
function RequestOverview() {
  const { api, refresh } = useStaff();
  const [rows, setRows] = useState<RequestCount[] | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    void api.getOperations().then(
      (result) => {
        if (active) setRows(result.requests);
      },
      (failure: unknown) => {
        if (!active) return;
        if (
          failure instanceof AdminError &&
          ["FORBIDDEN", "SIGNED_OUT", "MFA_REQUIRED"].includes(failure.code)
        )
          refresh();
        else setError("Request counts could not be loaded.");
      },
    );
    return () => {
      active = false;
    };
  }, [api, refresh, retry]);
  return (
    <section
      className="rounded-2xl border border-line bg-surface p-6"
      aria-label="Request overview"
    >
      <h2 className="font-heading text-xl font-bold">Data requests</h2>
      {error ? (
        <div>
          <p role="alert" className="mt-3">
            {error}
          </p>
          <button
            className="mt-3 min-h-11 text-primary underline"
            onClick={() => {
              setRows(null);
              setError("");
              setRetry((value) => value + 1);
            }}
          >
            Retry request counts
          </button>
        </div>
      ) : !rows ? (
        <p role="status" className="mt-3 text-muted">
          Loading request counts…
        </p>
      ) : rows.length === 0 ? (
        <p className="mt-3 text-sm text-muted">No data requests recorded.</p>
      ) : (
        <dl className="mt-4 grid gap-4 sm:grid-cols-3">
          {rows.map((row) => (
            <div key={`${row.kind}:${row.status}`}>
              <dt className="text-sm capitalize text-muted">
                {row.kind} · {row.status}
              </dt>
              <dd className="mt-1 font-heading text-2xl font-bold">{row.count}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}
export function AdminOverview() {
  const { session } = useStaff();
  const links = navigationFor(session.role).filter((entry) => entry.href !== "/admin");
  return (
    <div className="flex flex-col gap-8">
      <header className="max-w-2xl">
        <p className="mb-3 text-sm font-semibold text-primary">{roleLabels[session.role]}</p>
        <h1 className="font-heading text-3xl font-extrabold tracking-tight md:text-4xl">
          Your workspace
        </h1>
        <p className="mt-3 text-muted">
          Choose a workspace to continue. Content, review and administration tools follow your staff
          permissions.
        </p>
      </header>
      {["super_admin", "admin"].includes(session.role) && <RequestOverview />}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {links.map((entry) => (
          <Link
            key={entry.href}
            href={`${entry.href}/`}
            className="group flex flex-col gap-3 rounded-2xl border border-line bg-surface p-6 hover:border-primary"
          >
            <span className="text-xs font-semibold tracking-wider text-muted uppercase">
              {entry.section}
            </span>
            <h2 className="font-heading text-xl font-bold group-hover:text-primary">
              {entry.label}
            </h2>
            <p className="text-sm leading-6 text-muted">{descriptions[entry.href]}</p>
            <span className="mt-auto pt-3 text-sm font-semibold text-primary">
              Open workspace <span aria-hidden="true">→</span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
