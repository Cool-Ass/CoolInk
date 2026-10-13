import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/adminApi";
import { writeAdminAudit } from "@/lib/adminAudit";
import { verifyExplicitAppointmentAvailability } from "@/lib/appointmentAvailability";
import { lockBookingCalendar } from "@/lib/bookingRules";
import { formatCoolinkDateTime } from "@/lib/dateTime";
import { prisma } from "@/lib/prisma";
import { isSameOrigin, rateLimit, tooManyRequests } from "@/lib/requestSecurity";
import { waitlistDateMatches } from "@/lib/waitlist";
import { sendPushToClient } from "@/lib/webPush";
import { syncAppointmentToGoogle } from "@/lib/googleCalendarSyncEngine";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const auth = await requireAdminApi("operations.manage");
  if (!auth.ok) return auth.response;
  const limit = await rateLimit(request, "admin-waitlist-offer", 20, 60_000, auth.admin.id);
  if (!limit.allowed) return tooManyRequests(limit);
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const startsAt = new Date(String(body?.startsAt ?? ""));
  const durationMinutes = Number(body?.durationMinutes);
  const endsAt = new Date(startsAt.getTime() + durationMinutes * 60_000);
  if (Number.isNaN(startsAt.getTime()) || startsAt <= new Date() || !Number.isInteger(durationMinutes) || durationMinutes < 30 || durationMinutes > 720 || durationMinutes % 30 !== 0) return NextResponse.json({ error: "Wybierz poprawny przyszły termin i czas trwania." }, { status: 400 });
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1_000);
  const note = String(body?.note ?? "").trim().slice(0, 1_000);
  const result = await prisma.$transaction(async (tx) => {
    await lockBookingCalendar(tx);
    const entry = await tx.waitlistEntry.findUnique({ where: { id }, include: { project: true } });
    if (!entry || entry.status !== "active" || entry.project.clientArchivedAt || ["cancelled", "completed"].includes(entry.project.status) || startsAt <= new Date()) return null;
    const availability = await verifyExplicitAppointmentAvailability(startsAt, endsAt, undefined, tx, { serviceType: "tattoo" });
    if (!availability.ok) throw new Error(`BOOKING_CONFLICT:${availability.error}`);
    const created = await tx.appointment.create({ data: { projectId: entry.projectId, startsAt, endsAt, status: "proposed", serviceType: "tattoo", notes: `[LISTA REZERWOWA]${note ? ` ${note}` : ""}` } });
    await tx.waitlistEntry.update({ where: { id }, data: { status: "offered", offeredAppointmentId: created.id, offeredAt: new Date(), offerExpiresAt: expiresAt } });
    await tx.tattooProject.update({ where: { id: entry.projectId }, data: { status: "date_proposed", nextAction: "Klient odpowiada na ofertę z listy rezerwowej", nextActionDueAt: expiresAt } });
    await tx.projectActivity.create({ data: { projectId: entry.projectId, type: "waitlist_offer_sent", message: `Wysłano ofertę terminu z listy rezerwowej: ${formatCoolinkDateTime(startsAt)}.`, visibility: "client" } });
    await tx.clientNotification.create({ data: { clientId: entry.clientId, projectId: entry.projectId, appointmentId: created.id, type: "WAITLIST_OFFER", title: "Zwolnił się pasujący termin", body: `Termin ${formatCoolinkDateTime(startsAt)} czeka na Twoją odpowiedź przez 24 godziny.`, href: "/app/portal/projects" } });
    return { appointment: created, entry };
  // The calendar lock serializes offers; give queued requests time to obtain
  // a connection and then observe the winner, even with a two-connection pool.
  }, { maxWait: 10_000, timeout: 15_000 }).catch((error: unknown) => {
    if (error instanceof Error && error.message.startsWith("BOOKING_CONFLICT:")) return null;
    throw error;
  });
  if (!result) return NextResponse.json({ error: "Wpis lub termin nie jest już dostępny albo zakres nie został oznaczony jako wolny." }, { status: 409 });
  const { appointment, entry } = result;
  await sendPushToClient(entry.clientId, { title: "Zwolnił się termin w CoolInk", body: `${formatCoolinkDateTime(startsAt)} · odpowiedz w ciągu 24 godzin.`, url: "/app/portal/projects", tag: `waitlist-offer-${id}` }).catch(() => undefined);
  await writeAdminAudit({ adminUserId: auth.admin.id, action: "waitlist.offer", targetType: "WaitlistEntry", targetId: id, summary: `Wysłano ofertę terminu ${formatCoolinkDateTime(startsAt)}.`, metadata: { appointmentId: appointment.id } });
  await syncAppointmentToGoogle(appointment.id).catch(() => undefined);
  return NextResponse.json({ appointment, matchesPreferences: waitlistDateMatches(entry, startsAt, endsAt) }, { status: 201 });
}
