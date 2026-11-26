import { RuntimeError } from "./contracts.js";

import type { GuardianContext } from "./family-admin.js";
import type { ChildRecord, DataRequestServerRecord, RuntimeDeps } from "./ports.js";

export const EXPORT_SLA_MS = 7 * 86_400_000;
export const EXPORT_URL_TTL_MS = 24 * 3_600_000;
export const DELETION_SLA_MS = 30 * 86_400_000;
export const CONSENT_RETENTION_MS = 6 * 365 * 86_400_000;

const SECRET_KEYS = new Set(["pin_hash", "password", "secret", "token", "refresh_token"]);

function sanitizeExport(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitizeExport);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (SECRET_KEYS.has(k)) continue;
      out[k] = sanitizeExport(v);
    }
    return out;
  }
  return value;
}

async function requireOwnedChild(
  deps: RuntimeDeps,
  guardianId: string,
  childId: string,
): Promise<ChildRecord> {
  const child = await deps.store.getChild(childId);
  if (!child) throw new RuntimeError("CHILD_NOT_FOUND");
  if (child.guardian_id !== guardianId) throw new RuntimeError("FORBIDDEN");
  return child;
}

export async function requestDataExport(
  deps: RuntimeDeps,
  ctx: GuardianContext,
  childId: string,
  idempotencyKey = `export:${childId}`,
): Promise<DataRequestServerRecord> {
  const child = await requireOwnedChild(deps, ctx.guardian_id, childId);
  const existing = await deps.store.listDataRequests(child.id);
  const match = existing.find(
    (r) =>
      r.kind === "export" &&
      (r.idempotency_key === idempotencyKey || r.status === "pending" || r.status === "ready"),
  );
  if (match) return match;

  const now = deps.clock.now();
  const record: DataRequestServerRecord = {
    id: deps.ids.uuid(),
    guardian_id: ctx.guardian_id,
    child_id: child.id,
    kind: "export",
    status: "pending",
    idempotency_key: idempotencyKey,
    requested_at: now,
    due_at: now + EXPORT_SLA_MS,
    completed_at: null,
  };
  await deps.store.putDataRequest(record);
  return record;
}

export async function processExportRequest(
  deps: RuntimeDeps,
  requestId: string,
): Promise<DataRequestServerRecord> {
  const req = await deps.store.getDataRequest(requestId);
  if (!req || req.kind !== "export") {
    throw new RuntimeError("DATA_REQUEST_NOT_FOUND");
  }
  if (req.status === "ready" && req.download_url) {
    return req;
  }

  const now = deps.clock.now();
  const raw = await deps.store.collectChildExportData(req.child_id);
  const sanitized = sanitizeExport({
    exported_at: new Date(now).toISOString(),
    child_id: req.child_id,
    ...raw,
  });

  const bytes = Buffer.from(JSON.stringify(sanitized), "utf8");
  const downloadUrl = deps.packStorage
    ? await deps.packStorage.putPack(`export-${req.id}`, bytes)
    : `https://storage.stellara.local/private/exports/${req.id}.json?expires=${now + EXPORT_URL_TTL_MS}`;

  const updated: DataRequestServerRecord = {
    ...req,
    status: "ready",
    completed_at: now,
    download_url: downloadUrl,
    download_expires_at: now + EXPORT_URL_TTL_MS,
  };
  await deps.store.putDataRequest(updated);
  return updated;
}

export async function requestDataDeletion(
  deps: RuntimeDeps,
  ctx: GuardianContext,
  childId: string,
  confirmationText: string,
  idempotencyKey = `deletion:${childId}`,
): Promise<DataRequestServerRecord> {
  const child = await requireOwnedChild(deps, ctx.guardian_id, childId);
  const expected = `DELETE ${child.first_name ?? child.id}`;
  if (confirmationText !== expected) {
    throw new RuntimeError("DELETION_CONFIRMATION_MISMATCH");
  }

  const existing = await deps.store.listDataRequests(child.id);
  const match = existing.find(
    (r) => r.kind === "deletion" && (r.idempotency_key === idempotencyKey || r.status !== "failed"),
  );
  if (match) return match;

  const now = deps.clock.now();
  const record: DataRequestServerRecord = {
    id: deps.ids.uuid(),
    guardian_id: ctx.guardian_id,
    child_id: child.id,
    kind: "deletion",
    status: "pending",
    idempotency_key: idempotencyKey,
    requested_at: now,
    due_at: now + DELETION_SLA_MS,
    completed_at: null,
  };

  await deps.store.transaction(async () => {
    await deps.store.updateChild({ ...child, status: "deletion_pending" });
    await deps.store.revokeChildAccess(child.id, now);
    await deps.store.putDataRequest(record);
  });

  return record;
}

export async function executeDeletion(
  deps: RuntimeDeps,
  requestId: string,
): Promise<DataRequestServerRecord> {
  const req = await deps.store.getDataRequest(requestId);
  if (!req || req.kind !== "deletion") {
    throw new RuntimeError("DATA_REQUEST_NOT_FOUND");
  }
  if (req.status === "completed") {
    return req;
  }

  const now = deps.clock.now();
  const updated: DataRequestServerRecord = {
    ...req,
    status: "completed",
    completed_at: now,
  };

  await deps.store.transaction(async () => {
    const consents = await deps.store.listConsents();
    for (const consent of consents) {
      if (consent.child_id === req.child_id) {
        await deps.store.putConsent({
          ...consent,
          child_id: null,
          detached: true,
          retain_until: Math.max(consent.retain_until, now + CONSENT_RETENTION_MS),
        });
      }
    }
    await deps.store.deleteChildLearningRecords(req.child_id);
    await deps.store.putDataRequest(updated);
  });

  return updated;
}
