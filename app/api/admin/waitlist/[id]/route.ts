import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/adminApi";
import { writeAdminAudit } from "@/lib/adminAudit";
import { prisma } from "@/lib/prisma";
import { isSameOrigin } from "@/lib/requestSecurity";
import { syncAppointmentToGoogle } from "@/lib/googleCalendarSyncEngine";
import { lockBookingCalendar } from "@/lib/bookingRules";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const auth = await requireAdminApi("operations.manage");
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const status = String(body?.status ?? "");
  if (!(["active", "paused", "closed"] as const).includes(status as "active")) return NextResponse.json({ error: "Nieprawidłowy status listy." }, { status: 400 });
  const result = await prisma.$transaction(async (tx) => {
    await lockBookingCalendar(tx);
    const entry = await tx.waitlistEntry.findUnique({ where: { id }, include: { offeredAppointment: { select: { id: true, status: true } } } });
    if (!entry) return null;
    const cancelled = entry.offeredAppointment?.status === "proposed"
      ? await tx.appointment.updateMany({ where: { id: entry.offeredAppointment.id, status: "proposed" }, data: { status: "cancelled" } }) : null;
    await tx.waitlistEntry.update({ where: { id }, data: { status, offeredAppointmentId: null, offeredAt: null, offerExpiresAt: null } });
    await tx.projectActivity.create({ data: { projectId: entry.projectId, type: "waitlist_status_changed", message: `Status listy rezerwowej zmieniono na: ${status}.`, visibility: "admin" } });
    return { entry, cancelled: Boolean(cancelled?.count) };
  });
  if (!result) return NextResponse.json({ error: "Nie znaleziono wpisu." }, { status: 404 });
  const { entry, cancelled } = result;
  await writeAdminAudit({ adminUserId: auth.admin.id, action: "waitlist.status", targetType: "WaitlistEntry", targetId: id, summary: `Zmieniono status listy rezerwowej na ${status}.` });
  if (cancelled && entry.offeredAppointment) await syncAppointmentToGoogle(entry.offeredAppointment.id).catch(() => undefined);
  return NextResponse.json({ ok: true });
}
