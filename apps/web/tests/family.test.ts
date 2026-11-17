import { beforeEach, describe, expect, it } from "vitest";

import { isValidFirstName } from "../lib/family";
import { createPreviewFamilyApi, previewChildKey } from "../lib/family/preview";

const child = {
  first_name: "Tolu",
  year: "P5" as const,
  exam_date: "2027-04-24",
  avatar_key: "kite" as const,
  pin: ["sun", "kite", "leaf", "cup"] as ("sun" | "kite" | "leaf" | "cup")[],
};

describe("preview family API", () => {
  beforeEach(() => localStorage.clear());

  it("refuses a child before consent (FAM-02 AC1)", async () => {
    const api = createPreviewFamilyApi(localStorage);
    await expect(api.addChild(child)).rejects.toMatchObject({ code: "CONSENT_REQUIRED" });
    expect(await api.listChildren()).toEqual([]);
  });

  it("records consent with the placeholder method, then adds a child without exposing the key", async () => {
    const api = createPreviewFamilyApi(localStorage);
    const consent = await api.giveConsent({
      core_learning: true,
      progress_messages: true,
      product_research: false,
    });
    expect(consent.method).toBe("declaration_v0");
    const added = await api.addChild({ ...child, first_name: "  Tolu " });
    expect(added.first_name).toBe("Tolu");
    const [listed] = await api.listChildren();
    expect(listed).toEqual(added);
    expect(listed).not.toHaveProperty("pin");
  });

  it("signs the child in with the right key and hands off to the child side", async () => {
    const api = createPreviewFamilyApi(localStorage);
    await api.giveConsent({
      core_learning: true,
      progress_messages: false,
      product_research: false,
    });
    const added = await api.addChild(child);
    expect(await api.signInChild(added, child.pin)).toEqual({ status: "signed-in" });
    expect(JSON.parse(localStorage.getItem(previewChildKey) ?? "{}")).toMatchObject({
      id: added.id,
      first_name: "Tolu",
    });
  });

  it("locks the profile for 5 minutes after 5 wrong keys (KID-01)", async () => {
    let now = Date.parse("2026-11-17T09:00:00Z");
    const api = createPreviewFamilyApi(localStorage, () => now);
    await api.giveConsent({
      core_learning: true,
      progress_messages: false,
      product_research: false,
    });
    const added = await api.addChild(child);
    const wrong = ["moon", "moon", "moon", "moon"] as const;
    for (let left = 4; left >= 1; left--) {
      expect(await api.signInChild(added, [...wrong])).toEqual({
        status: "incorrect",
        attemptsLeft: left,
      });
    }
    expect((await api.signInChild(added, [...wrong])).status).toBe("locked");
    expect((await api.signInChild(added, child.pin)).status).toBe("locked");
    now += 5 * 60_000 + 1;
    expect(await api.signInChild(added, child.pin)).toEqual({ status: "signed-in" });
  });
});

describe("isValidFirstName", () => {
  it("accepts first names with accents, apostrophes and hyphens", () => {
    for (const name of ["Tolu", "Ọlámídé", "Chi-Chi", "N'deye"])
      expect(isValidFirstName(name)).toBe(true);
  });
  it("rejects empty, numeric and overly long names", () => {
    for (const name of ["", " ", "2pac", "x".repeat(31)])
      expect(isValidFirstName(name)).toBe(false);
  });
});
