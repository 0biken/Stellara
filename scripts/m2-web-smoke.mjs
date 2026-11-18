import { readFile } from "node:fs/promises";

import { chromium, expect } from "@playwright/test";
const base = process.env.WEB_BASE_URL ?? "http://localhost:3001";
const status = {
  API_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
};
if (!status.API_URL || !status.ANON_KEY)
  throw new Error("Load apps/web/.env.local using node --env-file");
for (const url of [base, status.API_URL]) {
  if (!["localhost", "127.0.0.1"].includes(new URL(url).hostname))
    throw new Error("This smoke test requires disposable local services");
}
const signup = await fetch(`${status.API_URL}/auth/v1/signup`, {
  method: "POST",
  headers: { apikey: status.ANON_KEY, "content-type": "application/json" },
  body: JSON.stringify({ email: `web-${Date.now()}@example.test`, password: crypto.randomUUID() }),
});
const session = await signup.json();
if (!session.access_token) throw new Error(`Signup ${signup.status}`);
const copy = JSON.parse(
  await readFile(new URL("../packages/i18n/src/en-NG.json", import.meta.url), "utf8"),
);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
page.setDefaultTimeout(60000);
page.on("response", (r) => {
  if (r.status() >= 400 && r.url().includes("54321"))
    console.log("HTTP", r.status(), r.url().split("?")[0]);
});
try {
  await page.goto(`${base}/family/`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.evaluate(({ session, key }) => localStorage.setItem(key, JSON.stringify(session)), {
    session,
    key: `sb-${new URL(status.API_URL).hostname.split(".")[0]}-auth-token`,
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByRole("link", { name: "Add a child", exact: true }).click();
  await page.getByRole("checkbox", { name: copy["consent.adult"], exact: true }).check();
  await page.getByRole("button", { name: copy["consent.agree"], exact: true }).click();
  await page.getByLabel(copy["addChild.nameLabel"], { exact: true }).fill("Ada");
  await page.getByRole("button", { name: "Next", exact: true }).click();
  for (let round = 0; round < 2; round++) {
    for (const name of ["Sun", "Moon", "Leaf", "Fish"])
      await page.getByRole("button", { name, exact: true }).click();
  }
  await page.getByRole("link", { name: "Ada", exact: true }).click();
  for (const name of ["Sun", "Moon", "Leaf", "Fish"])
    await page.getByRole("button", { name, exact: true }).click();
  await expect(page).toHaveURL(/\/sky\/?$/, { timeout: 60000 });
  await expect(page.getByRole("link", { name: copy["todaySet.start"], exact: true })).toBeVisible();
  console.log("Family consent, profile, picture key and live sky passed");
  await page.evaluate(() => {
    const s = JSON.parse(sessionStorage.getItem("stellara.childSession"));
    s.expires_at = new Date(0).toISOString();
    sessionStorage.setItem("stellara.childSession", JSON.stringify(s));
  });
  const refresh = page.waitForResponse((r) => r.url().includes("/child-session-refresh"));
  await page.reload({ waitUntil: "domcontentloaded" });
  if ((await refresh).status() !== 200) throw new Error("Refresh failed");
  await page.getByRole("link", { name: copy["todaySet.start"], exact: true }).click();
  await page.getByRole("button", { name: copy["practice.check"], exact: true }).waitFor();
  console.log(await page.locator("body").innerText());
  for (let i = 0; i < 10; i++) {
    await page
      .locator("main button")
      .filter({ hasText: /\/12/ })
      .nth(i === 9 ? 1 : 0)
      .click();
    await page.waitForTimeout(2700);
    const response = page.waitForResponse((r) => r.url().includes("/responses-submit"));
    await page.getByRole("button", { name: copy["practice.check"], exact: true }).click();
    const r = await response;
    if (r.status() !== 200) throw new Error(`Submit ${i}: ${r.status()}`);
    await page
      .getByRole("button", {
        name: copy[i === 9 ? "explanation.next" : "practice.next"],
        exact: true,
      })
      .click();
  }
  await expect(page.getByRole("link", { name: copy["practice.leave"], exact: true })).toBeVisible({
    timeout: 60000,
  });
  await expect(
    page.getByRole("heading", { name: /9 of 10 correctly and earned 90 Stardust/ }),
  ).toBeVisible();
  console.log(await page.locator("body").innerText());
  await page.getByRole("link", { name: copy["practice.leave"], exact: true }).click();
  await expect(page.getByRole("button", { name: new RegExp(copy["star.developing"]) })).toBeVisible(
    { timeout: 60000 },
  );
  console.log(
    "Practice: ten submissions, incorrect last answer, persisted developing mastery passed",
  );
  await page.goto(`${base}/family/`, { waitUntil: "domcontentloaded" });
  const another = page.getByRole("link", { name: copy["family.addAnother"], exact: true });
  await expect(another).toHaveAttribute("href", "/family/consent/");
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => sessionStorage.getItem("stellara.childSession")))
    .toBeNull();
  console.log("Consumed consent routes to new consent; parent logout clears child credentials");
} catch (e) {
  console.log(
    await page
      .locator("body")
      .innerText()
      .catch(() => ""),
  );
  throw e;
} finally {
  await browser.close();
}
