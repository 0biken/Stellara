import { AdultShell } from "@stellara/ui";

import type { ReactNode } from "react";

export default function FamilyLayout({ children }: { children: ReactNode }) {
  return <AdultShell>{children}</AdultShell>;
}
