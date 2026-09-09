import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { localDateTimeToIso } from "@/lib/dateTime";
import { syncAppointmentToGoogle } from "@/lib/googleCalendarSyncEngine";

const ACTION = "repair_admin_appointment_timezone";
const FIX_DEPLOYED_AT = new Date("2026-09-09T23:08:00.000Z");

// One-use repair route. It is removed as soon as production confirms success.
// Candidates are limited to appointments whose client-visible confirmation was
// created in the same transaction as the appointment — the signature of the
// old admin form. Client-created requests are therefore left untouched.
export async function GET() {
  const [appointments, previousRepairs] = await Promise.all([
    prisma.appointment.findMany({
      where: { createdAt: { lt: FIX_DEPLOYED_AT } },
      select: {
        id: true,
        projectId: true,
        startsAt: true,
        endsAt: true,
        createdAt: true,
        project: { select: { activities: { where: { type: "appointment_confirmed", visibility: "client" }, select: { createdAt: true } } } },
      },
    }),
    prisma.adminAuditLog.findMany({ where: { action: ACTION, targetType: "Appointment" }, select: { targetId: true } }),
  ]);
  const repaired = new Set(previousRepairs.map((entry) => entry.targetId).filter(Boolean));
  const candidates = appointments.filter((appointment) => !repaired.has(appointment.id) && appointment.project.activities.some((activity) => Math.abs(activity.createdAt.getTime() - appointment.createdAt.getTime()) <= 10_000));

  const changedIds: string[] = [];
  for (const appointment of candidates) {
    const correctedStart = new Date(localDateTimeToIso(appointment.startsAt.toISOString().slice(0, 16)));
    const correctedEnd = new Date(localDateTimeToIso(appointment.endsAt.toISOString().slice(0, 16)));
    if (Number.isNaN(correctedStart.getTime()) || Number.isNaN(correctedEnd.getTime()) || correctedStart >= correctedEnd) continue;
    await prisma.$transaction([
      prisma.appointment.update({ where: { id: appointment.id }, data: { startsAt: correctedStart, endsAt: correctedEnd } }),
      prisma.adminAuditLog.create({ data: { action: ACTION, targetType: "Appointment", targetId: appointment.id, summary: "Skorygowano historyczny termin zapisany bez strefy Europe/Warsaw.", metadata: JSON.stringify({ oldStartsAt: appointment.startsAt.toISOString(), oldEndsAt: appointment.endsAt.toISOString(), startsAt: correctedStart.toISOString(), endsAt: correctedEnd.toISOString() }) } }),
    ]);
    changedIds.push(appointment.id);
  }

  let syncFailed = 0;
  for (const id of changedIds) await syncAppointmentToGoogle(id).catch(() => { syncFailed += 1; });
  return NextResponse.json({ ok: true, examined: appointments.length, repaired: changedIds.length, syncFailed });
}
