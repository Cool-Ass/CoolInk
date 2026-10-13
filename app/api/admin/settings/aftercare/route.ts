import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/adminApi";
import { isSameOrigin } from "@/lib/requestSecurity";
import { validateAftercare } from "@/lib/aftercare";
export async function PUT(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const access = await requireAdminApi("settings.manage"); if (!access.ok) return access.response;
  let settings;
  try { settings = validateAftercare(await request.json()); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Sprawdź ustawienia." }, { status: 400 }); }
  await prisma.$transaction(async tx => {
    await tx.siteSetting.upsert({ where: { key: "aftercare_settings" }, create: { key: "aftercare_settings", value: JSON.stringify(settings) }, update: { value: JSON.stringify(settings) } });
    await tx.adminAuditLog.create({ data: { adminUserId: access.admin.id, action: "aftercare.settings", targetType: "SiteSetting", summary: "Zmieniono harmonogram aftercare." } });
  });
  return NextResponse.json({ settings });
}
