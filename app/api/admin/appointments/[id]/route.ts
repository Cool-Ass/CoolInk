import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { bookingConflict, bookingConflictMessage, lockBookingCalendar, validAppointmentRange } from "@/lib/bookingRules";
import { isSameOrigin } from "@/lib/requestSecurity";
import { projectStatusAfterAppointmentChange } from "@/lib/projectLifecycle";
import { formatCoolinkDateTime } from "@/lib/dateTime";
import { syncAppointmentToGoogle } from "@/lib/googleCalendarSyncEngine";
import { offerReleasedRange } from "@/lib/waitlistAutomation";

interface Params { params: Promise<{ id: string }>; }

export async function PATCH(request: Request, { params }: Params) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!(await getCurrentAdmin())) return NextResponse.json({ error: "Brak dostępu administratora." }, { status: 401 });
  const { id } = await params; const body = await request.json().catch(() => null);
  const appointment = await prisma.appointment.findUnique({ where: { id }, include: { project: { select: { clientId: true, depositStatus: true } } } });
  if (!appointment) return NextResponse.json({ error: "Wizyta nie istnieje." }, { status: 404 });
  const startsAt = body?.startsAt ? new Date(String(body.startsAt)) : appointment.startsAt;
  const endsAt = body?.endsAt ? new Date(String(body.endsAt)) : appointment.endsAt;
  const serviceType = typeof body?.serviceType === "string" ? body.serviceType.trim().slice(0, 80) || null : appointment.serviceType;
  const workstation = typeof body?.workstation === "string" ? body.workstation.trim().slice(0, 80) || null : appointment.workstation;
  if (!validAppointmentRange(startsAt, endsAt)) return NextResponse.json({ error: "Wybierz termin co 30 minut, o długości od 30 minut do 12 godzin." }, { status: 400 });
  const requestedStatus = typeof body?.status === "string" ? body.status : appointment.status;
  const timeChanged = startsAt.getTime() !== appointment.startsAt.getTime() || endsAt.getTime() !== appointment.endsAt.getTime();
  // A changed time is an offer from the studio, never an implicit client
  // confirmation. The client can respond only to this `proposed` state.
  const status = appointment.status === "requested" && timeChanged ? "proposed" : requestedStatus;
  if (!["requested", "proposed", "confirmed", "completed", "no_show", "cancelled"].includes(status)) return NextResponse.json({ error: "Nieprawidłowy status wizyty." }, { status: 400 });
  const conflict = await bookingConflict(startsAt, endsAt, id, !Boolean(body?.ignoreBuffer), prisma, { serviceType, workstation });
  if (status !== "cancelled" && (conflict.appointment || conflict.block)) return NextResponse.json({ error: bookingConflictMessage(conflict) }, { status: 409 });
  const rawPrice = body?.price; const price = rawPrice === undefined || rawPrice === "" ? appointment.price : Number(rawPrice);
  if (price !== null && (!Number.isInteger(price) || price < 0)) return NextResponse.json({ error: "Cena musi być liczbą całkowitą większą lub równą zero." }, { status: 400 });
  const changed = timeChanged || status !== appointment.status;
  const updated = await prisma.$transaction(async (tx) => {
    await lockBookingCalendar(tx);
    const settled = await tx.loyaltyEntry.findFirst({ where: { appointmentId: id, voidedAt: null } });
    if (settled && (status !== "completed" || timeChanged || price !== appointment.price || serviceType !== appointment.serviceType)) throw new Error("LOYALTY_LOCKED");
    const lockedConflict = await bookingConflict(startsAt, endsAt, id, !Boolean(body?.ignoreBuffer), tx, { serviceType, workstation });
    if (status !== "cancelled" && (lockedConflict.appointment || lockedConflict.block)) throw new Error("BOOKING_CONFLICT");
    const item = await tx.appointment.update({ where: { id }, data: { startsAt, endsAt, status, price, serviceType, workstation, notes: typeof body?.notes === "string" ? body.notes.trim() || null : appointment.notes } });
    if (!changed) return item;
    const cancelled = status === "cancelled" && appointment.status !== "cancelled";
    const proposed = status === "proposed";
    const message = cancelled ? "Wizyta została anulowana przez studio." : proposed ? `Studio zaproponowało nowy termin: ${formatCoolinkDateTime(startsAt)}.` : status !== appointment.status ? "Zmieniono status wizyty." : `Zmieniono termin wizyty na ${formatCoolinkDateTime(startsAt)}.`;
    await tx.projectActivity.create({ data: { projectId: appointment.projectId, type: proposed ? "appointment_proposed" : cancelled ? "appointment_cancelled" : "appointment_updated", message, visibility: "admin" } });
    const sessions = await tx.appointment.findMany({ where: { projectId: appointment.projectId }, select: { status: true } });
    const project = await tx.tattooProject.findUniqueOrThrow({ where: { id: appointment.projectId }, select: { status: true } });
    await tx.tattooProject.update({ where: { id: appointment.projectId }, data: { status: projectStatusAfterAppointmentChange(sessions, appointment.project.depositStatus, project.status) } });
    if (cancelled) await tx.clientNotification.create({ data: { clientId: appointment.project.clientId, projectId: appointment.projectId, appointmentId: id, type: "APPOINTMENT_CANCELLED", title: "Wizyta anulowana", body: "Studio anulowało wizytę. Skontaktuj się, aby ustalić nowy termin.", href: "/app/portal/visits" } });
    else if (proposed) await tx.clientNotification.create({ data: { clientId: appointment.project.clientId, projectId: appointment.projectId, appointmentId: id, type: "APPOINTMENT_PROPOSED", title: "Studio zaproponowało nowy termin", body: `Sprawdź propozycję: ${formatCoolinkDateTime(startsAt)}.`, href: "/app/portal/visits" } });
    else if (["confirmed", "completed", "no_show"].includes(status)) await tx.clientNotification.create({ data: { clientId: appointment.project.clientId, projectId: appointment.projectId, appointmentId: id, type: "APPOINTMENT_UPDATED", title: status === "confirmed" ? "Wizyta potwierdzona" : "Aktualizacja wizyty", body: message, href: "/app/portal/visits" } });
    return item;
  }).catch((error: unknown) => {
    if (error instanceof Error && error.message === "LOYALTY_LOCKED") return NextResponse.json({ error: "Wizyta jest rozliczona. Najpierw wycofaj rozliczenie w karcie lojalnościowej klienta." }, { status: 409 });
    if (error instanceof Error && error.message === "BOOKING_CONFLICT") return null;
    throw error;
  });
  if (updated instanceof NextResponse) return updated;
  if (!updated) return NextResponse.json({ error: "Ten termin został właśnie zajęty. Wybierz inny zakres." }, { status: 409 });
  await syncAppointmentToGoogle(updated.id).catch(() => undefined);
  if (status === "cancelled" && appointment.status !== "cancelled") await offerReleasedRange(appointment.startsAt, appointment.endsAt).catch(() => undefined);
  return NextResponse.json({ appointment: updated });
}

