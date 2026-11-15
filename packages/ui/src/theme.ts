import { themeColors } from "./theme-colors.js";

/** Per-device appearance choice (08 §2.3). Absent storage means "system". */
export const themeStorageKey = "stellara-theme";
export type ThemeChoice = "system" | "light" | "dark";
export const themeChoices: readonly ThemeChoice[] = ["system", "light", "dark"];

export function isThemeChoice(value: unknown): value is ThemeChoice {
  return value === "system" || value === "light" || value === "dark";
}

export function readThemeChoice(storage: Pick<Storage, "getItem"> | undefined): ThemeChoice {
  try {
    const value = storage?.getItem(themeStorageKey);
    return isThemeChoice(value) ? value : "system";
  } catch {
    return "system";
  }
}

/** Applies a choice to <html> and browser chrome instantly, without transitions. */
export function applyThemeChoice(choice: ThemeChoice, doc: Document = document): void {
  const root = doc.documentElement;
  if (choice === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", choice);
  for (const meta of doc.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) {
    if (meta.dataset.media === undefined) {
      meta.dataset.media = meta.getAttribute("media") ?? "";
      if (!meta.hasAttribute("media")) meta.dataset.mediaAbsent = "true";
    }
    const media = meta.dataset.media;
    if (choice === "system") {
      if (meta.dataset.mediaAbsent === "true") meta.removeAttribute("media");
      else meta.setAttribute("media", media);
      meta.content = media.includes("dark") ? themeColors.dark : themeColors.light;
    } else {
      meta.removeAttribute("media");
      meta.content = themeColors[choice];
    }
  }
}

export function saveThemeChoice(
  choice: ThemeChoice,
  storage: Pick<Storage, "setItem" | "removeItem"> | undefined,
): boolean {
  try {
    if (choice === "system") storage?.removeItem(themeStorageKey);
    else storage?.setItem(themeStorageKey, choice);
    return storage !== undefined;
  } catch {
    return false;
  }
}

/** Trusted static head script: execute before styles/first paint. CSS handles OS fallback. */
export const themeBootstrapScript = `(function(){var c="system";try{var v=localStorage.getItem(${JSON.stringify(themeStorageKey)});if(v==="light"||v==="dark")c=v;}catch(e){}var r=document.documentElement;if(c==="system")r.removeAttribute("data-theme");else r.setAttribute("data-theme",c);var m=document.querySelectorAll('meta[name="theme-color"]');for(var i=0;i<m.length;i++){var t=m[i];if(t.dataset.media===undefined){t.dataset.media=t.getAttribute("media")||"";if(!t.hasAttribute("media"))t.dataset.mediaAbsent="true";}var q=t.dataset.media;if(c==="system"){if(t.dataset.mediaAbsent==="true")t.removeAttribute("media");else t.setAttribute("media",q);t.content=q.indexOf("dark")!==-1?${JSON.stringify(themeColors.dark)}:${JSON.stringify(themeColors.light)};}else{t.removeAttribute("media");t.content=c==="dark"?${JSON.stringify(themeColors.dark)}:${JSON.stringify(themeColors.light)};}}})();`;
