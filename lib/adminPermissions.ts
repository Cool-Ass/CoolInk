export const ADMIN_ROLES = ["owner", "manager", "artist", "receptionist"] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

export type AdminPermission =
  | "operations.manage"
  | "projects.delete"
  | "clients.delete"
  | "finance.manage"
  | "inventory.manage"
  | "content.manage"
  | "settings.manage";

const permissions: Record<AdminRole, readonly AdminPermission[]> = {
  owner: ["operations.manage", "projects.delete", "clients.delete", "finance.manage", "inventory.manage", "content.manage", "settings.manage"],
  manager: ["operations.manage", "projects.delete", "finance.manage", "inventory.manage", "content.manage"],
  artist: ["operations.manage"],
  receptionist: ["operations.manage"],
};

export function normalizeAdminRole(role: string): AdminRole {
  return (ADMIN_ROLES as readonly string[]).includes(role) ? role as AdminRole : "receptionist";
}

export function hasAdminPermission(role: string, permission: AdminPermission) {
  return permissions[normalizeAdminRole(role)].includes(permission);
}

export const ADMIN_ROLE_LABEL: Record<AdminRole, string> = {
  owner: "Właściciel",
  manager: "Manager",
  artist: "Artysta",
  receptionist: "Recepcja",
};
