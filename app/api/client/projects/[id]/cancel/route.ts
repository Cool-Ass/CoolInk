import { NextResponse } from "next/server";
import { getCurrentClient } from "@/lib/clientAuth";
import { prisma } from "@/lib/prisma";
import { isSameOrigin } from "@/lib/requestSecurity";
import { sendPushToAdmins } from "@/lib/webPush";
import { syncAppointmentToGoogle } from "@/lib/googleCalendarSyncEngine";
import { lockBookingCalendar } from "@/lib/bookingRules";
import { offerReleasedRange } from "@/lib/waitlistAutomation";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const client = await getCurrentClient();
  if (!client) return NextResponse.json({ error: "Zaloguj się ponownie." }, { status: 401 });
  const { id } = await params;
  const appointments = await prisma.$transaction(async (tx) => {
    await lockBookingCalendar(tx);
    const project = await tx.tattooProject.findFirst({ where: { id, clientId: client.id }, select: { id: true, status: true } });
    if (!project) return null;
    if (project.status === "cancelled") return [];
    const released = await tx.appointment.findMany({ where: { projectId: id, status: { in: ["requested", "proposed", "confirmed"] } }, select: { id: true, startsAt: true, endsAt: true } });
    await tx.appointment.updateMany({ where: { projectId: id, status: { in: ["requested", "proposed", "confirmed"] } }, data: { status: "cancelled" } });
    await tx.tattooProject.update({ where: { id }, data: { status: "cancelled" } });
    await tx.waitlistEntry.updateMany({ where: { projectId: id, status: { in: ["active", "offered"] } }, data: { status: "closed", offerExpiresAt: null } });
    await tx.projectActivity.create({ data: { projectId: id, type: "project_cancelled_by_client", message: "Klient anulował projekt. Historia i dokumenty pozostają zachowane.", visibility: "admin" } });
    return released;
  });
  if (!appointments) return NextResponse.json({ error: "Nie znaleziono projektu." }, { status: 404 });
  await sendPushToAdmins({ title: "Klient anulował projekt", body: `${client.firstName} ${client.lastName} anulował swój projekt.`, url: `/admin/clients/${client.id}`, tag: `client-project-cancel-${id}` }).catch(() => undefined);
  await Promise.all(appointments.map(async (appointment) => {
    await syncAppointmentToGoogle(appointment.id).catch(() => undefined);
    if (appointment.endsAt > new Date()) await offerReleasedRange(appointment.startsAt, appointment.endsAt).catch(() => undefined);
  }));
  return NextResponse.json({ ok: true });
}
