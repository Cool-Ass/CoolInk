import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin } from "@/lib/auth";
import { isSameOrigin } from "@/lib/requestSecurity";
import { verifyExplicitAppointmentAvailability } from "@/lib/appointmentAvailability";
import { activityMessage } from "@/lib/projectWorkflow";
import { recordWorkflowEvent } from "@/lib/workflowEvents";
import { formatCoolinkDateTime } from "@/lib/dateTime";
import { lockBookingCalendar } from "@/lib/bookingRules";

interface Params { params: Promise<{ id: string }>; }

export async function POST(request: Request, { params }: Params) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!(await getCurrentAdmin())) return NextResponse.json({ error: "Brak dostępu administratora." }, { status: 401 });
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const startsAt = new Date(String(body?.startsAt ?? "")); const endsAt = new Date(String(body?.endsAt ?? ""));
  const project = await prisma.tattooProject.findUnique({ where: { id } });
  if (!project) return NextResponse.json({ error: "Projekt nie istnieje." }, { status: 404 });
  const extra = String(body?.note ?? "").trim();
  const appointment = await prisma.$transaction(async (tx) => {
    await lockBookingCalendar(tx);
    const availability = await verifyExplicitAppointmentAvailability(startsAt, endsAt, undefined, tx);
    if (!availability.ok) throw new Error(`BOOKING_CONFLICT:${availability.error}`);
    const created = await tx.appointment.create({ data: { projectId: id, startsAt, endsAt, status: "proposed", notes: `[PROPOZYCJA STUDIA]${extra ? ` ${extra.slice(0, 1000)}` : ""}` } });
    await tx.tattooProject.update({ where: { id }, data: { status: "date_proposed" } });
    await tx.projectActivity.create({ data: { projectId: id, type: "appointment_proposed", message: activityMessage("appointment_proposed", formatCoolinkDateTime(startsAt)), visibility: "client" } });
    return created;
  }).catch((error: unknown) => {
    if (error instanceof Error && error.message.startsWith("BOOKING_CONFLICT:")) return null;
    throw error;
  });
  if (!appointment) return NextResponse.json({ error: "Ten termin został właśnie zajęty. Wybierz inny wolny zakres." }, { status: 409 });
  await recordWorkflowEvent({ projectId: id, type: "APPOINTMENT_PROPOSED", notification: { title: "Nowa propozycja terminu", body: "Sprawdź proponowaną wizytę i potwierdź, czy termin Ci pasuje.", appointmentId: appointment.id } });
  return NextResponse.json({ appointment }, { status: 201 });
}
