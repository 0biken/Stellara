import { test, expect } from "@playwright/test";

import { openStory, stories } from "./helpers.js";

for (const id of stories)
  for (const theme of ["light", "dark"] as const) {
    test(`${id} ${theme}`, async ({ page }) => {
      await openStory(page, id, theme);
      await expect(page).toHaveScreenshot(`${id}-${theme}.png`, { fullPage: true });
    });
  }
