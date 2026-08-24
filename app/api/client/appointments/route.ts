import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentClient } from "@/lib/clientAuth";

export async function POST(request: Request) {
  const client = await getCurrentClient();
  if (!client) return NextResponse.json({ error: "Zaloguj się, aby zaproponować termin." }, { status: 401 });
  const body = await request.json().catch(() => null);
  const projectId = String(body?.projectId ?? "");
  const startsAt = new Date(String(body?.startsAt ?? ""));
  const endsAt = new Date(String(body?.endsAt ?? ""));
  if (!projectId || Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) || endsAt <= startsAt || startsAt.getMinutes() % 30 !== 0 || endsAt.getTime() - startsAt.getTime() !== 30 * 60 * 1000) return NextResponse.json({ error: "Wybierz 30-minutowy termin rozpoczynający się o pełnej lub wpół do." }, { status: 400 });
  const project = await prisma.tattooProject.findFirst({ where: { id: projectId, clientId: client.id } });
  if (!project) return NextResponse.json({ error: "Nie znaleziono Twojego projektu." }, { status: 404 });
  const [collision, blocked, workingHours] = await Promise.all([
    prisma.appointment.findFirst({ where: { status: { notIn: ["cancelled", "no_show"] }, startsAt: { lt: endsAt }, endsAt: { gt: startsAt } } }),
    prisma.availabilityBlock.findFirst({ where: { startsAt: { lt: endsAt }, endsAt: { gt: startsAt } } }),
    prisma.workingHours.findUnique({ where: { weekday: startsAt.getDay() } }),
  ]);
  if (workingHours && (!workingHours.enabled || startsAt.toTimeString().slice(0, 5) < workingHours.startsAt || endsAt.toTimeString().slice(0, 5) > workingHours.endsAt)) return NextResponse.json({ error: "Ten termin jest poza godzinami przyjęć." }, { status: 409 });
  if (collision || blocked) return NextResponse.json({ error: "Ten termin nie jest już dostępny. Wybierz inny." }, { status: 409 });
  const appointment = await prisma.appointment.create({ data: { projectId, startsAt, endsAt, status: "requested" } });
  return NextResponse.json({ appointment }, { status: 201 });
}
