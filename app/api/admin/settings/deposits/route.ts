import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/adminApi";
import { prisma } from "@/lib/prisma";
import { isSameOrigin, rateLimit, tooManyRequests } from "@/lib/requestSecurity";
import { DEPOSIT_INSTRUCTIONS_KEY, validateDepositInstructions } from "@/lib/depositInstructions";
export async function PUT(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const access = await requireAdminApi("settings.manage");
  if (!access.ok) return access.response;
  const limit = await rateLimit(request, "deposit-settings", 10, 60_000, access.admin.id);
  if (!limit.allowed) return tooManyRequests(limit);
  let instructions;
  try { instructions = validateDepositInstructions(await request.json()); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Sprawdź dane." }, { status: 400 }); }
  await prisma.$transaction(async tx => {
    const before = await tx.siteSetting.findUnique({ where: { key: DEPOSIT_INSTRUCTIONS_KEY } });
    const value = JSON.stringify(instructions);
    await tx.siteSetting.upsert({ where: { key: DEPOSIT_INSTRUCTIONS_KEY }, create: { key: DEPOSIT_INSTRUCTIONS_KEY, value }, update: { value } });
    await tx.adminAuditLog.create({ data: { adminUserId: access.admin.id, action: "deposit_instructions.update", targetType: "SiteSetting", targetId: DEPOSIT_INSTRUCTIONS_KEY, summary: "Zmieniono instrukcje wpłaty zadatku", metadata: JSON.stringify({ before: before?.value ?? null, after: instructions }) } });
  });
  return NextResponse.json({ instructions });
}
