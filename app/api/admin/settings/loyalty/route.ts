import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/adminApi";
import { prisma } from "@/lib/prisma";
import { isSameOrigin, rateLimit, tooManyRequests } from "@/lib/requestSecurity";
import { lockBookingCalendar } from "@/lib/bookingRules";
import { getLoyaltyRules, LOYALTY_SETTINGS_KEY } from "@/lib/loyaltySettings";
import { validateLoyaltyRules } from "@/lib/loyaltyRules";

export async function PUT(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const auth = await requireAdminApi("settings.manage");
  if (!auth.ok) return auth.response;
  const limit = await rateLimit(request, "loyalty-settings", 10, 60_000, auth.admin.id);
  if (!limit.allowed) return tooManyRequests(limit);
  let rules;
  try { rules = validateLoyaltyRules(await request.json()); }
  catch { return NextResponse.json({ error: "Sprawdź kwoty, liczbę pieczątek (1–50) i rabat (1–100%)." }, { status: 400 }); }
  await prisma.$transaction(async (tx) => {
    await lockBookingCalendar(tx);
    const before = await getLoyaltyRules(tx);
    const value = JSON.stringify(rules);
    await tx.siteSetting.upsert({ where: { key: LOYALTY_SETTINGS_KEY }, update: { value }, create: { key: LOYALTY_SETTINGS_KEY, value } });
    await tx.adminAuditLog.create({ data: { adminUserId: auth.admin.id, action: "loyalty_settings_updated", targetType: "SiteSetting", targetId: LOYALTY_SETTINGS_KEY, summary: "Zmieniono zasady programu lojalnościowego", metadata: JSON.stringify({ before, after: rules }) } });
  });
  return NextResponse.json({ rules });
}
