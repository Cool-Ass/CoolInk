import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import { hasAdminPermission, type AdminPermission } from "@/lib/adminPermissions";

export async function requireAdminApi(permission?: AdminPermission) {
  const admin = await getCurrentAdmin();
  if (!admin) return { ok: false as const, response: NextResponse.json({ error: "Brak dostępu administratora." }, { status: 401 }) };
  if (permission && !hasAdminPermission(admin.role, permission)) {
    return { ok: false as const, response: NextResponse.json({ error: "Twoja rola nie ma uprawnień do tej operacji." }, { status: 403 }) };
  }
  return { ok: true as const, admin };
}
