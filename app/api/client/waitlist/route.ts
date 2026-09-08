import { NextResponse } from "next/server";
import { getCurrentClient } from "@/lib/clientAuth";
import { prisma } from "@/lib/prisma";
import { isSameOrigin, rateLimit, setRateLimitHeaders, tooManyRequests } from "@/lib/requestSecurity";
import { normalizeWaitlistDuration, normalizeWaitlistTime, normalizeWaitlistWeekdays, parseWaitlistDate } from "@/lib/waitlist";
import { sendPushToAdmins } from "@/lib/webPush";
import { syncAppointmentToGoogle } from "@/lib/googleCalendarSyncEngine";

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
  const project = await prisma.tattooProject.findFirst({ where: { id: projectId, clientId: client.id, kind: "tattoo", status: { notIn: ["cancelled", "completed"] } }, select: { id: true, title: true } });
  if (!project) return NextResponse.json({ error: "Wybierz aktywny projekt tatuażu." }, { status: 404 });
  const existing = await prisma.waitlistEntry.findUnique({ where: { projectId }, select: { status: true } });
  if (existing?.status === "offered") return NextResponse.json({ error: "Najpierw odpowiedz na aktualną propozycję terminu." }, { status: 409 });

  const earliestDate = body?.earliestDate ? parseWaitlistDate(body.earliestDate) : null;
  const latestDate = body?.latestDate ? parseWaitlistDate(body.latestDate) : null;
  if (body?.earliestDate && !earliestDate || body?.latestDate && !latestDate) return NextResponse.json({ error: "Nieprawidłowy zakres dat." }, { status: 400 });
  if (earliestDate && latestDate && earliestDate > latestDate) return NextResponse.json({ error: "Data końcowa nie może być wcześniejsza od początkowej." }, { status: 400 });
  const preferredWeekdays = normalizeWaitlistWeekdays(body?.preferredWeekdays).join(",");
  const timePreference = normalizeWaitlistTime(body?.timePreference);
  const notes = String(body?.notes ?? "").trim().slice(0, 1_000) || null;

  const entry = await prisma.$transaction(async (tx) => {
    const saved = await tx.waitlistEntry.upsert({
      where: { projectId },
      create: { clientId: client.id, projectId, durationMinutes, preferredWeekdays, timePreference, earliestDate, latestDate, notes },
      update: { status: "active", durationMinutes, preferredWeekdays, timePreference, earliestDate, latestDate, notes, offeredAppointmentId: null, offeredAt: null, offerExpiresAt: null },
    });
    await tx.projectActivity.create({ data: { projectId, type: "waitlist_joined", message: "Klient zapisał projekt na listę rezerwową.", visibility: "admin" } });
    await tx.clientNotification.create({ data: { clientId: client.id, projectId, type: "WAITLIST_JOINED", title: "Lista rezerwowa jest aktywna", body: `Dam znać, gdy pojawi się termin pasujący do projektu „${project.title}”.`, href: "/app/portal/calendar#lista-rezerwowa" } });
    return saved;
  });
  await sendPushToAdmins({ title: "Nowy wpis na liście rezerwowej", body: `${client.firstName} ${client.lastName} · ${project.title}`, url: "/admin/waitlist", tag: `waitlist-${entry.id}` }).catch(() => undefined);
  return setRateLimitHeaders(NextResponse.json({ entry }, { status: existing ? 200 : 201 }), limit);
}

export async function DELETE(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const client = await getCurrentClient();
  if (!client) return NextResponse.json({ error: "Zaloguj się ponownie." }, { status: 401 });
  const body = await request.json().catch(() => null);
  const id = String(body?.id ?? "");
  const entry = await prisma.waitlistEntry.findFirst({ where: { id, clientId: client.id }, include: { project: { select: { id: true, title: true } }, offeredAppointment: { select: { id: true, status: true } } } });
  if (!entry) return NextResponse.json({ error: "Nie znaleziono wpisu." }, { status: 404 });
  await prisma.$transaction(async (tx) => {
    if (entry.offeredAppointment?.status === "proposed") await tx.appointment.update({ where: { id: entry.offeredAppointment.id }, data: { status: "cancelled" } });
    await tx.waitlistEntry.update({ where: { id }, data: { status: "closed", offeredAppointmentId: null, offeredAt: null, offerExpiresAt: null } });
    await tx.projectActivity.create({ data: { projectId: entry.projectId, type: "waitlist_left", message: "Klient zrezygnował z listy rezerwowej.", visibility: "admin" } });
  });
  await sendPushToAdmins({ title: "Zmiana na liście rezerwowej", body: `${client.firstName} ${client.lastName} zrezygnował z oczekiwania na termin.`, url: "/admin/waitlist", tag: `waitlist-close-${entry.id}` }).catch(() => undefined);
  if (entry.offeredAppointment?.status === "proposed") await syncAppointmentToGoogle(entry.offeredAppointment.id).catch(() => undefined);
  return NextResponse.json({ ok: true });
}
