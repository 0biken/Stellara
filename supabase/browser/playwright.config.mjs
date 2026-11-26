import { defineConfig } from "@playwright/test";
import { fileURLToPath } from "node:url";

export default defineConfig({
  testDir: ".",
  use: { baseURL: "http://localhost:3000" },
  timeout: 180_000,
  expect: { timeout: 30_000 },
  webServer: {
    command: "pnpm --filter @stellara/web start",
    cwd: fileURLToPath(new URL("../../", import.meta.url)),
    url: "http://localhost:3000",
    timeout: 90_000,
  },
});
