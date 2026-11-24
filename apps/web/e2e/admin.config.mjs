import { defineConfig } from "@playwright/test";
import { fileURLToPath } from "node:url";

export default defineConfig({
  testDir: ".",
  testMatch: "admin.spec.mjs",
  timeout: 180_000,
  expect: { timeout: 15_000 },
  use: { baseURL: "http://localhost:3100", viewport: { width: 1440, height: 1000 } },
  webServer: {
    command: "pnpm --filter @stellara/web exec next start --port 3100",
    cwd: fileURLToPath(new URL("../../../", import.meta.url)),
    url: "http://localhost:3100/admin/",
    timeout: 180_000,
    env: { NEXT_PUBLIC_ADMIN_DEMO: "true", NEXT_TELEMETRY_DISABLED: "1" },
  },
});
