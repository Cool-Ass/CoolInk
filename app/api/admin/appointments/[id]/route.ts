import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { bookingConflict, validAppointmentRange } from "@/lib/bookingRules";

interface Params { params: Promise<{ id: string }>; }

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params; const body = await request.json().catch(() => null);
  const appointment = await prisma.appointment.findUnique({ where: { id }, include: { project: { select: { clientId: true } } } });
  if (!appointment) return NextResponse.json({ error: "Wizyta nie istnieje." }, { status: 404 });
  const startsAt = body?.startsAt ? new Date(String(body.startsAt)) : appointment.startsAt;
  const endsAt = body?.endsAt ? new Date(String(body.endsAt)) : appointment.endsAt;
  if (!validAppointmentRange(startsAt, endsAt)) return NextResponse.json({ error: "Wybierz termin co 30 minut, o długości od 30 minut do 12 godzin." }, { status: 400 });
  const status = typeof body?.status === "string" ? body.status : appointment.status;
  if (!["requested", "proposed", "confirmed", "completed", "no_show", "cancelled"].includes(status)) return NextResponse.json({ error: "Nieprawidłowy status wizyty." }, { status: 400 });
  const conflict = await bookingConflict(startsAt, endsAt, id, !Boolean(body?.ignoreBuffer));
  if (status !== "cancelled" && (conflict.appointment || conflict.block)) return NextResponse.json({ error: "Ten termin koliduje z inną wizytą, blokadą lub ustawionym buforem." }, { status: 409 });
  const rawPrice = body?.price; const price = rawPrice === undefined || rawPrice === "" ? appointment.price : Number(rawPrice);
  if (price !== null && (!Number.isInteger(price) || price < 0)) return NextResponse.json({ error: "Cena musi być liczbą całkowitą większą lub równą zero." }, { status: 400 });
  const changed = startsAt.getTime() !== appointment.startsAt.getTime() || endsAt.getTime() !== appointment.endsAt.getTime() || status !== appointment.status;
  const updated = await prisma.$transaction(async (tx) => { const item = await tx.appointment.update({ where: { id }, data: { startsAt, endsAt, status, price, notes: typeof body?.notes === "string" ? body.notes.trim() || null : appointment.notes } }); if (changed) { const message = status !== appointment.status ? `Zmieniono status wizyty na: ${status}.` : `Zmieniono termin wizyty na ${startsAt.toLocaleString("pl-PL", { dateStyle: "medium", timeStyle: "short" })}.`; await tx.projectActivity.create({ data: { projectId: appointment.projectId, type: "appointment_updated", message, visibility: "admin" } }); if (["confirmed", "cancelled", "completed", "no_show"].includes(status)) await tx.clientNotification.create({ data: { clientId: appointment.project.clientId, projectId: appointment.projectId, appointmentId: id, type: "APPOINTMENT_UPDATED", title: "Aktualizacja wizyty", body: message, href: "/app/portal" } }); } return item; });
  return NextResponse.json({ appointment: updated });
}

export async function DELETE(_: Request, { params }: Params) {
  const { id } = await params; const appointment = await prisma.appointment.findUnique({ where: { id }, include: { project: { select: { clientId: true } } } });
  if (!appointment) return NextResponse.json({ error: "Wizyta nie istnieje." }, { status: 404 });
  await prisma.$transaction([prisma.appointment.update({ where: { id }, data: { status: "cancelled" } }), prisma.projectActivity.create({ data: { projectId: appointment.projectId, type: "appointment_cancelled", message: "Wizyta została anulowana przez studio.", visibility: "admin" } }), prisma.clientNotification.create({ data: { clientId: appointment.project.clientId, projectId: appointment.projectId, appointmentId: id, type: "APPOINTMENT_CANCELLED", title: "Wizyta anulowana", body: "Studio anulowało wizytę. Skontaktuj się, aby ustalić nowy termin.", href: "/app/portal" } })]);
  return NextResponse.json({ ok: true });
}
