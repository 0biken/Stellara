// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";

import { themeColors } from "../src/theme-colors.js";
import {
  applyThemeChoice,
  isThemeChoice,
  readThemeChoice,
  saveThemeChoice,
  themeBootstrapScript,
} from "../src/theme.js";

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
  document.head.innerHTML =
    '<meta name="theme-color" media="(prefers-color-scheme: light)"><meta name="theme-color" media="(prefers-color-scheme: dark)">';
});

describe("per-device theme helpers", () => {
  it("falls back to system for absent, invalid and inaccessible storage", () => {
    for (const value of [null, "", "auto", "LIGHT", "<script>"]) {
      expect(readThemeChoice({ getItem: () => value })).toBe("system");
      expect(isThemeChoice(value)).toBe(false);
    }
    expect(readThemeChoice(undefined)).toBe("system");
    expect(
      readThemeChoice({
        getItem() {
          throw new Error("blocked");
        },
      }),
    ).toBe("system");
    for (const value of ["light", "dark", "system"] as const)
      expect(readThemeChoice({ getItem: () => value })).toBe(value);
  });
  it("forces browser chrome then restores each original media query for system", () => {
    applyThemeChoice("dark");
    applyThemeChoice("light");
    expect(
      [...document.querySelectorAll("meta")].every(
        (meta) => meta.content === themeColors.light && !meta.hasAttribute("media"),
      ),
    ).toBe(true);
    applyThemeChoice("system");
    expect(document.documentElement.hasAttribute("data-theme")).toBe(false);
    expect(
      [...document.querySelectorAll("meta")].map((meta) => [
        meta.getAttribute("media"),
        meta.content,
      ]),
    ).toEqual([
      ["(prefers-color-scheme: light)", themeColors.light],
      ["(prefers-color-scheme: dark)", themeColors.dark],
    ]);
  });
  it("reports failed persistence and clears explicit choices when returning to system", () => {
    expect(saveThemeChoice("dark", localStorage)).toBe(true);
    expect(localStorage.getItem("stellara-theme")).toBe("dark");
    expect(saveThemeChoice("system", localStorage)).toBe(true);
    expect(localStorage.getItem("stellara-theme")).toBeNull();
    expect(saveThemeChoice("light", undefined)).toBe(false);
    expect(
      saveThemeChoice("dark", {
        setItem() {
          throw new Error("quota");
        },
        removeItem() {},
      }),
    ).toBe(false);
    expect(
      saveThemeChoice("system", {
        setItem() {},
        removeItem() {
          throw new Error("blocked");
        },
      }),
    ).toBe(false);
  });
});

describe("pre-paint bootstrap", () => {
  it("clears stale forced appearance when the storage getter is denied", () => {
    document.documentElement.dataset.theme = "dark";
    const getter = vi.spyOn(window, "localStorage", "get").mockImplementation(() => {
      throw new Error("denied");
    });
    try {
      window.eval(themeBootstrapScript);
      expect(document.documentElement.hasAttribute("data-theme")).toBe(false);
    } finally {
      getter.mockRestore();
    }
  });
  it.each([null, "invalid", "system"])("clears a stale override when storage is %s", (value) => {
    if (value !== null) localStorage.setItem("stellara-theme", value);
    document.documentElement.dataset.theme = "dark";
    window.eval(themeBootstrapScript);
    expect(document.documentElement.hasAttribute("data-theme")).toBe(false);
  });
  it("applies a stored override before styles exist and restores chrome media afterwards", () => {
    localStorage.setItem("stellara-theme", "dark");
    window.eval(themeBootstrapScript);
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(
      [...document.querySelectorAll("meta")].every(
        (meta) => meta.content === themeColors.dark && !meta.hasAttribute("media"),
      ),
    ).toBe(true);
    applyThemeChoice("system");
    expect(
      [...document.querySelectorAll("meta")].map((meta) => meta.getAttribute("media")),
    ).toEqual(["(prefers-color-scheme: light)", "(prefers-color-scheme: dark)"]);
  });
});
