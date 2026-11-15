import { formatMessage } from "@stellara/i18n";
import { StudioShell } from "@stellara/ui";

import type { ReactNode } from "react";

export default function StudioLayout({ children }: { children: ReactNode }) {
  return <StudioShell narrowMessage={formatMessage("shell.studioNarrow")}>{children}</StudioShell>;
}
