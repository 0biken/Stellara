import { parseRequest, RuntimeError, updateChildProfileSchema } from "./contracts.js";
import type { ChildRecord, RuntimeDeps } from "./ports.js";

export interface GuardianContext {
  readonly guardian_id: string;
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

export async function updateChildProfile(
  deps: RuntimeDeps,
  ctx: GuardianContext,
  childId: string,
  request: unknown,
): Promise<ChildRecord> {
  const patch = parseRequest(updateChildProfileSchema, request);
  const child = await requireOwnedChild(deps, ctx.guardian_id, childId);

  const updated: ChildRecord = {
    ...child,
    ...(patch.first_name !== undefined ? { first_name: patch.first_name } : {}),
    ...(patch.avatar_key !== undefined ? { avatar_key: patch.avatar_key } : {}),
    ...(patch.year !== undefined ? { year: patch.year } : {}),
    ...(patch.exam_date !== undefined ? { exam_date: patch.exam_date } : {}),
    ...(patch.timezone !== undefined ? { timezone: patch.timezone } : {}),
  };

  await deps.store.updateChild(updated);
  return updated;
}

export async function resetChildPin(
  deps: RuntimeDeps,
  ctx: GuardianContext,
  childId: string,
  newPinHash: string,
): Promise<void> {
  if (!newPinHash) throw new RuntimeError("INVALID_REQUEST", "newPinHash is required");
  const child = await requireOwnedChild(deps, ctx.guardian_id, childId);
  const now = deps.clock.now();

  await deps.store.transaction(async () => {
    await deps.store.updateChild({ ...child, pin_hash: newPinHash });
    await deps.store.revokeChildAccess(child.id, now);
  });
}

export async function pauseChild(
  deps: RuntimeDeps,
  ctx: GuardianContext,
  childId: string,
): Promise<ChildRecord> {
  const child = await requireOwnedChild(deps, ctx.guardian_id, childId);
  const now = deps.clock.now();
  const updated: ChildRecord = { ...child, status: "paused" };

  await deps.store.transaction(async () => {
    await deps.store.updateChild(updated);
    await deps.store.revokeChildAccess(child.id, now);
  });

  return updated;
}

export async function resumeChild(
  deps: RuntimeDeps,
  ctx: GuardianContext,
  childId: string,
): Promise<ChildRecord> {
  const child = await requireOwnedChild(deps, ctx.guardian_id, childId);
  if (child.status === "deletion_pending") {
    throw new RuntimeError("CHILD_INACTIVE");
  }

  if (child.consent_withdrawn_at != null) {
    const activeConsent = await deps.store.getActiveConsent(ctx.guardian_id, child.id);
    if (!activeConsent || activeConsent.given_at <= child.consent_withdrawn_at) {
      throw new RuntimeError("CONSENT_REQUIRED");
    }
  }

  const updated: ChildRecord = {
    ...child,
    status: "active",
    consent_withdrawn_at: null,
  };
  await deps.store.updateChild(updated);
  return updated;
}

export async function withdrawConsent(
  deps: RuntimeDeps,
  ctx: GuardianContext,
  childId: string,
): Promise<void> {
  const child = await requireOwnedChild(deps, ctx.guardian_id, childId);
  const now = deps.clock.now();

  await deps.store.transaction(async () => {
    const active = await deps.store.getActiveConsent(ctx.guardian_id, child.id);
    if (active) {
      await deps.store.putConsent({
        ...active,
        withdrawn_at: now,
      });
    }
    await deps.store.updateChild({
      ...child,
      status: "paused",
      consent_withdrawn_at: now,
    });
    await deps.store.revokeChildAccess(child.id, now);
  });
}
