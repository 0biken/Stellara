import { ParentSettingsClient } from "./settings-client";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Parent settings — Stellara" };

export default function ParentSettingsPage() {
  return <ParentSettingsClient />;
}
