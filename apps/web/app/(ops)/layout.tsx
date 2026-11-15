import { AdultShell } from "@stellara/ui";

import type { ReactNode } from "react";

export default function OpsLayout({ children }: { children: ReactNode }) {
  return <AdultShell>{children}</AdultShell>;
}
