// @vitest-environment node
import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import { applyCsp, FRAME_GUARD, hashScript } from "../scripts/apply-csp.mjs";
import { cspDirectives, securityHeaders, serializeCsp } from "../scripts/security-headers.mjs";

const page = (body: string) =>
  `<!DOCTYPE html><html><head><meta charSet="utf-8"/><script src="/_next/a.js" async=""></script>` +
  `<script id="stellara-theme">document.documentElement.dataset.t="1"</script></head>` +
  `<body>${body}<script>self.__next_f.push([1,"x"])</script></body></html>`;

const policyOf = (html: string) =>
  /http-equiv="Content-Security-Policy" content="([^"]+)"/.exec(html)?.[1] ?? "";

describe("applyCsp", () => {
  it("hashes every inline script, including the frame guard", () => {
    const html = applyCsp(page(""), {});
    const policy = policyOf(html);
    for (const source of [
      'document.documentElement.dataset.t="1"',
      'self.__next_f.push([1,"x"])',
      FRAME_GUARD,
    ]) {
      const digest = createHash("sha256").update(source).digest("base64");
      expect(policy).toContain(`'sha256-${digest}'`);
    }
    expect(policy).not.toContain("unsafe-inline' 'sha");
    expect(policy).not.toMatch(/script-src[^;]*unsafe-inline/);
  });

  it("puts the policy before any script and right after the charset", () => {
    const html = applyCsp(page(""), {});
    const meta = html.indexOf("Content-Security-Policy");
    expect(meta).toBeGreaterThan(html.indexOf("charSet"));
    expect(meta).toBeLessThan(html.indexOf("<script"));
  });

  it("is idempotent", () => {
    const once = applyCsp(page(""), {});
    expect(applyCsp(once, {})).toBe(once);
  });

  it("omits frame-ancestors from <meta>, where browsers ignore it", () => {
    expect(policyOf(applyCsp(page(""), {}))).not.toContain("frame-ancestors");
  });

  it("allows only first-party scripts and the configured Supabase and Sentry origins", () => {
    const policy = policyOf(
      applyCsp(page(""), {
        NEXT_PUBLIC_SUPABASE_URL: "https://abc.supabase.co",
        NEXT_PUBLIC_SENTRY_DSN: "https://key@o1.ingest.de.sentry.io/42",
      }),
    );
    expect(policy).toContain(
      "connect-src 'self' https://abc.supabase.co wss://abc.supabase.co https://o1.ingest.de.sentry.io",
    );
    expect(policy).toMatch(/script-src 'self' 'sha256-/);
    expect(policy).toContain("object-src 'none'");
    expect(policy).toContain("base-uri 'none'");
  });

  it("does not hash non-executable data blocks", () => {
    const html = applyCsp(page('<script type="application/ld+json">{"a":1}</script>'), {});
    expect(policyOf(html)).not.toContain(hashScript('{"a":1}'));
  });
});

describe("security headers", () => {
  it("sends frame-ancestors 'none' and anti-framing headers where headers are possible", () => {
    const headers = Object.fromEntries(securityHeaders({}).map((h) => [h.key, h.value]));
    expect(headers["Content-Security-Policy"]).toContain("frame-ancestors 'none'");
    expect(headers["X-Frame-Options"]).toBe("DENY");
    expect(headers["X-Content-Type-Options"]).toBe("nosniff");
  });

  it("ignores malformed origins", () => {
    const policy = serializeCsp(cspDirectives({ env: { NEXT_PUBLIC_SENTRY_DSN: "not a url" } }));
    expect(policy).toContain("connect-src 'self';");
  });
});
