import "@stellara/ui/tokens.css";
import "./styles.css";

import { getCatalogue } from "@stellara/i18n";

import type { Metadata } from "next";
import type { ReactNode } from "react";

const copy = getCatalogue("en-NG");
export const metadata: Metadata = { title: copy.brand, description: copy.homeDescription };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en-NG">
      <head>
        <meta name="color-scheme" content="light dark" />
      </head>
      <body>{children}</body>
    </html>
  );
}
