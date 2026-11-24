"use client";

import { createContext, useContext, type ReactNode } from "react";

import type { AdminApi, StaffSession } from "../../lib/admin/types";

export interface StaffContextValue {
  api: AdminApi;
  session: StaffSession;
  refresh: () => void;
}
export const StaffContext = createContext<StaffContextValue | null>(null);
export function useStaff() {
  const value = useContext(StaffContext);
  if (!value) throw new Error("Staff workspace is required");
  return value;
}
export function StaffProvider({
  value,
  children,
}: {
  value: StaffContextValue;
  children: ReactNode;
}) {
  return <StaffContext value={value}>{children}</StaffContext>;
}
