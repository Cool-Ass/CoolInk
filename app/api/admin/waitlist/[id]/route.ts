import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/adminApi";
import { writeAdminAudit } from "@/lib/adminAudit";
import { prisma } from "@/lib/prisma";
import { isSameOrigin } from "@/lib/requestSecurity";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const auth = await requireAdminApi("operations.manage");
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const status = String(body?.status ?? "");
  if (!(["active", "paused", "closed"] as const).includes(status as "active")) return NextResponse.json({ error: "Nieprawidłowy status listy." }, { status: 400 });
  const entry = await prisma.waitlistEntry.findUnique({ where: { id }, include: { offeredAppointment: { select: { id: true, status: true } } } });
  if (!entry) return NextResponse.json({ error: "Nie znaleziono wpisu." }, { status: 404 });
  await prisma.$transaction(async (tx) => {
    if (entry.offeredAppointment?.status === "proposed") await tx.appointment.update({ where: { id: entry.offeredAppointment.id }, data: { status: "cancelled" } });
    await tx.waitlistEntry.update({ where: { id }, data: { status, offeredAppointmentId: null, offeredAt: null, offerExpiresAt: null } });
    await tx.projectActivity.create({ data: { projectId: entry.projectId, type: "waitlist_status_changed", message: `Status listy rezerwowej zmieniono na: ${status}.`, visibility: "admin" } });
  });
  await writeAdminAudit({ adminUserId: auth.admin.id, action: "waitlist.status", targetType: "WaitlistEntry", targetId: id, summary: `Zmieniono status listy rezerwowej na ${status}.` });
  return NextResponse.json({ ok: true });
}
