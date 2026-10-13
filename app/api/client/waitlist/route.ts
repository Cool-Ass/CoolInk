import { NextResponse } from "next/server";
import { getCurrentClient } from "@/lib/clientAuth";
import { prisma } from "@/lib/prisma";
import { isSameOrigin, rateLimit, setRateLimitHeaders, tooManyRequests } from "@/lib/requestSecurity";
import { normalizeWaitlistDuration, normalizeWaitlistTime, normalizeWaitlistWeekdays, parseWaitlistDate } from "@/lib/waitlist";
import { sendPushToAdmins } from "@/lib/webPush";
import { syncAppointmentToGoogle } from "@/lib/googleCalendarSyncEngine";
import { lockBookingCalendar } from "@/lib/bookingRules";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const client = await getCurrentClient();
  if (!client) return NextResponse.json({ error: "Zaloguj się ponownie." }, { status: 401 });
  const limit = await rateLimit(request, "client-waitlist", 8, 15 * 60_000, client.id);
  if (!limit.allowed) return tooManyRequests(limit);

  const body = await request.json().catch(() => null);
  const projectId = String(body?.projectId ?? "");
  const durationMinutes = normalizeWaitlistDuration(body?.durationMinutes);
  if (!durationMinutes) return NextResponse.json({ error: "Wybierz prawidłowy czas wizyty." }, { status: 400 });

  const earliestDate = body?.earliestDate ? parseWaitlistDate(body.earliestDate) : null;
  const latestDate = body?.latestDate ? parseWaitlistDate(body.latestDate) : null;
  if (body?.earliestDate && !earliestDate || body?.latestDate && !latestDate) return NextResponse.json({ error: "Nieprawidłowy zakres dat." }, { status: 400 });
  if (earliestDate && latestDate && earliestDate > latestDate) return NextResponse.json({ error: "Data końcowa nie może być wcześniejsza od początkowej." }, { status: 400 });
  const preferredWeekdays = normalizeWaitlistWeekdays(body?.preferredWeekdays).join(",");
  const timePreference = normalizeWaitlistTime(body?.timePreference);
  const notes = String(body?.notes ?? "").trim().slice(0, 1_000) || null;

  const result = await prisma.$transaction(async (tx) => {
    await lockBookingCalendar(tx);
    const project = await tx.tattooProject.findFirst({ where: { id: projectId, clientId: client.id, kind: "tattoo", clientArchivedAt: null, status: { notIn: ["cancelled", "completed"] } }, select: { id: true, title: true } });
    if (!project) return null;
    const existing = await tx.waitlistEntry.findUnique({ where: { projectId }, select: { status: true } });
    if (existing?.status === "offered") return "offered" as const;
    const saved = await tx.waitlistEntry.upsert({
      where: { projectId },
      create: { clientId: client.id, projectId, durationMinutes, preferredWeekdays, timePreference, earliestDate, latestDate, notes },
      update: { status: "active", durationMinutes, preferredWeekdays, timePreference, earliestDate, latestDate, notes, offeredAppointmentId: null, offeredAt: null, offerExpiresAt: null },
    });
    await tx.projectActivity.create({ data: { projectId, type: "waitlist_joined", message: "Klient zapisał projekt na listę rezerwową.", visibility: "admin" } });
    await tx.clientNotification.create({ data: { clientId: client.id, projectId, type: "WAITLIST_JOINED", title: "Lista rezerwowa jest aktywna", body: `Dam znać, gdy pojawi się termin pasujący do projektu „${project.title}”.`, href: "/app/portal/calendar#lista-rezerwowa" } });
    return { entry: saved, project, existing };
  });
  if (!result) return NextResponse.json({ error: "Wybierz aktywny projekt tatuażu." }, { status: 404 });
  if (result === "offered") return NextResponse.json({ error: "Najpierw odpowiedz na aktualną propozycję terminu." }, { status: 409 });
  const { entry, project, existing } = result;
  await sendPushToAdmins({ title: "Nowy wpis na liście rezerwowej", body: `${client.firstName} ${client.lastName} · ${project.title}`, url: "/admin/waitlist", tag: `waitlist-${entry.id}` }).catch(() => undefined);
  return setRateLimitHeaders(NextResponse.json({ entry }, { status: existing ? 200 : 201 }), limit);
}

export async function DELETE(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const client = await getCurrentClient();
  if (!client) return NextResponse.json({ error: "Zaloguj się ponownie." }, { status: 401 });
  const body = await request.json().catch(() => null);
  const id = String(body?.id ?? "");
  const result = await prisma.$transaction(async (tx) => {
    await lockBookingCalendar(tx);
    const entry = await tx.waitlistEntry.findFirst({ where: { id, clientId: client.id }, include: { offeredAppointment: { select: { id: true, status: true } } } });
    if (!entry) return null;
    const cancelled = entry.offeredAppointment?.status === "proposed"
      ? await tx.appointment.updateMany({ where: { id: entry.offeredAppointment.id, status: "proposed" }, data: { status: "cancelled" } }) : null;
    await tx.waitlistEntry.update({ where: { id }, data: { status: "closed", offeredAppointmentId: null, offeredAt: null, offerExpiresAt: null } });
    await tx.projectActivity.create({ data: { projectId: entry.projectId, type: "waitlist_left", message: "Klient zrezygnował z listy rezerwowej.", visibility: "admin" } });
    return { entry, cancelled: Boolean(cancelled?.count) };
  });
  if (!result) return NextResponse.json({ error: "Nie znaleziono wpisu." }, { status: 404 });
  const { entry, cancelled } = result;
  await sendPushToAdmins({ title: "Zmiana na liście rezerwowej", body: `${client.firstName} ${client.lastName} zrezygnował z oczekiwania na termin.`, url: "/admin/waitlist", tag: `waitlist-close-${entry.id}` }).catch(() => undefined);
  if (cancelled && entry.offeredAppointment) await syncAppointmentToGoogle(entry.offeredAppointment.id).catch(() => undefined);
  return NextResponse.json({ ok: true });
}
