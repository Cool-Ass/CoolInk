import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { bookingConflict, validAppointmentRange } from "@/lib/bookingRules";
import { activityMessage } from "@/lib/projectWorkflow";
import { recordWorkflowEvent } from "@/lib/workflowEvents";

interface Params { params: Promise<{ id: string }>; }

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const startsAt = new Date(String(body?.startsAt ?? "")); const endsAt = new Date(String(body?.endsAt ?? ""));
  if (!validAppointmentRange(startsAt, endsAt)) return NextResponse.json({ error: "Wybierz termin co 30 minut, o długości od 30 minut do 12 godzin." }, { status: 400 });
  const project = await prisma.tattooProject.findUnique({ where: { id } });
  if (!project) return NextResponse.json({ error: "Projekt nie istnieje." }, { status: 404 });
  const conflict = await bookingConflict(startsAt, endsAt);
  if (conflict.appointment || conflict.block) return NextResponse.json({ error: "Ten termin nie jest już dostępny." }, { status: 409 });
  const extra = String(body?.note ?? "").trim();
  const appointment = await prisma.appointment.create({ data: { projectId: id, startsAt, endsAt, status: "proposed", notes: `[PROPOZYCJA STUDIA]${extra ? ` ${extra}` : ""}` } });
  await prisma.$transaction([
    prisma.tattooProject.update({ where: { id }, data: { status: "awaiting_confirmation" } }),
    prisma.projectActivity.create({ data: { projectId: id, type: "appointment_proposed", message: activityMessage("appointment_proposed", startsAt.toLocaleString("pl-PL", { dateStyle: "medium", timeStyle: "short" })), visibility: "client" } }),
  ]);
  await recordWorkflowEvent({ projectId: id, type: "APPOINTMENT_PROPOSED", notification: { title: "Nowa propozycja terminu", body: "Sprawdź proponowaną wizytę i potwierdź, czy termin Ci pasuje.", appointmentId: appointment.id } });
  return NextResponse.json({ appointment }, { status: 201 });
}
