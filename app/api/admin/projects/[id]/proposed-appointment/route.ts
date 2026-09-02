import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin } from "@/lib/auth";
import { isSameOrigin } from "@/lib/requestSecurity";
import { verifyExplicitAppointmentAvailability } from "@/lib/appointmentAvailability";
import { activityMessage } from "@/lib/projectWorkflow";
import { recordWorkflowEvent } from "@/lib/workflowEvents";

interface Params { params: Promise<{ id: string }>; }

export async function POST(request: Request, { params }: Params) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!(await getCurrentAdmin())) return NextResponse.json({ error: "Brak dostępu administratora." }, { status: 401 });
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const startsAt = new Date(String(body?.startsAt ?? "")); const endsAt = new Date(String(body?.endsAt ?? ""));
  const project = await prisma.tattooProject.findUnique({ where: { id } });
  if (!project) return NextResponse.json({ error: "Projekt nie istnieje." }, { status: 404 });
  const availability = await verifyExplicitAppointmentAvailability(startsAt, endsAt);
  if (!availability.ok) return NextResponse.json({ error: availability.error }, { status: availability.status });
  const extra = String(body?.note ?? "").trim();
  const appointment = await prisma.appointment.create({ data: { projectId: id, startsAt, endsAt, status: "proposed", notes: `[PROPOZYCJA STUDIA]${extra ? ` ${extra}` : ""}` } });
  await prisma.$transaction([
    prisma.tattooProject.update({ where: { id }, data: { status: "date_proposed" } }),
    prisma.projectActivity.create({ data: { projectId: id, type: "appointment_proposed", message: activityMessage("appointment_proposed", startsAt.toLocaleString("pl-PL", { dateStyle: "medium", timeStyle: "short" })), visibility: "client" } }),
  ]);
  await recordWorkflowEvent({ projectId: id, type: "APPOINTMENT_PROPOSED", notification: { title: "Nowa propozycja terminu", body: "Sprawdź proponowaną wizytę i potwierdź, czy termin Ci pasuje.", appointmentId: appointment.id } });
  return NextResponse.json({ appointment }, { status: 201 });
}
