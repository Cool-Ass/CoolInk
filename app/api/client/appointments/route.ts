import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentClient } from "@/lib/clientAuth";
import { isSameOrigin, rateLimit, tooManyRequests } from "@/lib/requestSecurity";
import { lockBookingCalendar, validAppointmentRange } from "@/lib/bookingRules";
import { verifyExplicitAppointmentAvailability } from "@/lib/appointmentAvailability";
import { activityMessage } from "@/lib/projectWorkflow";
import { formatCoolinkDateTime } from "@/lib/dateTime";
import { sendPushToAdmins } from "@/lib/webPush";
import { isConsultationSlot } from "@/lib/calendarHub";
import { normalizeLeadSource } from "@/lib/leadSource";
import { syncAppointmentToGoogle } from "@/lib/googleCalendarSyncEngine";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const limit = await rateLimit(request, "appointment-request", 20, 60 * 60 * 1000);
  if (!limit.allowed) return tooManyRequests(limit);
  const client = await getCurrentClient();
  if (!client) return NextResponse.json({ error: "Zaloguj się, aby zaproponować termin." }, { status: 401 });
  const body = await request.json().catch(() => null);
  const requestedProjectId = String(body?.projectId ?? "");
  const startsAt = new Date(String(body?.startsAt ?? ""));
  const endsAt = new Date(String(body?.endsAt ?? ""));
  if (!validAppointmentRange(startsAt, endsAt)) return NextResponse.json({ error: "Wybierz termin rozpoczynający się o pełnej lub wpół do, o długości od 30 minut do 12 godzin." }, { status: 400 });
  const matchedSlot = await prisma.availableSlot.findFirst({ where: { isPublic: true, startsAt: { lte: startsAt }, endsAt: { gte: endsAt } }, select: { title: true } });
  const serviceType = isConsultationSlot(matchedSlot ?? {}) ? "consultation" : "tattoo";
  const projectId = serviceType === "tattoo" ? requestedProjectId : "";
  const description = String(body?.description ?? "").trim().slice(0, 5000);
  if (!projectId && description.length < (serviceType === "consultation" ? 5 : 12)) return NextResponse.json({ error: serviceType === "consultation" ? "Napisz krótko, co chcesz omówić." : "Opisz swój pomysł w co najmniej 12 znakach." }, { status: 400 });
  // Working hours are a studio-side planning aid, not public availability.
  // A client may request only an exact range explicitly published as free.
  const availability = await verifyExplicitAppointmentAvailability(startsAt, endsAt);
  if (!availability.ok) return NextResponse.json({ error: availability.error }, { status: availability.status });
  const ownedProject = projectId ? await prisma.tattooProject.findFirst({ where: { id: projectId, clientId: client.id }, select: { id: true } }) : null;
  if (projectId && !ownedProject) return NextResponse.json({ error: "Nie znaleziono Twojej wizyty." }, { status: 404 });
  const projectTitle = String(body?.title ?? "").trim().slice(0, 160) || (serviceType === "consultation" ? "Konsultacja tatuażu" : "Nowa wizyta tatuażu");
  const styles = Array.isArray(body?.styles) ? body.styles.filter((item: unknown): item is string => typeof item === "string").slice(0, 8).join(", ") : "";
  const placement = String(body?.placement ?? "").trim().slice(0, 120) || null;
  const size = String(body?.size ?? "").trim().slice(0, 120) || null;
  const notes = String(body?.notes ?? "").trim().slice(0, 1000);
  const consultationMode = ["studio", "phone", "video"].includes(String(body?.consultationMode)) ? String(body.consultationMode) : "studio";
  const result = await prisma.$transaction(async (tx) => {
    await lockBookingCalendar(tx);
    const lockedAvailability = await verifyExplicitAppointmentAvailability(startsAt, endsAt, undefined, tx);
    if (!lockedAvailability.ok) throw new Error(`BOOKING_CONFLICT:${lockedAvailability.error}`);
    const lockedSlot = await tx.availableSlot.findFirst({ where: { isPublic: true, startsAt: { lte: startsAt }, endsAt: { gte: endsAt } }, select: { title: true } });
    const lockedType = isConsultationSlot(lockedSlot ?? {}) ? "consultation" : "tattoo";
    const project = ownedProject ? await tx.tattooProject.update({ where: { id: ownedProject.id }, data: { status: "awaiting_confirmation", nextAction: "Potwierdź klientowi wybrany termin" } }) : await tx.tattooProject.create({ data: { clientId: client.id, title: projectTitle, description, kind: lockedType, consultationMode: lockedType === "consultation" ? consultationMode : null, styles: lockedType === "tattoo" ? styles : "", placement: lockedType === "tattoo" ? placement : null, size: lockedType === "tattoo" ? size : null, leadSource: normalizeLeadSource(body?.leadSource), preferredDateNote: formatCoolinkDateTime(startsAt), status: "awaiting_confirmation", nextAction: lockedType === "consultation" ? "Potwierdź termin konsultacji" : "Przejrzyj zgłoszenie i potwierdź termin", activities: { create: { type: lockedType === "consultation" ? "consultation_created" : "project_created", message: lockedType === "consultation" ? "Klient poprosił o konsultację." : activityMessage("project_created"), visibility: "admin" } } } });
    const appointment = await tx.appointment.create({ data: { projectId: project.id, startsAt, endsAt, status: "requested", notes: notes || null } });
    await tx.projectActivity.create({ data: { projectId: project.id, type: "appointment_requested", message: activityMessage("appointment_requested", formatCoolinkDateTime(startsAt)), visibility: "admin" } });
    await tx.clientNotification.create({ data: { clientId: client.id, type: lockedType === "consultation" ? "consultation_requested" : "appointment_requested", title: lockedType === "consultation" ? "Prośba o konsultację wysłana" : "Prośba o wizytę wysłana", body: lockedType === "consultation" ? "Studio potwierdzi termin konsultacji i wróci z odpowiedzią." : "Studio sprawdzi szczegóły oraz wybrany termin i wróci z odpowiedzią.", href: "/app/portal/projects", projectId: project.id, appointmentId: appointment.id } });
    return { appointment, projectId: project.id, serviceType: lockedType };
  }).catch((error: unknown) => {
    if (error instanceof Error && error.message.startsWith("BOOKING_CONFLICT:")) return null;
    throw error;
  });
  if (!result) return NextResponse.json({ error: "Ten termin został właśnie zajęty. Wybierz inny wolny zakres." }, { status: 409 });
  await sendPushToAdmins({ title: result.serviceType === "consultation" ? "Nowa konsultacja" : "Nowa prośba o wizytę", body: `${client.firstName} ${client.lastName}: ${formatCoolinkDateTime(startsAt)}`, url: `/admin/clients/${client.id}`, tag: `client-appointment-${result.appointment.id}` }).catch(() => undefined);
  await syncAppointmentToGoogle(result.appointment.id).catch(() => undefined);
  return NextResponse.json(result, { status: 201 });
}
