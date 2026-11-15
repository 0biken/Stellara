"use client";

import { applyThemeChoice, readThemeChoice, saveThemeChoice, themeStorageKey } from "@stellara/ui";
import { useSyncExternalStore } from "react";

function getThemeSnapshot(): "light" | "dark" {
  const saved = readThemeChoice(window.localStorage);
  if (saved === "light" || saved === "dark") return saved;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function subscribeTheme(onStoreChange: () => void): () => void {
  const media = window.matchMedia?.("(prefers-color-scheme: dark)");
  const onStorage = (event: StorageEvent) => {
    if (event.key === themeStorageKey || event.key === null) onStoreChange();
  };
  const onThemeEvent = () => onStoreChange();
  media?.addEventListener("change", onStoreChange);
  window.addEventListener("storage", onStorage);
  window.addEventListener("stellara-theme-change", onThemeEvent);
  return () => {
    media?.removeEventListener("change", onStoreChange);
    window.removeEventListener("storage", onStorage);
    window.removeEventListener("stellara-theme-change", onThemeEvent);
  };
}

export function ThemeToggle({
  lightLabel,
  darkLabel,
  switchToLightLabel,
  switchToDarkLabel,
}: {
  lightLabel: string;
  darkLabel: string;
  switchToLightLabel: string;
  switchToDarkLabel: string;
}) {
  const resolved = useSyncExternalStore(subscribeTheme, getThemeSnapshot, () => "light");
  const nextTheme = resolved === "dark" ? "light" : "dark";
  const label = resolved === "dark" ? lightLabel : darkLabel;
  const ariaLabel = resolved === "dark" ? switchToLightLabel : switchToDarkLabel;

  const handleToggle = () => {
    applyThemeChoice(nextTheme);
    saveThemeChoice(nextTheme, window.localStorage);
    window.dispatchEvent(new Event("stellara-theme-change"));
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-label={ariaLabel}
      className="st-press inline-flex h-11 items-center gap-2 rounded-full border-[1.5px] border-line-strong bg-surface px-4 text-[14px] font-semibold text-text hover:border-primary"
    >
      {resolved === "dark" ? (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
      ) : (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
      <span>{label}</span>
    </button>
  );
}
