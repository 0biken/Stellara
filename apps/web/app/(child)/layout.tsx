import { ChildShell } from "@stellara/ui";

import type { ReactNode } from "react";

export default function ChildLayout({ children }: { children: ReactNode }) {
  return <ChildShell>{children}</ChildShell>;
}
