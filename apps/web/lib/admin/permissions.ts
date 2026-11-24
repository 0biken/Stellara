import { staffRoles, type StaffRole } from "./types";

export function isStaffRole(role: unknown): role is StaffRole {
  return staffRoles.includes(role as StaffRole);
}
const content: StaffRole[] = ["super_admin", "author", "reviewer", "content_lead"];
const operations: StaffRole[] = ["super_admin", "admin"];
export const staffNavigation: {
  href: string;
  label: string;
  section: string;
  roles: readonly StaffRole[];
}[] = [
  { href: "/admin", label: "Overview", section: "Workspace", roles: staffRoles },
  { href: "/admin/content", label: "Content library", section: "Content", roles: content },
  {
    href: "/admin/reviews",
    label: "Review queue",
    section: "Content",
    roles: ["super_admin", "reviewer", "content_lead"],
  },
  {
    href: "/admin/publishing",
    label: "Publishing",
    section: "Content",
    roles: ["super_admin", "content_lead"],
  },
  { href: "/admin/team", label: "Staff team", section: "Administration", roles: ["super_admin"] },
  { href: "/admin/support", label: "Family support", section: "Administration", roles: operations },
  { href: "/admin/audit", label: "Audit history", section: "Administration", roles: operations },
  { href: "/admin/security", label: "Account security", section: "Account", roles: staffRoles },
];
export const navigationFor = (role: StaffRole) =>
  staffNavigation.filter((entry) => entry.roles.includes(role));
export function canAccessPath(role: unknown, pathname: string) {
  if (!isStaffRole(role)) return false;
  const path = pathname.replace(/\/$/, "");
  if (path === "/admin/content/item" || path === "/admin/content/lesson")
    return content.includes(role);
  return staffNavigation.some((entry) => entry.href === path && entry.roles.includes(role));
}
