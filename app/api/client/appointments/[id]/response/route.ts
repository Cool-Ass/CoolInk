import { NextResponse } from "next/server";
import { getCurrentClient } from "@/lib/clientAuth";
import { prisma } from "@/lib/prisma";
import { activityMessage } from "@/lib/projectWorkflow";
import { recordWorkflowEvent } from "@/lib/workflowEvents";
import { isSameOrigin } from "@/lib/requestSecurity";

interface Params { params: Promise<{ id: string }> }

export async function POST(request: Request, { params }: Params) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const client = await getCurrentClient();
  if (!client) return NextResponse.json({ error: "Zaloguj się ponownie." }, { status: 401 });
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const response = String(body?.response ?? "");
  if (response !== "accept" && response !== "reject") return NextResponse.json({ error: "Nieprawidłowa odpowiedź." }, { status: 400 });
  const appointment = await prisma.appointment.findFirst({ where: { id, project: { clientId: client.id } }, include: { project: true } });
  if (!appointment) return NextResponse.json({ error: "Nie znaleziono wizyty." }, { status: 404 });
  // A request chosen by the client is deliberately not actionable by that
  // same client. Only a different term explicitly proposed by the studio can
  // be accepted or rejected here.
  if (appointment.status !== "proposed") return NextResponse.json({ error: "Studio nie zaproponowało jeszcze nowego terminu." }, { status: 409 });

  const accepted = response === "accept";
  const nextProjectStatus = accepted ? (appointment.project.depositStatus === "awaiting" ? "awaiting_deposit" : "confirmed") : "awaiting_client";
  const nextAppointment = await prisma.$transaction(async (tx) => {
    const updated = await tx.appointment.update({ where: { id }, data: { status: accepted ? "confirmed" : "cancelled" } });
    await tx.tattooProject.update({ where: { id: appointment.projectId }, data: { status: nextProjectStatus } });
    await tx.projectActivity.create({ data: { projectId: appointment.projectId, type: accepted ? "appointment_confirmed" : "appointment_cancelled", message: activityMessage(accepted ? "appointment_confirmed" : "appointment_cancelled"), visibility: "admin" } });
    return updated;
  });
  await recordWorkflowEvent({ projectId: appointment.projectId, type: accepted ? "APPOINTMENT_ACCEPTED" : "APPOINTMENT_REJECTED", notification: accepted ? { title: "Termin potwierdzony", body: "Twoja odpowiedź została zapisana. Szczegóły wizyty są widoczne na koncie.", appointmentId: id } : undefined });
  return NextResponse.json({ appointment: nextAppointment });
}
