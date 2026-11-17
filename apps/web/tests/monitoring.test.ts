import { describe, expect, it, vi } from "vitest";

import {
  FILTERED,
  isSensitiveKey,
  scrubBreadcrumb,
  scrubEvent,
  scrubText,
  scrubUrl,
  surfaceFromPath,
} from "../lib/monitoring/scrub";
import { startMonitoring } from "../lib/monitoring/sentry";

import type { ErrorEvent } from "@sentry/browser";

describe("scrubText", () => {
  it("removes emails, phone numbers, ids and quoted user text", () => {
    const text =
      'Parent ada.obi@example.com (+234 803 123 4567) saw "Chidinma" fail on 0b9f3a1e-1c2d-4e5f-8a9b-0c1d2e3f4a5b';
    const out = scrubText(text);
    expect(out).not.toMatch(/ada\.obi|example\.com|803|Chidinma|0b9f3a1e/);
    expect(out).toContain("[email]");
    expect(out).toContain("[number]");
    expect(out).toContain('"[text]"');
    expect(out).toContain("[id]");
  });
});

describe("scrubUrl", () => {
  it("drops query strings and fragments that carry auth codes", () => {
    expect(scrubUrl("https://app.example/auth/callback/?code=abc123#access_token=xyz")).toBe(
      "https://app.example/auth/callback/",
    );
  });

  it("replaces identifier-like path segments", () => {
    expect(scrubUrl("/family/children/0b9f3a1e-1c2d-4e5f-8a9b-0c1d2e3f4a5b/reports/20261117")).toBe(
      "/family/children/:id/reports/:id",
    );
    expect(scrubUrl("/invite/ada%40example.com/")).toBe("/invite/:id/");
  });
});

describe("isSensitiveKey", () => {
  it.each(["childName", "first_name", "email", "joinCode", "X-Auth-Token", "answers", "pin"])(
    "flags %s",
    (key) => expect(isSensitiveKey(key)).toBe(true),
  );
  it.each(["status_code", "method", "url", "surface", "spinner", "mapping", "level"])(
    "keeps %s",
    (key) => expect(isSensitiveKey(key)).toBe(false),
  );
});

describe("scrubBreadcrumb", () => {
  it("drops UI clicks and console output", () => {
    expect(scrubBreadcrumb({ category: "ui.click", message: "button[aria-label=Chidi]" })).toBe(
      null,
    );
    expect(scrubBreadcrumb({ category: "console", message: "child Chidi" })).toBe(null);
  });

  it("scrubs navigation and fetch URLs", () => {
    const crumb = scrubBreadcrumb({
      category: "fetch",
      data: { url: "https://x.supabase.co/rest/v1/children?name=eq.Chidi", status_code: 200 },
    });
    expect(crumb?.data).toEqual({
      url: "https://x.supabase.co/rest/v1/children",
      status_code: 200,
    });
  });
});

describe("scrubEvent", () => {
  it("removes identity, request bodies and personal values", () => {
    const event = {
      type: undefined,
      message: "Could not save answer for kemi@example.com",
      user: { id: "u1", email: "kemi@example.com", ip_address: "1.2.3.4" },
      request: {
        url: "https://app.example/sky/?child=abc",
        headers: { "User-Agent": "Chrome", Cookie: "sb=secret" },
        data: { answer: "42" },
        query_string: "child=abc",
      },
      extra: { childName: "Kemi", itemCount: 4, payload: { answers: ["B"], note: "x" } },
      tags: { surface: "child" },
      contexts: { browser: { name: "Chrome" }, attempt: { child_id: "c1", item: 3 } },
      exception: {
        values: [
          {
            type: "Error",
            value: 'Bad PIN for "Kemi"',
            stacktrace: {
              frames: [
                { abs_path: "https://app.example/_next/x.js?token=1", vars: { pin: "1234" } },
              ],
            },
          },
        ],
      },
      breadcrumbs: [
        { category: "ui.click", message: "Kemi" },
        { category: "navigation", data: { from: "/sign-in/?email=a@b.co", to: "/sky/" } },
      ],
    } as unknown as ErrorEvent;

    const out = scrubEvent(event);
    const text = JSON.stringify(out);
    expect(out.user).toBeUndefined();
    expect(text).not.toMatch(/kemi|Kemi|secret|1\.2\.3\.4|"42"|1234|a@b\.co|child=abc/);
    expect(out.request).toEqual({
      url: "https://app.example/sky/",
      headers: { "User-Agent": "Chrome" },
    });
    expect(out.extra).toEqual({
      childName: FILTERED,
      itemCount: 4,
      payload: { answers: FILTERED, note: FILTERED },
    });
    expect(out.contexts).toEqual({
      browser: { name: "Chrome" },
      attempt: { child_id: FILTERED, item: 3 },
    });
    expect(out.breadcrumbs).toHaveLength(1);
    expect(out.exception?.values?.[0]?.stacktrace?.frames?.[0]).toEqual({
      abs_path: "https://app.example/_next/x.js",
    });
  });
});

describe("surfaceFromPath", () => {
  it.each([
    ["/sky/", "child"],
    ["/Stellara/practice/fractions/", "child"],
    ["/family/", "family"],
    ["/school/classes/", "school"],
    ["/sign-in/", "auth"],
    ["/", "public"],
  ])("maps %s to %s", (path, surface) => {
    expect(surfaceFromPath(path, "/Stellara")).toBe(surface);
  });
});

describe("startMonitoring", () => {
  it("is a no-op and loads no SDK without a DSN", async () => {
    vi.doMock("../lib/monitoring/sentry-sdk", () => {
      throw new Error("Sentry must not load without a DSN");
    });
    await expect(startMonitoring({ dsn: undefined })).resolves.toBe(false);
    await expect(startMonitoring({ dsn: "" })).resolves.toBe(false);
    vi.doUnmock("../lib/monitoring/sentry-sdk");
  });
});
