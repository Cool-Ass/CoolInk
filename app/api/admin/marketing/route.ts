import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/adminApi";
import { isSameOrigin, rateLimit, tooManyRequests } from "@/lib/requestSecurity";
import { lockBookingCalendar } from "@/lib/bookingRules";
import { verifyExplicitAppointmentAvailability } from "@/lib/appointmentAvailability";
import { campaignInput, marketingSegments } from "@/lib/marketing";
export async function GET() {
  const access = await requireAdminApi("content.manage"); if (!access.ok) return access.response;
  try { const [campaigns, segments] = await Promise.all([prisma.promotion.findMany({ where: { campaignStatus: { not: null } }, orderBy: { createdAt: "desc" }, take: 50 }), marketingSegments()]); return Response.json({ campaigns, segments }, { headers: { "Cache-Control": "private, no-store" } }); }
  catch { return Response.json({ error: "Nie udało się wczytać kampanii." }, { status: 503 }); }
}
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return Response.json({ error: "Forbidden" }, { status: 403 });
  const access = await requireAdminApi("content.manage"); if (!access.ok) return access.response;
  const limit = await rateLimit(request, "marketing-campaign", 30, 3600000, access.admin.id); if (!limit.allowed) return tooManyRequests(limit);
  let data;
  try { data = campaignInput(await request.json()); } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Sprawdź ofertę." }, { status: 400 }); }
  try {
    const result = await prisma.$transaction(async tx => {
      await lockBookingCalendar(tx);
      const available = await verifyExplicitAppointmentAvailability(data.startsAt, data.endsAt, undefined, tx, { serviceType: "tattoo" });
      if (!available.ok) return { error: available.error };
      const campaign = await tx.promotion.create({ data: { ...data, campaignStatus: "draft", active: false, isPublic: false } });
      await tx.adminAuditLog.create({ data: { adminUserId: access.admin.id, action: "campaign.draft", targetType: "Promotion", targetId: campaign.id, summary: "Przygotowano szkic kampanii bez publikacji i wysyłki." } });
      return { campaign };
    });
    return Response.json(result, { status: result.error ? 409 : 201 });
  } catch { return Response.json({ error: "Nie udało się zapisać kampanii." }, { status: 503 }); }
}
