import { beforeEach, describe, expect, it } from "vitest";

import { createPreviewFamilyApi, previewChildKey } from "../lib/family/preview";
import { FamilyError } from "../lib/family/types";

describe("parent settings and data rights in FamilyApi", () => {
  let now = 1_700_000_000_000;

  beforeEach(() => {
    window.localStorage.clear();
    now = 1_700_000_000_000;
  });

  const setupChild = async () => {
    const api = createPreviewFamilyApi(window.localStorage, () => now);
    await api.giveConsent({
      core_learning: true,
      progress_messages: false,
      product_research: false,
    });
    const child = await api.addChild({
      first_name: "Tolu",
      year: "P5",
      exam_date: "2026-04-20",
      avatar_key: "sun",
      pin: ["sun", "sun", "sun", "sun"],
    });
    return { api, child };
  };

  it("edits child name, avatar, year, goal date, and timezone", async () => {
    const { api, child } = await setupChild();
    const updated = await api.updateChild!(child.id, {
      first_name: "Toluwani",
      avatar_key: "moon",
      year: "P6",
      exam_date: "2026-05-15",
      timezone: "Europe/London",
    });

    expect(updated.first_name).toBe("Toluwani");
    expect(updated.avatar_key).toBe("moon");
    expect(updated.year).toBe("P6");
    expect(updated.exam_date).toBe("2026-05-15");
    expect(updated.timezone).toBe("Europe/London");
  });

  it("resets picture PIN and revokes active child session", async () => {
    const { api, child } = await setupChild();
    const signInRes = await api.signInChild(child, ["sun", "sun", "sun", "sun"]);
    expect(signInRes.status).toBe("signed-in");
    expect(window.localStorage.getItem(previewChildKey)).not.toBeNull();

    await api.resetChildPin!(child.id, ["moon", "moon", "moon", "moon"]);
    // Session revoked
    expect(window.localStorage.getItem(previewChildKey)).toBeNull();

    // Old PIN rejected, new PIN accepted
    const oldAttempt = await api.signInChild(child, ["sun", "sun", "sun", "sun"]);
    expect(oldAttempt.status).toBe("incorrect");
    const newAttempt = await api.signInChild(child, ["moon", "moon", "moon", "moon"]);
    expect(newAttempt.status).toBe("signed-in");
  });

  it("pauses and resumes child, and requires new verified consent to resume after withdrawal", async () => {
    const { api, child } = await setupChild();

    const paused = await api.pauseChild!(child.id);
    expect(paused.status).toBe("paused");

    const resumed = await api.resumeChild!(child.id);
    expect(resumed.status).toBe("active");

    await api.withdrawConsent!(child.id);
    await expect(api.resumeChild!(child.id)).rejects.toThrow(FamilyError);

    // Give new verified consent, then resume succeeds
    await api.giveConsent({
      core_learning: true,
      progress_messages: false,
      product_research: false,
    });
    const afterConsent = await api.resumeChild!(child.id);
    expect(afterConsent.status).toBe("active");
  });

  it("creates idempotent export requests with 24h download URL and enforces typed confirmation for deletion", async () => {
    const { api, child } = await setupChild();

    const exp1 = await api.requestDataExport!(child.id);
    const exp2 = await api.requestDataExport!(child.id);
    expect(exp2.id).toBe(exp1.id);
    expect(exp1.download_url).toBeDefined();
    expect(exp1.download_expires_at).toBe(new Date(now + 24 * 3_600_000).toISOString());

    // Wrong confirmation fails
    await expect(api.requestDataDeletion!(child.id, "DELETE wrong")).rejects.toThrow(FamilyError);

    // Exact typed confirmation succeeds and marks deletion_pending
    const delReq = await api.requestDataDeletion!(child.id, "DELETE Tolu");
    expect(delReq.kind).toBe("deletion");
    expect(delReq.status).toBe("pending");

    const list = await api.listChildren();
    expect(list.find((c) => c.id === child.id)?.status).toBe("deletion_pending");
  });
});