export async function DELETE(request: Request, { params }: Params) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!(await getCurrentAdmin())) return NextResponse.json({ error: "Brak dostępu administratora." }, { status: 401 });
  const { id } = await params; const appointment = await prisma.appointment.findUnique({ where: { id }, include: { project: { select: { clientId: true } } } });
  if (!appointment) return NextResponse.json({ error: "Wizyta nie istnieje." }, { status: 404 });
  const cancelled = await prisma.$transaction(async (tx) => {
    await lockBookingCalendar(tx);
    if (await tx.loyaltyEntry.findFirst({ where: { appointmentId: id, voidedAt: null } })) return false;
    await tx.appointment.update({ where: { id }, data: { status: "cancelled" } });
    await tx.projectActivity.create({ data: { projectId: appointment.projectId, type: "appointment_cancelled", message: "Wizyta została anulowana przez studio.", visibility: "admin" } });
    const sessions = await tx.appointment.findMany({ where: { projectId: appointment.projectId }, select: { status: true } });
    const project = await tx.tattooProject.findUniqueOrThrow({ where: { id: appointment.projectId }, select: { status: true, depositStatus: true } });
    await tx.tattooProject.update({ where: { id: appointment.projectId }, data: { status: projectStatusAfterAppointmentChange(sessions, project.depositStatus, project.status) } });
    await tx.clientNotification.create({ data: { clientId: appointment.project.clientId, projectId: appointment.projectId, appointmentId: id, type: "APPOINTMENT_CANCELLED", title: "Wizyta anulowana", body: "Studio anulowało wizytę. Skontaktuj się, aby ustalić nowy termin.", href: "/app/portal" } });
    return true;
  });
  if (!cancelled) return NextResponse.json({ error: "Najpierw wycofaj rozliczenie w karcie lojalnościowej klienta." }, { status: 409 });
  await syncAppointmentToGoogle(id).catch(() => undefined);
  if (appointment.status !== "cancelled") await offerReleasedRange(appointment.startsAt, appointment.endsAt).catch(() => undefined);
  return NextResponse.json({ ok: true });
}
