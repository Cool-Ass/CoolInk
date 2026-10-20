import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/auth";
import { hasAdminPermission, type AdminPermission } from "@/lib/adminPermissions";

export async function requireAdminPage(permission?: AdminPermission) {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");
  if (permission && !hasAdminPermission(admin.role, permission)) redirect("/admin?access=denied");
  return admin;
}
