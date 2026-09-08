import { NextResponse } from "next/server";
import { getCurrentClient } from "@/lib/clientAuth";
import { prisma } from "@/lib/prisma";
import { activityMessage } from "@/lib/projectWorkflow";
import { recordWorkflowEvent } from "@/lib/workflowEvents";
import { isSameOrigin } from "@/lib/requestSecurity";
import { bookingConflict, lockBookingCalendar } from "@/lib/bookingRules";
import { sendPushToAdmins } from "@/lib/webPush";
import { syncAppointmentToGoogle } from "@/lib/googleCalendarSyncEngine";

interface Params { params: Promise<{ id: string }> }

export async function POST(request: Request, { params }: Params) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const client = await getCurrentClient();
  if (!client) return NextResponse.json({ error: "Zaloguj się ponownie." }, { status: 401 });
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const response = String(body?.response ?? "");
  if (response !== "accept" && response !== "reject") return NextResponse.json({ error: "Nieprawidłowa odpowiedź." }, { status: 400 });
  const appointment = await prisma.appointment.findFirst({ where: { id, project: { clientId: client.id } }, include: { project: true, waitlistOffer: true } });
  if (!appointment) return NextResponse.json({ error: "Nie znaleziono wizyty." }, { status: 404 });
  // A request chosen by the client is deliberately not actionable by that
  // same client. Only a different term explicitly proposed by the studio can
  // be accepted or rejected here.
  if (appointment.status !== "proposed") return NextResponse.json({ error: "Studio nie zaproponowało jeszcze nowego terminu." }, { status: 409 });
  if (appointment.waitlistOffer?.offerExpiresAt && appointment.waitlistOffer.offerExpiresAt <= new Date()) return NextResponse.json({ error: "Ta oferta z listy rezerwowej już wygasła. Termin wróci do puli." }, { status: 409 });

  const accepted = response === "accept";
  const nextProjectStatus = accepted ? (appointment.project.depositStatus === "awaiting" ? "awaiting_deposit" : "confirmed") : "awaiting_client";
  const nextAppointment = await prisma.$transaction(async (tx) => {
    await lockBookingCalendar(tx);
    const current = await tx.appointment.findUnique({ where: { id }, select: { status: true, startsAt: true, endsAt: true } });
    if (!current || current.status !== "proposed") throw new Error("STALE_PROPOSAL");
    if (accepted) {
      const conflict = await bookingConflict(current.startsAt, current.endsAt, id, true, tx);
      if (conflict.appointment || conflict.block) throw new Error("BOOKING_CONFLICT");
    }
    const updated = await tx.appointment.update({ where: { id }, data: { status: accepted ? "confirmed" : "cancelled" } });
    await tx.tattooProject.update({ where: { id: appointment.projectId }, data: { status: nextProjectStatus, ...(appointment.waitlistOffer ? { nextAction: accepted ? "Przygotuj potwierdzoną wizytę" : "Zaproponuj kolejny termin z listy rezerwowej", nextActionDueAt: null } : {}) } });
    if (appointment.waitlistOffer) await tx.waitlistEntry.update({ where: { id: appointment.waitlistOffer.id }, data: accepted ? { status: "booked" } : { status: "active", offeredAppointmentId: null, offeredAt: null, offerExpiresAt: null } });
    await tx.projectActivity.create({ data: { projectId: appointment.projectId, type: accepted ? "appointment_confirmed" : "appointment_cancelled", message: activityMessage(accepted ? "appointment_confirmed" : "appointment_cancelled"), visibility: "admin" } });
    return updated;
  }).catch((error: unknown) => {
    if (error instanceof Error && ["STALE_PROPOSAL", "BOOKING_CONFLICT"].includes(error.message)) return null;
    throw error;
  });
  if (!nextAppointment) return NextResponse.json({ error: "Ta propozycja nie jest już aktualna. Odśwież stronę i skontaktuj się ze studiem." }, { status: 409 });
  await recordWorkflowEvent({ projectId: appointment.projectId, type: accepted ? "APPOINTMENT_ACCEPTED" : "APPOINTMENT_REJECTED", notification: accepted ? { title: "Termin potwierdzony", body: "Twoja odpowiedź została zapisana. Szczegóły wizyty są widoczne na koncie.", appointmentId: id } : undefined });
  await sendPushToAdmins({ title: accepted ? "Klient zaakceptował termin" : "Klient odrzucił termin", body: `${client.firstName} ${client.lastName} odpowiedział na propozycję wizyty.`, url: `/admin/clients/${client.id}`, tag: `client-response-${id}` }).catch(() => undefined);
  await syncAppointmentToGoogle(id).catch(() => undefined);
  return NextResponse.json({ appointment: nextAppointment });
}
