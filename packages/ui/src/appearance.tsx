"use client";

import { useEffect, useId, useRef, useState } from "react";

import {
  applyThemeChoice,
  isThemeChoice,
  readThemeChoice,
  saveThemeChoice,
  themeChoices,
  themeStorageKey,
  type ThemeChoice,
} from "./theme.js";

export interface AppearanceLabels {
  title: string;
  system: string;
  systemDescription: string;
  light: string;
  lightDescription: string;
  dark: string;
  darkDescription: string;
  saved: string;
  saveError: string;
}

type ThemeStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;
export interface AppearanceProps {
  audience: "parent";
  labels: AppearanceLabels;
  /** Optional device storage adapter. null means storage is unavailable. */
  storage?: ThemeStorage | null;
}

/** Device-only preference for adult settings. Browser access starts after hydration. */
export function Appearance({ audience, labels, storage }: AppearanceProps) {
  const groupId = useId();
  const [choice, setChoice] = useState<ThemeChoice>("system");
  const [status, setStatus] = useState<"saved" | "error" | null>(null);
  const choiceRef = useRef<ThemeChoice>("system");
  const storageRef = useRef<ThemeStorage | undefined>(undefined);

  useEffect(() => {
    let deviceStorage: ThemeStorage | undefined;
    try {
      deviceStorage = storage === undefined ? window.localStorage : (storage ?? undefined);
    } catch {
      deviceStorage = undefined;
    }
    storageRef.current = deviceStorage;
    const update = (next: ThemeChoice) => {
      choiceRef.current = next;
      setChoice(next);
      applyThemeChoice(next);
    };
    update(readThemeChoice(deviceStorage));
    setStatus(null);
    const media = window.matchMedia?.("(prefers-color-scheme: dark)");
    const onMediaChange = () => {
      if (choiceRef.current === "system") applyThemeChoice("system");
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key !== themeStorageKey && event.key !== null) return;
      if (event.storageArea && event.storageArea !== deviceStorage) return;
      update(isThemeChoice(event.newValue) ? event.newValue : "system");
      setStatus(null);
    };
    media?.addEventListener("change", onMediaChange);
    window.addEventListener("storage", onStorage);
    return () => {
      media?.removeEventListener("change", onMediaChange);
      window.removeEventListener("storage", onStorage);
    };
  }, [storage]);

  const select = (next: ThemeChoice) => {
    choiceRef.current = next;
    setChoice(next);
    applyThemeChoice(next);
    setStatus(saveThemeChoice(next, storageRef.current) ? "saved" : "error");
  };

  return (
    <fieldset className="st-appearance" data-audience={audience}>
      <legend>{labels.title}</legend>
      {themeChoices.map((option) => {
        const descriptionId = `${groupId}-${option}-description`;
        return (
          <label className="st-appearance-option" key={option}>
            <input
              type="radio"
              name={`${groupId}-appearance`}
              value={option}
              checked={choice === option}
              aria-label={labels[option]}
              aria-describedby={descriptionId}
              onChange={() => select(option)}
            />
            <span>
              <span className="st-appearance-label">{labels[option]}</span>
              <span className="st-appearance-description" id={descriptionId}>
                {labels[`${option}Description`]}
              </span>
            </span>
          </label>
        );
      })}
      <p className="st-appearance-status" role="status">
        {status === "saved" ? labels.saved : status === "error" ? labels.saveError : ""}
      </p>
    </fieldset>
  );
}
