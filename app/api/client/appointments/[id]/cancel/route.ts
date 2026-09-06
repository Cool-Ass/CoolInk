import { NextResponse } from "next/server";
import { getCurrentClient } from "@/lib/clientAuth";
import { canClientCancelAppointment } from "@/lib/clientAppointment";
import { lockBookingCalendar } from "@/lib/bookingRules";
import { prisma } from "@/lib/prisma";
import { projectStatusAfterAppointmentChange } from "@/lib/projectLifecycle";
import {
  isSameOrigin,
  rateLimit,
  setRateLimitHeaders,
  tooManyRequests,
} from "@/lib/requestSecurity";

interface Params {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: Params) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const client = await getCurrentClient();
  if (!client) {
    return NextResponse.json({ error: "Zaloguj się ponownie." }, { status: 401 });
  }

  const limit = await rateLimit(
    request,
    "client-appointment-cancel",
    5,
    15 * 60_000,
    client.id
  );
  if (!limit.allowed) return tooManyRequests(limit);

  const { id } = await params;
  const appointment = await prisma.appointment.findFirst({
    where: { id, project: { clientId: client.id } },
    include: { project: { select: { id: true, status: true, depositStatus: true } } },
  });

  if (!appointment) {
    return NextResponse.json({ error: "Nie znaleziono wizyty." }, { status: 404 });
  }
  if (!canClientCancelAppointment(appointment)) {
    return NextResponse.json(
      { error: "Tej wizyty nie można już samodzielnie anulować." },
      { status: 409 }
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    await lockBookingCalendar(tx);
    const current = await tx.appointment.findFirst({
      where: { id, project: { clientId: client.id } },
      select: { status: true, startsAt: true, projectId: true },
    });
    if (!current || !canClientCancelAppointment(current)) return null;

    const updated = await tx.appointment.update({
      where: { id },
      data: { status: "cancelled" },
    });
    await tx.projectActivity.create({
      data: {
        projectId: current.projectId,
        type: "appointment_cancelled",
        message: "Klient samodzielnie anulował wizytę.",
        visibility: "admin",
      },
    });

    const sessions = await tx.appointment.findMany({
      where: { projectId: current.projectId },
      select: { status: true },
    });
    const projectStatus = projectStatusAfterAppointmentChange(
      sessions,
      appointment.project.depositStatus,
      appointment.project.status
    );
    await tx.tattooProject.update({
      where: { id: current.projectId },
      data: { status: projectStatus },
    });
    await tx.clientNotification.create({
      data: {
        clientId: client.id,
        projectId: current.projectId,
        appointmentId: id,
        type: "APPOINTMENT_CANCELLED_BY_CLIENT",
        title: "Wizyta została anulowana",
        body: "Termin został zwolniony, a studio otrzymało informację o anulowaniu.",
        href: "/app/portal#projekty",
      },
    });
    return { updated, projectStatus };
  });

  if (!result) {
    return NextResponse.json(
      { error: "Status wizyty właśnie się zmienił. Odśwież stronę." },
      { status: 409 }
    );
  }

  return setRateLimitHeaders(
    NextResponse.json({
      appointment: result.updated,
      projectStatus: result.projectStatus,
    }),
    limit
  );
}

