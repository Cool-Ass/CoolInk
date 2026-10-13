import { requireAdminApi } from "@/lib/adminApi";
import { isSameOrigin } from "@/lib/requestSecurity";
import { prisma } from "@/lib/prisma";
import { lockBookingCalendar } from "@/lib/bookingRules";
import { verifyExplicitAppointmentAvailability } from "@/lib/appointmentAvailability";
import { campaignInput } from "@/lib/marketing";
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(request)) return Response.json({ error: "Forbidden" }, { status: 403 });
  const access = await requireAdminApi("content.manage"); if (!access.ok) return access.response;
  const body = await request.json().catch(() => null), { id } = await params;
  if (!["save", "approve", "reject"].includes(body?.action) || typeof body?.updatedAt !== "string") return Response.json({ error: "Sprawdź wybraną akcję." }, { status: 400 });
  let data: ReturnType<typeof campaignInput> | undefined;
  if (body.action === "save") { try { data = campaignInput(body); } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Sprawdź ofertę." }, { status: 400 }); } }
  try {
    const result = await prisma.$transaction(async tx => {
      await lockBookingCalendar(tx);
      const current = await tx.promotion.findFirst({ where: { id, campaignStatus: "draft" } });
      if (!current || current.updatedAt.toISOString() !== body.updatedAt) return { status: 409, error: "Kampania zmieniła się. Odśwież listę." };
      if (body.action !== "reject") { const range = data ?? current; const available = await verifyExplicitAppointmentAvailability(range.startsAt, range.endsAt, undefined, tx, { serviceType: "tattoo" }); if (!available.ok || range.startsAt <= new Date()) return { status: 409, error: "Termin nie jest już dostępny. Zmień ofertę." }; }
      const campaign = await tx.promotion.update({ where: { id }, data: { ...(data ?? {}), campaignStatus: body.action === "approve" ? "approved" : body.action === "reject" ? "rejected" : "draft", campaignApprovedAt: body.action === "approve" ? new Date() : null, campaignApprovedBy: body.action === "approve" ? access.admin.id : null, active: false, isPublic: false } });
      await tx.adminAuditLog.create({ data: { adminUserId: access.admin.id, action: "campaign." + body.action, targetType: "Promotion", targetId: id, summary: "Zmieniono kampanię. Bez publikacji i wysyłki." } });
      return { status: 200, campaign };
    });
    return Response.json(result.error ? { error: result.error } : { campaign: result.campaign }, { status: result.status });
  } catch { return Response.json({ error: "Nie udało się zmienić kampanii." }, { status: 503 }); }
}
