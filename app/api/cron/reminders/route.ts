import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { formatCoolinkDateTime } from "@/lib/dateTime";
import { sendPushToClient } from "@/lib/webPush";

export async function GET(request: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected || request.headers.get("authorization") !== `Bearer ${expected}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const now = new Date();
  // The job runs once per day. A 20–44 h window remains correct across
  // Europe/Warsaw daylight-saving changes without depending on server TZ.
  const windowStart = new Date(now.getTime() + 20 * 60 * 60 * 1000);
  const windowEnd = new Date(now.getTime() + 44 * 60 * 60 * 1000);
  const appointments = await prisma.appointment.findMany({ where: { status: "confirmed", startsAt: { gte: windowStart, lt: windowEnd } }, include: { project: { select: { id: true, clientId: true, title: true } } } });
  let delivered = 0;
  for (const appointment of appointments) {
    const existing = await prisma.reminderDelivery.findUnique({ where: { appointmentId_channel_offsetHours: { appointmentId: appointment.id, channel: "push", offsetHours: 24 } } });
    if (existing?.sentAt) continue;
    let isFirstAttempt = false;
    let delivery = existing;
    if (!delivery) {
      try {
        delivery = await prisma.reminderDelivery.create({ data: { appointmentId: appointment.id, channel: "push", offsetHours: 24 } });
        isFirstAttempt = true;
      } catch {
        // A concurrent cron invocation already claimed this appointment.
        continue;
      }
    }
    try {
      const body = `${appointment.project.title} · ${formatCoolinkDateTime(appointment.startsAt)}. Sprawdź przygotowanie do wizyty w swoim koncie.`;
      if (isFirstAttempt) await prisma.clientNotification.create({ data: { clientId: appointment.project.clientId, projectId: appointment.project.id, appointmentId: appointment.id, type: "APPOINTMENT_REMINDER", title: "Przypomnienie o wizycie", body, href: "/app/portal/visits" } });
      await sendPushToClient(appointment.project.clientId, { title: "Nadchodząca wizyta w CoolInk", body, url: "/app/portal/visits", tag: `appointment-${appointment.id}` });
      await prisma.reminderDelivery.update({ where: { id: delivery.id }, data: { sentAt: new Date(), error: null } });
      delivered += 1;
    } catch (error) {
      await prisma.reminderDelivery.update({ where: { id: delivery.id }, data: { error: (error instanceof Error ? error.message : "Nieznany błąd").slice(0, 1_000) } });
    }
  }
  return NextResponse.json({ ok: true, checked: appointments.length, delivered });
}
