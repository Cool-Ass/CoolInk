import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentClient } from "@/lib/clientAuth";
import { isSameOrigin, rateLimit, tooManyRequests } from "@/lib/requestSecurity";
import { validAppointmentRange } from "@/lib/bookingRules";
import { verifyExplicitAppointmentAvailability } from "@/lib/appointmentAvailability";
import { activityMessage } from "@/lib/projectWorkflow";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const limit = rateLimit(request, "appointment-request", 20, 60 * 60 * 1000);
  if (!limit.allowed) return tooManyRequests(limit);
  const client = await getCurrentClient();
  if (!client) return NextResponse.json({ error: "Zaloguj się, aby zaproponować termin." }, { status: 401 });
  const body = await request.json().catch(() => null);
  const projectId = String(body?.projectId ?? "");
  const startsAt = new Date(String(body?.startsAt ?? ""));
  const endsAt = new Date(String(body?.endsAt ?? ""));
  if (!validAppointmentRange(startsAt, endsAt)) return NextResponse.json({ error: "Wybierz termin rozpoczynający się o pełnej lub wpół do, o długości od 30 minut do 12 godzin." }, { status: 400 });
  const description = String(body?.description ?? "").trim().slice(0, 5000);
  if (!projectId && description.length < 12) return NextResponse.json({ error: "Opisz swój pomysł w co najmniej 12 znakach." }, { status: 400 });
  // Working hours are a studio-side planning aid, not public availability.
  // A client may request only an exact range explicitly published as free.
  const availability = await verifyExplicitAppointmentAvailability(startsAt, endsAt);
  if (!availability.ok) return NextResponse.json({ error: availability.error }, { status: availability.status });
  const ownedProject = projectId ? await prisma.tattooProject.findFirst({ where: { id: projectId, clientId: client.id }, select: { id: true } }) : null;
  if (projectId && !ownedProject) return NextResponse.json({ error: "Nie znaleziono Twojej wizyty." }, { status: 404 });
  const projectTitle = String(body?.title ?? "").trim().slice(0, 160) || "Nowa wizyta tatuażu";
  const styles = Array.isArray(body?.styles) ? body.styles.filter((item: unknown): item is string => typeof item === "string").slice(0, 8).join(", ") : "";
  const placement = String(body?.placement ?? "").trim().slice(0, 120) || null;
  const size = String(body?.size ?? "").trim().slice(0, 120) || null;
  const notes = String(body?.notes ?? "").trim().slice(0, 1000);
  const result = await prisma.$transaction(async (tx) => {
    const project = ownedProject ? await tx.tattooProject.update({ where: { id: ownedProject.id }, data: { status: "awaiting_confirmation" } }) : await tx.tattooProject.create({ data: { clientId: client.id, title: projectTitle, description, styles, placement, size, preferredDateNote: startsAt.toLocaleString("pl-PL", { dateStyle: "medium", timeStyle: "short" }), status: "awaiting_confirmation", activities: { create: { type: "project_created", message: activityMessage("project_created"), visibility: "admin" } } } });
    const appointment = await tx.appointment.create({ data: { projectId: project.id, startsAt, endsAt, status: "requested", notes: notes || null } });
    await tx.projectActivity.create({ data: { projectId: project.id, type: "appointment_requested", message: activityMessage("appointment_requested", startsAt.toLocaleString("pl-PL", { dateStyle: "medium", timeStyle: "short" })), visibility: "admin" } });
    await tx.clientNotification.create({ data: { clientId: client.id, type: "appointment_requested", title: "Prośba o wizytę wysłana", body: "Studio sprawdzi szczegóły oraz wybrany termin i wróci z odpowiedzią.", href: "/app/portal/projects", projectId: project.id, appointmentId: appointment.id } });
    return { appointment, projectId: project.id };
  });
  return NextResponse.json(result, { status: 201 });
}
