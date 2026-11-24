"use client";

import { Button, Select, TextInput } from "@stellara/ui";
import { useCallback, useEffect, useState } from "react";

import {
  AdminError,
  roleLabels,
  staffRoles,
  type AuditEntry,
  type StaffMember,
  type SupportResult,
} from "../../lib/admin/types";

import { useStaff } from "./staff-context";

const control =
  "mt-2 block min-h-11 w-full rounded-lg border border-line-strong bg-surface px-3 py-2";
const uuid = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
function useAdminFailure() {
  const { refresh } = useStaff();
  const [error, setError] = useState("");
  const fail = useCallback(
    (failure: unknown) => {
      if (
        failure instanceof AdminError &&
        ["FORBIDDEN", "SIGNED_OUT", "MFA_REQUIRED"].includes(failure.code)
      ) {
        refresh();
        return;
      }
      setError("The request could not be completed. Check your connection and try again.");
    },
    [refresh],
  );
  return { error, setError, fail };
}
export function TeamScreen() {
  const { api, session } = useStaff();
  const { error, setError, fail } = useAdminFailure();
  const [rows, setRows] = useState<StaffMember[] | null>(null);
  const [id, setId] = useState("");
  const [role, setRole] = useState<StaffMember["role"]>("author");
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<boolean | null>(null);
  const load = useCallback(() => {
    setError("");
    void api.listStaff().then(setRows, fail);
  }, [api, setError, fail]);
  useEffect(load, [load]);
  async function save(active: boolean) {
    setBusy(true);
    setError("");
    try {
      await api.setStaffRole({
        user_id: id,
        role: active ? role : (rows?.find((row) => row.user_id === id)?.role ?? role),
        active,
      });
      setConfirm(null);
      setId("");
      load();
    } catch (failure) {
      fail(failure);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-heading text-3xl font-bold">Staff team</h1>
        <p className="mt-3 text-muted">
          Assign responsibilities to existing staff accounts. Your own role cannot be changed here.
        </p>
      </header>
      <form
        className="grid max-w-3xl gap-4 rounded-2xl border border-line bg-surface p-6 sm:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (id === session.userId) {
            setError("You cannot change your own staff access.");
            return;
          }
          setConfirm(true);
        }}
      >
        <label htmlFor="staff-user" className="text-sm font-semibold">
          Auth user ID
          <TextInput
            id="staff-user"
            className="mt-2"
            required
            pattern={uuid.source}
            value={id}
            onChange={(event) => {
              setId(event.target.value);
              setConfirm(null);
            }}
          />
        </label>
        <label htmlFor="staff-role" className="text-sm font-semibold">
          Role
          <Select
            id="staff-role"
            className="mt-2"
            value={role}
            onChange={(event) => {
              setRole(event.target.value as StaffMember["role"]);
              setConfirm(null);
            }}
          >
            {staffRoles.map((value) => (
              <option key={value} value={value}>
                {roleLabels[value]}
              </option>
            ))}
          </Select>
        </label>
        <div className="flex flex-wrap gap-3 sm:col-span-2">
          <Button type="submit" disabled={busy}>
            Assign role
          </Button>
          <Button
            variant="quiet"
            disabled={busy || !uuid.test(id) || id === session.userId}
            onClick={() => setConfirm(false)}
          >
            Deactivate access
          </Button>
        </div>
        {confirm !== null && (
          <section
            className="rounded-xl border border-line p-4 sm:col-span-2"
            aria-label="Confirm staff change"
          >
            <p>
              {confirm
                ? `Assign ${roleLabels[role]} access to ${id}?`
                : `Deactivate staff access for ${id}?`}
            </p>
            <div className="mt-4 flex gap-3">
              <Button loading={busy} onClick={() => void save(confirm)}>
                Confirm change
              </Button>
              <Button variant="quiet" disabled={busy} onClick={() => setConfirm(null)}>
                Cancel
              </Button>
            </div>
          </section>
        )}
      </form>
      {error && <p role="alert">{error}</p>}
      {!rows ? (
        <div>
          <p role="status">Loading staff…</p>
          {error && (
            <Button onClick={load} variant="quiet">
              Retry
            </Button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Staff accounts</caption>
            <thead>
              <tr>
                {["Account", "Role", "Access"].map((label) => (
                  <th key={label} scope="col" className="border-b border-line px-5 py-4">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.user_id} className="border-b border-line last:border-0">
                  <th scope="row" className="max-w-80 break-all px-5 py-4 text-left font-normal">
                    {row.user_id}
                    {row.user_id === session.userId && (
                      <span className="ml-2 text-muted">(you)</span>
                    )}
                  </th>
                  <td className="px-5 py-4">{roleLabels[row.role]}</td>
                  <td className="px-5 py-4">{row.active ? "Active" : "Inactive"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && <p className="p-6">No staff accounts returned.</p>}
        </div>
      )}
    </div>
  );
}
export function SupportScreen() {
  const { api } = useStaff();
  const { error, setError, fail } = useAdminFailure();
  const [id, setId] = useState("");
  const [reason, setReason] = useState("");
  const [result, setResult] = useState<SupportResult | null>(null);
  const [busy, setBusy] = useState(false);
  async function lookup() {
    setResult(null);
    setBusy(true);
    setError("");
    try {
      setResult(await api.lookupChild({ childId: id, reason: reason.trim() }));
    } catch (failure) {
      fail(failure);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <header>
        <h1 className="font-heading text-3xl font-bold">Family support</h1>
        <p className="mt-3 text-muted">
          Look up a specific child using their ID. Every lookup is recorded with your reason.
        </p>
      </header>
      <form
        className="grid gap-5 rounded-2xl border border-line bg-surface p-6"
        onSubmit={(event) => {
          event.preventDefault();
          void lookup();
        }}
      >
        <label htmlFor="support-child" className="text-sm font-semibold">
          Child ID
          <TextInput
            id="support-child"
            className="mt-2"
            required
            pattern={uuid.source}
            value={id}
            onChange={(event) => {
              setId(event.target.value);
              setResult(null);
            }}
          />
        </label>
        <label htmlFor="support-reason" className="text-sm font-semibold">
          Reason for access
          <textarea
            id="support-reason"
            required
            minLength={10}
            maxLength={500}
            className={control}
            value={reason}
            onChange={(event) => {
              setReason(event.target.value);
              setResult(null);
            }}
          />
          <span className="mt-2 block text-xs font-normal text-muted">
            10–500 characters. Include the support purpose; avoid unnecessary personal information.
          </span>
        </label>
        <div>
          <Button type="submit" loading={busy}>
            View limited profile
          </Button>
        </div>
      </form>
      {error && <p role="alert">{error}</p>}
      {result &&
        (result.child ? (
          <section
            className="rounded-2xl border border-line bg-surface p-6"
            aria-label="Support result"
          >
            <h2 className="font-heading text-xl font-bold">{result.child.first_name}</h2>
            <dl className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <dt className="text-sm text-muted">Year</dt>
                <dd>{result.child.year}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted">Status</dt>
                <dd>{result.child.status.replaceAll("_", " ")}</dd>
              </div>
            </dl>
            <h3 className="mt-6 font-semibold">Data requests</h3>
            {result.requests.length === 0 ? (
              <p className="mt-2 text-muted">No data requests recorded.</p>
            ) : (
              <ul className="mt-3 divide-y divide-line">
                {result.requests.map((request) => (
                  <li key={request.id} className="flex flex-wrap justify-between gap-3 py-3">
                    <span>
                      {request.kind} · {request.status}
                    </span>
                    <span className="text-sm text-muted">
                      Due {new Date(request.due_at).toLocaleDateString("en-NG")}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : (
          <p role="status">No child found for that ID.</p>
        ))}
    </div>
  );
}
export function AuditScreen() {
  const { api } = useStaff();
  const { error, setError, fail } = useAdminFailure();
  const [rows, setRows] = useState<AuditEntry[] | null>(null);
  const load = useCallback(() => {
    void api.getAudit().then(setRows, fail);
  }, [api, fail]);
  useEffect(load, [load]);
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold">Audit history</h1>
          <p className="mt-3 text-muted">Latest 100 staff actions. Records are read-only.</p>
        </div>
        <Button
          variant="quiet"
          onClick={() => {
            setRows(null);
            setError("");
            load();
          }}
        >
          Refresh history
        </Button>
      </header>
      {error && <p role="alert">{error}</p>}
      {!rows && !error ? (
        <p role="status">Loading audit history…</p>
      ) : rows?.length === 0 ? (
        <p className="rounded-2xl border border-line bg-surface p-8">No audit records returned.</p>
      ) : (
        rows && (
          <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
            <table className="w-full min-w-[800px] text-left text-sm">
              <caption className="sr-only">Latest audit records</caption>
              <thead>
                <tr>
                  {["When", "Action", "Actor", "Record"].map((label) => (
                    <th key={label} scope="col" className="border-b border-line px-5 py-4">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-line last:border-0">
                    <td className="whitespace-nowrap px-5 py-4">
                      {new Date(row.created_at).toLocaleString("en-NG", {
                        timeZone: "Africa/Lagos",
                      })}
                    </td>
                    <th scope="row" className="px-5 py-4 font-semibold">
                      {row.action.replaceAll("-", " ")}
                    </th>
                    <td className="max-w-64 break-all px-5 py-4">
                      {row.actor_id}
                      <span className="block text-xs text-muted">
                        {row.actor_role.replaceAll("_", " ")}
                      </span>
                    </td>
                    <td className="max-w-64 break-all px-5 py-4">
                      {row.entity}
                      <span className="block text-xs text-muted">{row.entity_id}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}
