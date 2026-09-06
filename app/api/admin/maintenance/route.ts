import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/adminApi";
import { isSameOrigin } from "@/lib/requestSecurity";
import { MAINTENANCE_MODE_KEY, getMaintenanceMode } from "@/lib/maintenance";

export async function GET() {
  const access = await requireAdminApi();
  if (!access.ok) return access.response;
  return NextResponse.json({ enabled: await getMaintenanceMode() });
}

export async function PATCH(request: Request) {
  const access = await requireAdminApi();
  if (!access.ok) return access.response;
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json().catch(() => null);
  if (!body || typeof body.enabled !== "boolean") {
    return NextResponse.json({ error: "Nieprawidłowa wartość trybu strony." }, { status: 400 });
  }

  await prisma.siteSetting.upsert({
    where: { key: MAINTENANCE_MODE_KEY },
    update: { value: String(body.enabled) },
    create: { key: MAINTENANCE_MODE_KEY, value: String(body.enabled) },
  });

  revalidatePath("/");
  revalidatePath("/admin/pages");
  return NextResponse.json({ enabled: body.enabled });
}

