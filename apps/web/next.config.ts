import { securityHeaders } from "./scripts/security-headers.mjs";

import type { NextConfig } from "next";

const isGitHubPages = process.env.GITHUB_PAGES === "true";
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const config: NextConfig = {
  transpilePackages: ["@stellara/ui", "@stellara/i18n"],
  poweredByHeader: false,
  ...(isGitHubPages
    ? {
        output: "export",
        trailingSlash: true,
        basePath,
        images: { unoptimized: true },
      }
    : {
        // Static exports cannot send headers; scripts/apply-csp.mjs adds a hashed
        // CSP <meta> instead. Header-capable hosts (Vercel, next start) get these.
        async headers() {
          return [{ source: "/:path*", headers: securityHeaders() }];
        },
      }),
};
export default config;
