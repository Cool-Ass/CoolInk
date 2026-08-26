import { NextResponse } from "next/server";
import { getCurrentClient } from "@/lib/clientAuth";
import { prisma } from "@/lib/prisma";
import { appointmentIcs } from "@/lib/calendarEvent";

interface Params { params: Promise<{ id: string }> }
export async function GET(_: Request, { params }: Params) {
  const client = await getCurrentClient(); if (!client) return NextResponse.json({ error: "Zaloguj się ponownie." }, { status: 401 });
  const { id } = await params;
  const appointment = await prisma.appointment.findFirst({ where: { id, status: "confirmed", project: { clientId: client.id } }, select: { id: true, startsAt: true, endsAt: true } });
  if (!appointment) return NextResponse.json({ error: "Nie znaleziono potwierdzonej wizyty." }, { status: 404 });
  return new NextResponse(appointmentIcs(appointment), { headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": `attachment; filename="coolink-wizyta-${appointment.id}.ics"`, "Cache-Control": "private, no-store" } });
}
