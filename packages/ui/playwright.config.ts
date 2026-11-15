import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./browser",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 2,
  timeout: 45000,
  expect: { timeout: 10000, toHaveScreenshot: { animations: "disabled", maxDiffPixelRatio: 0.01 } },
  use: { baseURL: "http://127.0.0.1:6006", trace: "retain-on-failure" },
  projects: [
    {
      name: "chromium",
      testMatch: "**/accessibility.spec.ts",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "webkit",
      testMatch: "**/accessibility.spec.ts",
      use: { ...devices["Desktop Safari"] },
    },
    {
      name: "visual-phone",
      testMatch: "**/visual.spec.ts",
      use: { browserName: "chromium", viewport: { width: 390, height: 844 } },
    },
    {
      name: "visual-desktop",
      testMatch: "**/visual.spec.ts",
      use: { browserName: "chromium", viewport: { width: 1280, height: 900 } },
    },
  ],
  webServer: [
    {
      command: "pnpm storybook:serve",
      url: "http://127.0.0.1:6006",
      reuseExistingServer: !process.env.CI,
    },
    {
      command: "pnpm --filter @stellara/web start",
      url: "http://localhost:3000/basic",
      reuseExistingServer: !process.env.CI,
    },
  ],
});
