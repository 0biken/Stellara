// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { Appearance } from "../src/appearance.js";

const labels = {
  title: "How Stellara looks",
  system: "Match my phone",
  systemDescription: "Switches with your phone's setting.",
  light: "Daytime",
  lightDescription: "Cream and honey.",
  dark: "Starlight",
  darkDescription: "Warm cocoa.",
  saved: "Saved on this phone.",
  saveError: "Could not save on this phone.",
};
let media: EventTarget & {
  matches: boolean;
  media: string;
  addEventListener: EventTarget["addEventListener"];
  removeEventListener: EventTarget["removeEventListener"];
};
beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
  media = Object.assign(new EventTarget(), {
    matches: true,
    media: "(prefers-color-scheme: dark)",
  });
  vi.stubGlobal("matchMedia", () => media);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

it("server renders system without accessing browser storage", () => {
  const storage = {
    getItem() {
      throw new Error("must not read in render");
    },
    setItem() {},
    removeItem() {},
  };
  const html = renderToString(<Appearance audience="parent" labels={labels} storage={storage} />);
  const markup = new DOMParser().parseFromString(html, "text/html");
  expect(markup.querySelector('input[value="system"]')?.hasAttribute("checked")).toBe(true);
  expect(markup.querySelectorAll("input[checked]")).toHaveLength(1);
});
it("reads persisted choice after mount and offers one named native radio group", () => {
  localStorage.setItem("stellara-theme", "light");
  render(<Appearance audience="parent" labels={labels} />);
  expect(screen.getByRole("group", { name: labels.title })).toBeDefined();
  expect(screen.getAllByRole("radio")).toHaveLength(3);
  expect((screen.getByRole("radio", { name: labels.light }) as HTMLInputElement).checked).toBe(
    true,
  );
  expect(document.documentElement.dataset.theme).toBe("light");
  expect(screen.queryByText(labels.saved)).toBeNull();
});
it("persists a native radio selection and keeps a forced choice when the OS changes", () => {
  render(<Appearance audience="parent" labels={labels} />);
  const daytime = screen.getByRole("radio", { name: labels.light });
  daytime.focus();
  fireEvent.click(daytime);
  expect(document.activeElement).toBe(daytime);
  expect(localStorage.getItem("stellara-theme")).toBe("light");
  expect(screen.getByRole("status").textContent).toBe(labels.saved);
  act(() => {
    media.matches = false;
    media.dispatchEvent(new Event("change"));
    media.matches = true;
    media.dispatchEvent(new Event("change"));
  });
  expect(document.documentElement.dataset.theme).toBe("light");
  fireEvent.click(screen.getByRole("radio", { name: labels.system }));
  expect(localStorage.getItem("stellara-theme")).toBeNull();
  expect(document.documentElement.hasAttribute("data-theme")).toBe(false);
});
it("applies a transient choice but reports an error when storage writes fail", () => {
  const storage = {
    getItem: () => null,
    setItem() {
      throw new Error("quota");
    },
    removeItem() {
      throw new Error("blocked");
    },
  };
  render(<Appearance audience="parent" labels={labels} storage={storage} />);
  fireEvent.click(screen.getByRole("radio", { name: labels.dark }));
  expect(document.documentElement.dataset.theme).toBe("dark");
  expect(screen.getByRole("status").textContent).toBe(labels.saveError);
  expect(screen.queryByText(labels.saved)).toBeNull();
});

it("works when accessing localStorage itself throws", () => {
  vi.spyOn(window, "localStorage", "get").mockImplementation(() => {
    throw new DOMException("Storage blocked", "SecurityError");
  });
  render(<Appearance audience="parent" labels={labels} />);
  expect(screen.getByRole("radio", { name: labels.system })).toBeChecked();
  fireEvent.click(screen.getByRole("radio", { name: labels.dark }));
  expect(document.documentElement.dataset.theme).toBe("dark");
  expect(screen.getByRole("status").textContent).toBe(labels.saveError);
});
it("updates from cross-tab writes and invalid values reset to system", () => {
  render(<Appearance audience="parent" labels={labels} />);
  act(() =>
    window.dispatchEvent(
      new StorageEvent("storage", {
        key: "stellara-theme",
        newValue: "dark",
        storageArea: localStorage,
      }),
    ),
  );
  expect((screen.getByRole("radio", { name: labels.dark }) as HTMLInputElement).checked).toBe(true);
  act(() =>
    window.dispatchEvent(
      new StorageEvent("storage", {
        key: "stellara-theme",
        newValue: "bad",
        storageArea: localStorage,
      }),
    ),
  );
  expect((screen.getByRole("radio", { name: labels.system }) as HTMLInputElement).checked).toBe(
    true,
  );
  expect(document.documentElement.hasAttribute("data-theme")).toBe(false);
  act(() => {
    media.matches = false;
    media.dispatchEvent(new Event("change"));
  });
  expect(document.documentElement.hasAttribute("data-theme")).toBe(false);
});
it("removes OS and cross-tab listeners on unmount", () => {
  const removeMedia = vi.spyOn(media, "removeEventListener");
  const removeWindow = vi.spyOn(window, "removeEventListener");
  const { unmount } = render(<Appearance audience="parent" labels={labels} />);
  unmount();
  expect(removeMedia).toHaveBeenCalledWith("change", expect.any(Function));
  expect(removeWindow).toHaveBeenCalledWith("storage", expect.any(Function));
  document.documentElement.dataset.theme = "light";
  act(() =>
    window.dispatchEvent(new StorageEvent("storage", { key: "stellara-theme", newValue: "dark" })),
  );
  expect(document.documentElement.dataset.theme).toBe("light");
});
