import { Suspense } from "react";

import { ParentReports } from "./parent-reports";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Reports — Stellara" };

export default function ParentReportsPage() {
  return (
    <Suspense>
      <ParentReports />
    </Suspense>
  );
}
