import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const projectId = String(body?.projectId ?? ""); const startsAt = new Date(String(body?.startsAt ?? "")); const endsAt = new Date(String(body?.endsAt ?? ""));
  if (!projectId || Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) || endsAt <= startsAt) return NextResponse.json({ error: "Wybierz projekt oraz poprawny zakres wizyty." }, { status: 400 });
  const project = await prisma.tattooProject.findUnique({ where: { id: projectId } });
  if (!project) return NextResponse.json({ error: "Nie znaleziono projektu." }, { status: 404 });
  const [collision, blocked] = await Promise.all([prisma.appointment.findFirst({ where: { status: { notIn: ["cancelled", "no_show"] }, startsAt: { lt: endsAt }, endsAt: { gt: startsAt } } }), prisma.availabilityBlock.findFirst({ where: { startsAt: { lt: endsAt }, endsAt: { gt: startsAt } } })]);
  if (collision || blocked) return NextResponse.json({ error: "Ten termin jest niedostępny. Wybierz inny zakres." }, { status: 409 });
  const appointment = await prisma.appointment.create({ data: { projectId, startsAt, endsAt, status: "confirmed", notes: String(body?.notes ?? "").trim() || null } });
  await prisma.tattooProject.update({ where: { id: projectId }, data: { status: "scheduled" } });
  return NextResponse.json({ appointment }, { status: 201 });
}
