import { AdultShell } from "@stellara/ui";

import type { ReactNode } from "react";

export default function SchoolLayout({ children }: { children: ReactNode }) {
  return <AdultShell>{children}</AdultShell>;
}
