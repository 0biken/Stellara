import AxeBuilder from "@axe-core/playwright";
import { test, expect } from "@playwright/test";
import { formatMessage as m } from "@stellara/i18n";

import { openStory, stories } from "./helpers.js";

for (const id of stories)
  for (const theme of ["light", "dark"] as const) {
    test(`${id} ${theme}: renders and passes axe`, async ({ page }) => {
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.emulateMedia({ colorScheme: theme === "light" ? "dark" : "light" });
      await openStory(page, id, theme);
      const results = await new AxeBuilder({ page })
        .include("[data-story-root]")
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze();
      expect(results.violations).toEqual([]);
      expect(errors).toEqual([]);
      expect(
        await page
          .locator("[data-story-root]")
          .evaluate((element) => element.scrollWidth <= document.documentElement.clientWidth),
      ).toBe(true);
    });
  }

test("native dialog Escape restores trigger focus", async ({ page }) => {
  await openStory(page, "sweet-garden-components--info-dialog", "light");
  const trigger = page.getByRole("button").first();
  await trigger.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Tab");
  expect(
    await page.locator("dialog").evaluate((dialog) => dialog.contains(document.activeElement)),
  ).toBe(true);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(trigger).toBeFocused();
});

test("picture key announces correction and reset", async ({ page }) => {
  await openStory(page, "sweet-garden-components--picture-entry", "dark");
  for (const key of ["sun", "moon", "leaf", "flower"] as const) {
    await page.getByRole("button", { name: m(`pictureKey.${key}`), exact: true }).click();
  }
  await expect(page.getByRole("status")).toContainText(m("pictureKey.progress", { count: 4 }));
  await expect(page.getByRole("button", { name: m("pictureKey.sun"), exact: true })).toBeDisabled();
  await page.getByRole("button", { name: m("pictureKey.removeLast"), exact: true }).click();
  await expect(page.getByRole("status")).toContainText(m("pictureKey.progress", { count: 3 }));
  await page.getByRole("button", { name: m("pictureKey.reset"), exact: true }).click();
  await expect(page.getByRole("status")).toContainText(m("pictureKey.progress", { count: 0 }));
});

test("destructive confirmation requires exact text", async ({ page }) => {
  await openStory(page, "sweet-garden-components--typed-confirmation", "light");
  await page.getByRole("button").first().click();
  const dialog = page.getByRole("dialog");
  const action = dialog.getByRole("button", { name: m("common.confirm"), exact: true });
  await expect(action).toBeDisabled();
  await dialog.getByRole("textbox").fill("sample");
  await expect(action).toBeDisabled();
  await dialog.getByRole("textbox").fill("SAMPLE");
  await expect(action).toBeEnabled();
  await action.click();
  await expect(dialog).not.toBeVisible();
});

test("Appearance keyboard choice persists only on successful write", async ({ page }) => {
  await openStory(page, "foundations--appearance-parent", "light");
  await page.getByRole("radio", { name: /Daytime/ }).focus();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("radio", { name: /Starlight/ })).toBeChecked();
  await expect(page.getByRole("status")).toHaveText(m("appearance.saved"));
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await openStory(page, "foundations--appearance-blocked-storage", "light");
  await page.getByRole("radio", { name: /Starlight/ }).check();
  await expect(page.getByRole("status")).toHaveText(m("appearance.saveError"));
});

test("basic page renders with JavaScript disabled and stored theme wins prepaint", async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("http://localhost:3000/basic");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await context.close();
});

test("theme bootstrap handles opposite OS and blocked storage", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce", contrast: "more" });
  await page.addInitScript(() => localStorage.setItem("stellara-theme", "light"));
  await page.goto("http://localhost:3000/basic");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(page.locator('meta[name="theme-color"]').first()).toHaveAttribute(
    "content",
    "#FFF8F1",
  );
  await page.addInitScript(() =>
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new Error("blocked");
      },
    }),
  );
  await page.reload();
  await expect(page.locator("html")).not.toHaveAttribute("data-theme");
});

for (const theme of ["light", "dark"] as const) {
  test(`landing page ${theme}: renders, passes axe and has no horizontal overflow`, async ({
    page,
  }) => {
    await page.addInitScript((choice) => localStorage.setItem("stellara-theme", choice), theme);
    await page.goto("http://localhost:3000/");
    await expect(
      page.getByRole("heading", { level: 1, name: "A personal tutor that knows your child." }),
    ).toBeVisible();
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(results.violations).toEqual([]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      ),
    ).toBe(true);
  });
}

test("landing page renders with JavaScript disabled", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("http://localhost:3000/");
  await expect(
    page.getByRole("heading", { level: 1, name: "A personal tutor that knows your child." }),
  ).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Main" })).toBeVisible();
  await expect(page.getByRole("contentinfo")).toContainText("Stellara is not affiliated with NECO.");
  await context.close();
});

test("landing page theme toggle switches to Daytime light mode and sign-in enforces 18+ rule", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("http://localhost:3000/");
  await page.getByRole("button", { name: /Switch to Daytime/i }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

  await page.getByRole("link", { name: "Sign in" }).click();
  await expect(page).toHaveURL("http://localhost:3000/sign-in");
  await expect(page.getByRole("heading", { level: 1, name: "Sign in with Google" })).toBeVisible();
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(results.violations).toEqual([]);

  await page.getByRole("button", { name: "Continue with Google" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "over 18 years old" })).toBeVisible();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Continue with Google" }).click();
  await expect(page.getByRole("status")).toBeVisible();
});
