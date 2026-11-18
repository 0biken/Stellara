"use client";

import { Button, Dialog, PictureKey, buttonClasses, pictureIds, type PictureId } from "@stellara/ui";
import { useCallback, useEffect, useState } from "react";

import { ConsentWithdrawDialog } from "../../../../components/family/consent-withdraw-dialog";
import {
  FamilyError,
  getFamilyApi,
  schoolYears,
  type ChildSummary,
  type DataRequestRecord,
  type SchoolYear,
} from "../../../../lib/family";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const pictureLabels: Record<PictureId, string> = {
  sun: "Sun",
  moon: "Moon",
  leaf: "Leaf",
  flower: "Flower",
  fish: "Fish",
  ball: "Ball",
  cup: "Cup",
  house: "House",
  kite: "Kite",
};

export function ParentSettingsClient() {
  const [children, setChildren] = useState<ChildSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [requests, setRequests] = useState<DataRequestRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Edit profile form
  const [firstName, setFirstName] = useState("");
  const [avatarKey, setAvatarKey] = useState<PictureId>("sun");
  const [year, setYear] = useState<SchoolYear>("P5");
  const [examDate, setExamDate] = useState("");
  const [timezone, setTimezone] = useState("Africa/Lagos");

  // PIN reset
  const [newPin, setNewPin] = useState<PictureId[]>([]);
  const [showPinReset, setShowPinReset] = useState(false);

  // Deletion dialog
  const [deleteOpen, setDeleteOpen] = useState(false);

  const selected = children.find((c) => c.id === selectedId) ?? null;

  const syncSelectedForm = useCallback((child: ChildSummary | undefined) => {
    if (!child) return;
    setFirstName(child.first_name);
    setAvatarKey(child.avatar_key);
    setYear(child.year);
    setExamDate(child.exam_date ?? "");
    setTimezone(child.timezone ?? "Africa/Lagos");
  }, []);

  const applyLoaded = useCallback(
    async (list: ChildSummary[]) => {
      setChildren(list);
      const active = list.find((c) => c.id === selectedId) ?? list[0];
      if (active) {
        setSelectedId(active.id);
        syncSelectedForm(active);
        const api = getFamilyApi();
        if (api.listDataRequests) {
          setRequests(await api.listDataRequests(active.id));
        }
      }
    },
    [selectedId, syncSelectedForm],
  );

  const loadAll = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const api = getFamilyApi();
      const list = await api.listChildren();
      await applyLoaded(list);
    } catch {
      setErrorMsg("Could not load family settings.");
    } finally {
      setLoading(false);
    }
  }, [applyLoaded]);

  useEffect(() => {
    let live = true;
    const api = getFamilyApi();
    api
      .listChildren()
      .then(async (list) => {
        if (!live) return;
        await applyLoaded(list);
      })
      .catch(() => {
        if (live) setErrorMsg("Could not load family settings.");
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [applyLoaded]);

  const selectChild = async (child: ChildSummary) => {
    setSelectedId(child.id);
    syncSelectedForm(child);
    setNotice(null);
    setErrorMsg(null);
    const api = getFamilyApi();
    if (api.listDataRequests) {
      setRequests(await api.listDataRequests(child.id));
    }
  };

  const saveProfile = async () => {
    if (!selected) return;
    setNotice(null);
    setErrorMsg(null);
    try {
      const api = getFamilyApi();
      const updated = await api.updateChild?.(selected.id, {
        first_name: firstName,
        avatar_key: avatarKey,
        year,
        exam_date: examDate.trim() || null,
        timezone,
      });
      if (updated) {
        setChildren((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
        setNotice("Profile details updated.");
      }
    } catch {
      setErrorMsg("Please check the profile details and try again.");
    }
  };

  const handlePinReset = async () => {
    if (!selected || newPin.length !== 4) return;
    setNotice(null);
    setErrorMsg(null);
    try {
      const api = getFamilyApi();
      await api.resetChildPin?.(selected.id, newPin);
      setNewPin([]);
      setShowPinReset(false);
      setNotice("Picture PIN reset. Active child sessions have been signed out.");
    } catch {
      setErrorMsg("Could not reset picture PIN.");
    }
  };

  const handleTogglePause = async () => {
    if (!selected) return;
    setNotice(null);
    setErrorMsg(null);
    try {
      const api = getFamilyApi();
      const updated =
        selected.status === "paused"
          ? await api.resumeChild?.(selected.id)
          : await api.pauseChild?.(selected.id);
      if (updated) {
        setChildren((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
        setNotice(updated.status === "paused" ? "Child profile paused." : "Child profile resumed.");
      }
    } catch (error) {
      if (error instanceof FamilyError && error.code === "CONSENT_REQUIRED") {
        setErrorMsg("Consent was withdrawn. Please give verified consent again before resuming.");
      } else {
        setErrorMsg("Could not update child status.");
      }
    }
  };

  const handleWithdraw = async () => {
    if (!selected) return;
    const api = getFamilyApi();
    await api.withdrawConsent?.(selected.id);
    setNotice("Consent withdrawn. Server access stopped immediately.");
    await loadAll();
  };

  const handleExport = async () => {
    if (!selected) return;
    setNotice(null);
    setErrorMsg(null);
    try {
      const api = getFamilyApi();
      const req = await api.requestDataExport?.(selected.id);
      if (req) {
        setRequests((prev) => [req, ...prev.filter((r) => r.id !== req.id)]);
        setNotice("Export request recorded.");
      }
    } catch {
      setErrorMsg("Could not request export.");
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    const api = getFamilyApi();
    const req = await api.requestDataDeletion?.(selected.id, `DELETE ${selected.first_name}`);
    if (req) {
      setRequests((prev) => [req, ...prev.filter((r) => r.id !== req.id)]);
    }
    setDeleteOpen(false);
    setNotice(`${selected.first_name} marked for deletion (completes within 30 days).`);
    await loadAll();
  };

  if (loading) {
    return <p className="text-muted">Loading parent settings…</p>;
  }

  if (children.length === 0) {
    return (
      <section className="flex flex-col gap-4 rounded-3xl border border-line bg-surface p-6">
        <h1 className="m-0 font-heading text-2xl font-bold">Parent settings</h1>
        <p className="m-0 text-muted">No child profiles yet.</p>
        <a href={`${basePath}/family/`} className={buttonClasses("primary", "adult", "self-start")}>
          Back to family
        </a>
      </section>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="m-0 font-heading text-2xl font-bold">Parent settings &amp; data rights</h1>
        <a href={`${basePath}/family/`} className={buttonClasses("quiet", "adult")}>
          Back to family
        </a>
      </div>

      {notice && (
        <p role="status" className="m-0 rounded-xl border border-line bg-surface px-4 py-3 text-sm">
          {notice}
        </p>
      )}
      {errorMsg && (
        <p role="alert" className="m-0 rounded-xl border border-danger bg-surface px-4 py-3 text-sm text-danger">
          {errorMsg}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {children.map((c) => (
          <Button
            key={c.id}
            variant={c.id === selectedId ? "primary" : "quiet"}
            onClick={() => void selectChild(c)}
          >
            {c.first_name} ({c.year})
          </Button>
        ))}
      </div>

      {selected && (
        <div className="flex flex-col gap-6">
          <section className="flex flex-col gap-4 rounded-3xl border border-line bg-surface p-6">
            <h2 className="m-0 font-heading text-xl font-bold">Profile details</h2>
            <label className="flex flex-col gap-1 text-sm font-medium">
              First name
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="rounded-lg border border-line bg-canvas px-3 py-2"
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-3">
              <label className="flex flex-col gap-1 text-sm font-medium">
                School year
                <select
                  value={year}
                  onChange={(e) => setYear(e.target.value as SchoolYear)}
                  className="rounded-lg border border-line bg-canvas px-3 py-2"
                >
                  {schoolYears.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium">
                Goal date
                <input
                  type="date"
                  value={examDate}
                  onChange={(e) => setExamDate(e.target.value)}
                  className="rounded-lg border border-line bg-canvas px-3 py-2"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium">
                Timezone
                <input
                  type="text"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="rounded-lg border border-line bg-canvas px-3 py-2"
                />
              </label>
            </div>
            <fieldset className="flex flex-wrap gap-2 border-0 p-0">
              <legend className="mb-1 text-sm font-medium">Avatar</legend>
              {pictureIds.map((pic) => (
                <Button
                  key={pic}
                  type="button"
                  variant={avatarKey === pic ? "primary" : "quiet"}
                  onClick={() => setAvatarKey(pic)}
                >
                  {pictureLabels[pic]}
                </Button>
              ))}
            </fieldset>
            <Button variant="primary" onClick={() => void saveProfile()} className="self-start">
              Save profile
            </Button>
          </section>

          <section className="flex flex-col gap-4 rounded-3xl border border-line bg-surface p-6">
            <h2 className="m-0 font-heading text-xl font-bold">Access &amp; PIN</h2>
            <p className="m-0 text-sm text-muted">
              Status: <strong>{selected.status ?? "active"}</strong>
            </p>
            <div className="flex flex-wrap gap-3">
              <Button variant="quiet" onClick={() => setShowPinReset((v) => !v)}>
                {showPinReset ? "Cancel PIN reset" : "Reset picture PIN"}
              </Button>
              {selected.status !== "deletion_pending" && (
                <Button variant="quiet" onClick={() => void handleTogglePause()}>
                  {selected.status === "paused" ? "Resume child" : "Pause child"}
                </Button>
              )}
              <ConsentWithdrawDialog childName={selected.first_name} onWithdraw={handleWithdraw} />
            </div>

            {showPinReset && (
              <div className="mt-2 flex flex-col gap-3 rounded-2xl border border-line p-4">
                <PictureKey
                  labels={pictureLabels}
                  prompt="Choose 4 new pictures"
                  enteredLabel={(count) => `${count} of 4 chosen`}
                  removeLabel="Remove last"
                  clearLabel="Clear"
                  onComplete={(seq) => setNewPin(seq)}
                />
                <Button
                  variant="primary"
                  disabled={newPin.length !== 4}
                  onClick={() => void handlePinReset()}
                  className="self-start"
                >
                  Save new PIN
                </Button>
              </div>
            )}
          </section>

          <section className="flex flex-col gap-4 rounded-3xl border border-line bg-surface p-6">
            <h2 className="m-0 font-heading text-xl font-bold">Data rights (NDPA)</h2>
            <div className="flex flex-wrap gap-3">
              <Button variant="quiet" onClick={() => void handleExport()}>
                Export {selected.first_name}&apos;s data
              </Button>
              <Button variant="quiet" onClick={() => setDeleteOpen(true)}>
                Delete {selected.first_name}&apos;s data
              </Button>
            </div>

            {requests.length > 0 && (
              <ul className="m-0 flex list-none flex-col gap-2 p-0 text-sm">
                {requests.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line px-3 py-2">
                    <span>
                      <strong>{r.kind}</strong> — {r.status} (due {r.due_at.slice(0, 10)})
                    </span>
                    {r.download_url && (
                      <a
                        href={r.download_url}
                        download={`stellara-export-${selected.first_name}.json`}
                        className="underline"
                      >
                        Download archive (24h link)
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            )}

            <Dialog
              open={deleteOpen}
              onOpenChange={setDeleteOpen}
              title={`Delete ${selected.first_name}'s learning profile?`}
              description="This immediately marks the profile as deletion pending, revokes all sessions, and permanently deletes learning records within 30 days. Minimal consent evidence is retained for 6 years detached from the profile."
              closeLabel="Cancel"
              confirmation={{
                confirmationText: `DELETE ${selected.first_name}`,
                label: `Type DELETE ${selected.first_name} to confirm`,
                actionLabel: "Confirm deletion",
                onConfirm: () => void handleDelete(),
              }}
            />
          </section>
        </div>
      )}
    </div>
  );
}
