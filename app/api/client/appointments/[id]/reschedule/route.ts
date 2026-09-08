import { NextResponse } from "next/server";
import { getCurrentClient } from "@/lib/clientAuth";
import { canClientRescheduleAppointment } from "@/lib/clientAppointment";
import { lockBookingCalendar } from "@/lib/bookingRules";
import { verifyExplicitAppointmentAvailability } from "@/lib/appointmentAvailability";
import { isConsultationSlot } from "@/lib/calendarHub";
import { formatCoolinkDateTime } from "@/lib/dateTime";
import { prisma } from "@/lib/prisma";
import { isSameOrigin, rateLimit, setRateLimitHeaders, tooManyRequests } from "@/lib/requestSecurity";
import { sendPushToAdmins } from "@/lib/webPush";
import { syncAppointmentToGoogle } from "@/lib/googleCalendarSyncEngine";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const client = await getCurrentClient();
  if (!client) return NextResponse.json({ error: "Zaloguj się ponownie." }, { status: 401 });
  const limit = await rateLimit(request, "client-appointment-reschedule", 5, 15 * 60_000, client.id);
  if (!limit.allowed) return tooManyRequests(limit);
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const startsAt = new Date(String(body?.startsAt ?? ""));
  const endsAt = new Date(String(body?.endsAt ?? ""));
  const note = String(body?.note ?? "").trim().slice(0, 1000);
  const appointment = await prisma.appointment.findFirst({ where: { id, project: { clientId: client.id } }, include: { project: { select: { id: true, kind: true } } } });
  if (!appointment) return NextResponse.json({ error: "Nie znaleziono wizyty." }, { status: 404 });
  if (!canClientRescheduleAppointment(appointment)) return NextResponse.json({ error: "Samodzielne przełożenie jest możliwe najpóźniej 48 godzin przed wizytą." }, { status: 409 });
  const availability = await verifyExplicitAppointmentAvailability(startsAt, endsAt, id);
  if (!availability.ok) return NextResponse.json({ error: availability.error }, { status: availability.status });
  const slot = await prisma.availableSlot.findFirst({ where: { isPublic: true, startsAt: { lte: startsAt }, endsAt: { gte: endsAt } }, select: { title: true } });
  const slotKind = isConsultationSlot(slot ?? {}) ? "consultation" : "tattoo";
  if (slotKind !== appointment.project.kind) return NextResponse.json({ error: appointment.project.kind === "consultation" ? "Wybierz termin oznaczony jako konsultacja." : "Wybierz zwykły wolny termin, nie termin konsultacji." }, { status: 409 });

  const updated = await prisma.$transaction(async (tx) => {
    await lockBookingCalendar(tx);
    const current = await tx.appointment.findFirst({ where: { id, project: { clientId: client.id } }, include: { project: { select: { kind: true } } } });
    if (!current || !canClientRescheduleAppointment(current)) return null;
    const lockedAvailability = await verifyExplicitAppointmentAvailability(startsAt, endsAt, id, tx);
    if (!lockedAvailability.ok) return null;
    const lockedSlot = await tx.availableSlot.findFirst({ where: { isPublic: true, startsAt: { lte: startsAt }, endsAt: { gte: endsAt } }, select: { title: true } });
    if ((isConsultationSlot(lockedSlot ?? {}) ? "consultation" : "tattoo") !== current.project.kind) return null;
    const item = await tx.appointment.update({ where: { id }, data: { startsAt, endsAt, status: "requested", notes: note || current.notes } });
    await tx.tattooProject.update({ where: { id: current.projectId }, data: { status: "awaiting_confirmation", nextAction: current.project.kind === "consultation" ? "Potwierdź nowy termin konsultacji" : "Potwierdź klientowi przełożony termin" } });
    await tx.projectActivity.create({ data: { projectId: current.projectId, type: "appointment_rescheduled_by_client", message: `Klient poprosił o przełożenie wizyty na ${formatCoolinkDateTime(startsAt)}.`, visibility: "admin" } });
    await tx.clientNotification.create({ data: { clientId: client.id, projectId: current.projectId, appointmentId: id, type: "APPOINTMENT_RESCHEDULE_REQUESTED", title: "Prośba o przełożenie wysłana", body: `Studio sprawdzi nowy termin: ${formatCoolinkDateTime(startsAt)}.`, href: "/app/portal/projects" } });
    return item;
  });
  if (!updated) return NextResponse.json({ error: "Termin właśnie się zmienił lub został zajęty. Wybierz inny." }, { status: 409 });
  await sendPushToAdmins({ title: "Klient chce przełożyć wizytę", body: `${client.firstName} ${client.lastName}: ${formatCoolinkDateTime(startsAt)}`, url: "/admin", tag: `client-reschedule-${id}` }).catch(() => undefined);
  await syncAppointmentToGoogle(id).catch(() => undefined);
  return setRateLimitHeaders(NextResponse.json({ appointment: updated }), limit);
}
