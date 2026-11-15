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
    : {}),
};
export default config;
