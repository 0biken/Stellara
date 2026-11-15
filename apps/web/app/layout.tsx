import "@stellara/ui/styles.css";
import "./styles.css";

import { getCatalogue } from "@stellara/i18n";
import { themeBootstrapScript, themeColors } from "@stellara/ui";

import type { Metadata } from "next";
import type { ReactNode } from "react";

const copy = getCatalogue("en-NG");
export const metadata: Metadata = { title: copy.brand, description: copy.homeDescription };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en-NG" suppressHydrationWarning>
      <head>
        <meta name="color-scheme" content="light dark" />
        <meta
          name="theme-color"
          content={themeColors.light}
          media="(prefers-color-scheme: light)"
        />
        <meta name="theme-color" content={themeColors.dark} media="(prefers-color-scheme: dark)" />
        <script id="stellara-theme" dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
