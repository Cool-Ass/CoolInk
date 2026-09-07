import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { formatCoolinkDateTime } from "@/lib/dateTime";
import { sendPushToClient } from "@/lib/webPush";

export async function GET(request: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected || request.headers.get("authorization") !== `Bearer ${expected}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const now = new Date();
  const expiredOffers = await prisma.waitlistEntry.findMany({ where: { status: "offered", offerExpiresAt: { lte: now } }, include: { offeredAppointment: { select: { id: true } }, project: { select: { id: true, clientId: true, title: true } } } });
  let expired = 0;
  for (const entry of expiredOffers) {
    const released = await prisma.$transaction(async (tx) => {
      const claimed = await tx.waitlistEntry.updateMany({ where: { id: entry.id, status: "offered", offerExpiresAt: { lte: now } }, data: { status: "active", offeredAppointmentId: null, offeredAt: null, offerExpiresAt: null } });
      if (!claimed.count) return false;
      if (entry.offeredAppointment) await tx.appointment.updateMany({ where: { id: entry.offeredAppointment.id, status: "proposed" }, data: { status: "cancelled" } });
      await tx.tattooProject.update({ where: { id: entry.project.id }, data: { status: "awaiting_client", nextAction: "Zaproponuj kolejny termin z listy rezerwowej", nextActionDueAt: null } });
      await tx.projectActivity.create({ data: { projectId: entry.project.id, type: "waitlist_offer_expired", message: "Oferta terminu z listy rezerwowej wygasła i wpis ponownie oczekuje.", visibility: "client" } });
      await tx.clientNotification.create({ data: { clientId: entry.project.clientId, projectId: entry.project.id, type: "WAITLIST_OFFER_EXPIRED", title: "Oferta terminu wygasła", body: "Nie szkodzi — Twój projekt nadal jest na liście rezerwowej.", href: "/app/portal/calendar#lista-rezerwowa" } });
      return true;
    });
    if (released) {
      expired += 1;
      await sendPushToClient(entry.project.clientId, { title: "Oferta terminu wygasła", body: "Twój projekt nadal czeka na liście rezerwowej.", url: "/app/portal/calendar#lista-rezerwowa", tag: `waitlist-expired-${entry.id}` }).catch(() => undefined);
    }
  }

  // The job runs once per day. Each 24-hour-wide window remains reliable
  // across Europe/Warsaw daylight-saving changes without server timezone state.
  const reminderPlans = [
    { offsetHours: 72, title: "Przygotuj się do wizyty", pushTitle: "Wizyta w CoolInk za 3 dni", prefix: "Za 3 dni" },
    { offsetHours: 24, title: "Przypomnienie o wizycie", pushTitle: "Nadchodząca wizyta w CoolInk", prefix: "Jutro" },
  ];
  let delivered = 0;
  let checked = 0;
  for (const plan of reminderPlans) {
    const windowStart = new Date(now.getTime() + (plan.offsetHours - 4) * 60 * 60 * 1000);
    const windowEnd = new Date(windowStart.getTime() + 24 * 60 * 60 * 1000);
    const appointments = await prisma.appointment.findMany({ where: { status: "confirmed", startsAt: { gte: windowStart, lt: windowEnd } }, include: { project: { select: { id: true, clientId: true, title: true } } } });
    checked += appointments.length;
    for (const appointment of appointments) {
    const existing = await prisma.reminderDelivery.findUnique({ where: { appointmentId_channel_offsetHours: { appointmentId: appointment.id, channel: "push", offsetHours: plan.offsetHours } } });
    if (existing?.sentAt) continue;
    let isFirstAttempt = false;
    let delivery = existing;
    if (!delivery) {
      try {
        delivery = await prisma.reminderDelivery.create({ data: { appointmentId: appointment.id, channel: "push", offsetHours: plan.offsetHours } });
        isFirstAttempt = true;
      } catch {
        // A concurrent cron invocation already claimed this appointment.
        continue;
      }
    }
    try {
      const body = `${plan.prefix}: ${appointment.project.title} · ${formatCoolinkDateTime(appointment.startsAt)}. Sprawdź przygotowanie do wizyty w swoim koncie.`;
      if (isFirstAttempt) await prisma.clientNotification.create({ data: { clientId: appointment.project.clientId, projectId: appointment.project.id, appointmentId: appointment.id, type: `APPOINTMENT_REMINDER_${plan.offsetHours}H`, title: plan.title, body, href: "/app/portal/projects" } });
      await sendPushToClient(appointment.project.clientId, { title: plan.pushTitle, body, url: "/app/portal/projects", tag: `appointment-${appointment.id}-${plan.offsetHours}` });
      await prisma.reminderDelivery.update({ where: { id: delivery.id }, data: { sentAt: new Date(), error: null } });
      delivered += 1;
    } catch (error) {
      await prisma.reminderDelivery.update({ where: { id: delivery.id }, data: { error: (error instanceof Error ? error.message : "Nieznany błąd").slice(0, 1_000) } });
    }
  }
  }
  return NextResponse.json({ ok: true, checked, delivered, expiredWaitlistOffers: expired });
}
