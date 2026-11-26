import { StaffWorkspace } from "../../../components/admin/staff-workspace";

import type { ReactNode } from "react";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <StaffWorkspace>{children}</StaffWorkspace>;
}
