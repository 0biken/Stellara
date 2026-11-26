export const staffRoles = ["super_admin", "admin", "author", "reviewer", "content_lead"];

const grants = {
  super_admin: [
    "staff.manage",
    "operations.read",
    "support.read",
    "audit.read",
    "content.write",
    "content.review",
    "content.publish",
  ],
  admin: ["operations.read", "support.read", "audit.read"],
  author: ["content.write"],
  reviewer: ["content.review"],
  content_lead: ["content.write", "content.review", "content.publish"],
};

export function canStaff(role, permission) {
  return Object.hasOwn(grants, role) && grants[role].includes(permission);
}
