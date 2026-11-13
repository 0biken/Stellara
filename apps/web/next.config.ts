import type { NextConfig } from "next";

const config: NextConfig = {
  transpilePackages: ["@stellara/ui", "@stellara/i18n"],
  poweredByHeader: false,
};
export default config;
