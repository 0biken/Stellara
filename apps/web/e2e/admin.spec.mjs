import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

for (const format of ["ordering", "match", "cloze"]) {
  test(`authors, previews and reopens a ${format} draft`, async ({ page }) => {
    page.setDefaultTimeout(15_000);
    await page.goto("/admin/content/");
    await page.getByRole("link", { name: "New question" }).click();
    const title = `New ${format} question`;
    await page.getByRole("textbox", { name: "Title", exact: true }).fill(title);
    await page.getByRole("combobox", { name: "Format", exact: true }).selectOption(format);
    const editor = page.getByRole("form", { name: "Question draft" });
    const preview = page.getByRole("region", { name: "Question preview" });
    if (format === "ordering") {
      await editor.getByRole("textbox", { name: "Step 1" }).fill("Harvest");
      await editor.getByRole("textbox", { name: "Step 2" }).fill("Plant");
      await editor.getByRole("combobox", { name: "Position 1" }).selectOption({ label: "Plant" });
      await editor.getByRole("combobox", { name: "Position 2" }).selectOption({ label: "Harvest" });
      await preview
        .getByRole("combobox", { name: "Position 1" })
        .selectOption({ label: "Harvest" });
      await expect(preview.getByRole("listitem").first()).toContainText("Harvest");
    } else if (format === "match") {
      await editor.getByRole("textbox", { name: "Left item 1" }).fill("Bee");
      await editor.getByRole("textbox", { name: "Right item 1" }).fill("Hive");
      await editor.getByRole("combobox", { name: "Match for Bee" }).selectOption({ label: "Hive" });
      await expect(preview.getByRole("combobox", { name: "Bee" })).toHaveValue("");
      await preview.getByRole("combobox", { name: "Bee" }).selectOption({ label: "Hive" });
    } else {
      await editor
        .getByRole("textbox", { name: "Question", exact: true })
        .fill("The bee lives in (1) ___ and makes (2) ___.");
      await editor.getByRole("textbox", { name: "Blank 1 option 1" }).fill("a hive");
      await editor.getByRole("button", { name: "Add blank", exact: true }).click();
      await editor.getByRole("textbox", { name: "Blank 2 option 1" }).fill("honey");
      await editor
        .getByRole("combobox", { name: "Correct option for blank 1" })
        .selectOption({ label: "a hive" });
      await editor
        .getByRole("combobox", { name: "Correct option for blank 2" })
        .selectOption({ label: "honey" });
      await expect(preview.getByRole("combobox", { name: "Blank 2" })).toHaveValue("");
      await preview.getByRole("combobox", { name: "Blank 2" }).selectOption({ label: "honey" });
    }
    await page.getByRole("button", { name: "Save draft" }).click();
    await expect(page).toHaveURL(/id=[a-f0-9-]+/);
    await expect(page.getByText("Draft saved", { exact: true })).toBeVisible();
    await page.getByRole("link", { name: "← Content library" }).click();
    await page.getByRole("link", { name: title }).click();
    if (format === "ordering") {
      await expect(editor.getByRole("listitem").first()).toContainText("Plant");
      await expect(editor.getByRole("listitem").last()).toContainText("Harvest");
    } else if (format === "match") {
      await expect(
        editor.getByRole("combobox", { name: "Match for Bee" }).locator("option:checked"),
      ).toHaveText("Hive");
    } else {
      await expect(
        editor
          .getByRole("combobox", { name: "Correct option for blank 1" })
          .locator("option:checked"),
      ).toHaveText("a hive");
      await expect(
        editor
          .getByRole("combobox", { name: "Correct option for blank 2" })
          .locator("option:checked"),
      ).toHaveText("honey");
    }
  });
}

test("creates and reopens a demo question draft", async ({ page }) => {
  page.setDefaultTimeout(15_000);
  await page.goto("/admin/content/");
  await page.getByRole("link", { name: "New question" }).click();
  await page.getByLabel("Title", { exact: true }).fill("Adding mangoes");
  await page.getByLabel("Question", { exact: true }).fill("What is 2 + 3?");
  await page.getByRole("combobox", { name: "Format", exact: true }).selectOption("numeric");
  await page.getByLabel("Correct answer", { exact: true }).fill("5");
  await expect(page.getByRole("region", { name: "Question preview" })).toContainText(
    "What is 2 + 3?",
  );
  await expect(page.getByRole("region", { name: "Question preview" })).not.toContainText(
    "Correct answer",
  );
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page).toHaveURL(/id=[a-f0-9-]+/);
  await expect(page.getByText("Draft saved", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "← Content library" }).click();
  await page.getByRole("link", { name: "Adding mangoes" }).click();
  await expect(page.getByLabel("Correct answer", { exact: true })).toHaveValue("5");
});

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
