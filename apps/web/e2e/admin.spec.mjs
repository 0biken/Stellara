import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("staff demo navigation, filters, pagination and responsive layout", async ({
  page,
}, testInfo) => {
  await page.goto("/admin/");
  await expect(page.getByRole("heading", { name: "Your workspace" })).toBeVisible();
  await expect(page.getByText("Staff demo.", { exact: true })).toBeVisible();
  await page
    .getByRole("navigation", { name: "Staff navigation" })
    .getByRole("link", { name: "Content library" })
    .click();
  await expect(page.getByText("54 questions found")).toBeVisible();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByText("Page 2 of 3")).toBeVisible();
  await page.getByLabel("Search", { exact: true }).fill("market");
  await expect(page).toHaveURL(/q=market/);
  await expect(page.getByText("14 questions found")).toBeVisible();
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByLabel("Search", { exact: true })).toHaveValue("market");
  await expect(page.getByText("14 questions found")).toBeVisible();
  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(page.getByText("54 questions found")).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("content-library-desktop.png"),
    fullPage: true,
  });
  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(
    accessibility.violations.filter((violation) =>
      ["serious", "critical"].includes(violation.impact),
    ),
  ).toEqual([]);
  await page.getByRole("button", { name: "Switch to Starlight appearance" }).click();
  const starlightAccessibility = await new AxeBuilder({ page }).analyze();
  expect(
    starlightAccessibility.violations.filter((violation) =>
      ["serious", "critical"].includes(violation.impact),
    ),
  ).toEqual([]);
  await page.screenshot({
    path: testInfo.outputPath("content-library-starlight.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Lessons", exact: true }).click();
  await expect(page.getByText("10 lessons found")).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: testInfo.outputPath("content-library-mobile.png"),
    fullPage: true,
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page
    .getByRole("navigation", { name: "Staff navigation" })
    .getByRole("link", { name: "Family support" })
    .click();
  await page.getByLabel("Child ID", { exact: true }).fill("00000000-0000-4000-8000-000000000001");
  await page
    .getByLabel("Reason for access", { exact: false })
    .fill("Parent asked us to check request status.");
  await page.getByRole("button", { name: "View limited profile" }).click();
  await expect(page.getByText("No child found for that ID.")).toBeVisible();
});
