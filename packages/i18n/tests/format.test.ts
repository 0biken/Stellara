import { describe, expect, it } from "vitest";

import english from "../src/en-NG.json" with { type: "json" };
import * as i18n from "../src/index.js";
import yoruba from "../src/yo.json" with { type: "json" };

describe("plain text ICU formatting", () => {
  it("formats progress and singular/plural days with English fallback", () => {
    expect(i18n.formatMessage("progress.count", { current: 2, total: 10 })).toBe("2 of 10");
    expect(i18n.formatMessage("days.count", { count: 1 }, "yo")).toBe("1 day");
    expect(i18n.formatMessage("days.count", { count: 5 }, "ha")).toBe("5 days");
    expect(i18n.formatMessage("days.count", { count: 0 }, "ig")).toBe("0 days");
  });
  it("preserves catalogue access and tolerates invalid runtime locale and key", () => {
    expect(i18n.getCatalogue("yo").brand).toBe("Stellara");
    expect(i18n.formatMessage("brand", undefined, "invalid" as i18n.Locale)).toBe("Stellara");
    expect(i18n.formatMessage("missing" as i18n.MessageKey)).toBe("missing");
    expect(i18n.getCatalogue("invalid" as i18n.Locale).brand).toBe("Stellara");
  });
  it("uses translated text when available and falls back for empty or invalid values", () => {
    const translations = yoruba as Record<string, unknown>;
    try {
      translations.brand = "Ẹ káàbọ̀";
      expect(i18n.formatMessage("brand", undefined, "yo")).toBe("Ẹ káàbọ̀");
      translations.brand = " ";
      expect(i18n.formatMessage("brand", undefined, "yo")).toBe("Stellara");
      translations.brand = 42;
      expect(i18n.getCatalogue("yo").brand).toBe("Stellara");
    } finally {
      delete translations.brand;
    }
  });
  it("formats numbers, NGN money and Yoruba glyph values", () => {
    expect(i18n.formatNumber(25000)).toBe("25,000");
    expect(i18n.formatNumber(25000, "yo")).toBe(new Intl.NumberFormat("yo-NG").format(25000));
    expect(i18n.formatMessage("money.amount", { amount: 25000 })).toBe("₦25,000");
    expect(i18n.formatMessage("money.amount", { amount: 25000.5 })).toBe("₦25,000.5");
    expect(i18n.formatMessage("sky.topicLabel", { topic: "Ẹ káàbọ̀ <script>" })).toBe(
      "Ẹ káàbọ̀ <script>",
    );
  });
  it("uses Lagos time independently of ambient timezone and permits explicit override", () => {
    const instant = Date.UTC(2026, 0, 1, 23, 30);
    const options = { day: "numeric", month: "short" } as const;
    expect(i18n.formatDate(instant, options)).toBe("2 Jan");
    expect(i18n.formatDate(new Date(instant), options, "en-NG", "UTC")).toBe("1 Jan");
    expect(i18n.formatDate(instant, { ...options, timeZone: "UTC" })).toBe("1 Jan");
  });
  it("throws a descriptive typed error for missing arguments and malformed ICU", () => {
    expect(() => i18n.formatMessage("progress.count", {} as never)).toThrow(i18n.I18nFormatError);
    expect(() => i18n.formatMessage("progress.count", {} as never)).toThrow(/progress.count/);
    const original = english.foundationNote;
    try {
      english.foundationNote = "{broken";
      expect(() => i18n.formatMessage("foundationNote")).toThrow(i18n.I18nFormatError);
    } finally {
      english.foundationNote = original;
    }
  });
  it("exposes the landing page copy keys in the en-NG catalogue", () => {
    const copy = i18n.getCatalogue("en-NG");
    expect(copy.homeTitle).toBe("A personal tutor that knows your child.");
    expect(copy["landing.hero.badge"]).toBe("For primary pupils, with a parent’s permission");
    expect(copy["landing.start.step1Title"]).toBe("Sign in with Google");
    expect(copy["signIn.ageRule"]).toContain("over 18 years old");
    expect(copy["landing.footer.disclaimer"]).toContain("Stellara is not affiliated with NECO.");
  });
});
