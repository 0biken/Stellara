import type { Metadata } from "next";

import { ParentSettingsClient } from "./settings-client";

export const metadata: Metadata = { title: "Parent settings — Stellara" };

export default function ParentSettingsPage() {
  return <ParentSettingsClient />;
}
