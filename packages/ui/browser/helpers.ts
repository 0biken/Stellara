import { readFileSync } from "node:fs";

import { expect, type Page } from "@playwright/test";

const index = JSON.parse(
  readFileSync(new URL("../storybook-static/index.json", import.meta.url), "utf8"),
) as { entries: Record<string, { id: string; type: string }> };
export const stories = Object.values(index.entries)
  .filter((entry) => entry.type === "story")
  .map((entry) => entry.id)
  .sort();
export async function openStory(page: Page, id: string, theme: "light" | "dark") {
  await page.goto(`/iframe.html?id=${id}&viewMode=story&globals=theme:${theme}`);
  await expect(page.locator("[data-story-root]")).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator("#storybook-root > *")).toHaveCount(1);
}
