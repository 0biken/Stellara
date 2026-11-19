import { randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";

test("a parent consents and unlocks real practice in the browser", async ({ page, request }) => {
  const url = process.env.STELLARA_TEST_URL;
  const admin = process.env.STELLARA_TEST_SERVICE_KEY;
  expect(url).toMatch(/^http:\/\/(localhost|127\.0\.0\.1):/);
  const linkReply = await request.post(url + "/auth/v1/admin/generate_link", {
    headers: { apikey: admin, authorization: "Bearer " + admin },
    data: { type: "magiclink", email: `browser-${randomUUID()}@example.test` },
  });
  expect(linkReply.ok()).toBeTruthy();
  const link = await linkReply.json();
  const sessionReply = await request.post(url + "/auth/v1/verify", {
    headers: { apikey: process.env.STELLARA_TEST_PUBLISHABLE_KEY },
    data: {
      type: link.verification_type ?? link.properties?.verification_type,
      token_hash: link.hashed_token ?? link.properties?.hashed_token,
    },
  });
  expect(sessionReply.ok()).toBeTruthy();
  const session = await sessionReply.json();
  const key = "sb-" + new URL(url).hostname.split(".")[0] + "-auth-token";
  await page.addInitScript(
    ({ key, session }) => {
      if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(session));
    },
    { key, session },
  );

  await page.goto("/family/consent/");
  await page.getByRole("checkbox", { name: /I am over 18/ }).check();
  await page.getByRole("button", { name: "I agree and give consent" }).click();
  await expect(page).toHaveURL(/\/family\/add-child\/?$/);
  await page.locator("#child-name").fill("Tolu");
  await page.getByRole("button", { name: "Next", exact: true }).click();
  const tapPin = async () => {
    for (const picture of ["Sun", "Kite", "Leaf", "Cup"]) {
      await page.getByRole("button", { name: picture, exact: true }).click();
    }
  };
  await tapPin();
  await tapPin();
  await expect(page).toHaveURL(/\/family\/?(\?.*)?$/);
  await page.getByRole("link", { name: /Tolu/ }).click();
  await tapPin();
  await expect(page).toHaveURL(/\/sky\/?$/);
  const sky = await page.evaluate(
    async ({ url, key }) => {
      const { token } = JSON.parse(sessionStorage.getItem("stellara.childSession"));
      const response = await fetch(url + "/functions/v1/child-sky", {
        method: "POST",
        headers: {
          authorization: "Bearer " + token,
          apikey: key,
          "content-type": "application/json",
        },
        body: "{}",
      });
      if (!response.ok) throw new Error("Cannot load the live sky");
      return response.json();
    },
    { url, key: process.env.STELLARA_TEST_PUBLISHABLE_KEY },
  );

  const startSet = page.waitForResponse((response) =>
    response.url().endsWith("/functions/v1/set-start"),
  );
  await page.goto("/practice/?topic=" + sky.today.topic_id);
  const started = await startSet;
  expect(started.ok()).toBeTruthy();
  const set = await started.json();
  await page.getByRole("button", { name: set.items[0].options[0].text, exact: true }).click();
  const submission = page.waitForResponse((response) =>
    response.url().endsWith("/functions/v1/responses-submit"),
  );
  await page.getByRole("button", { name: "Check", exact: true }).click();
  const saved = await submission;
  expect(saved.ok()).toBeTruthy();
  expect((await saved.json()).results).toHaveLength(1);
});
