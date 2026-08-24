import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface Params { params: Promise<{ id: string }>; }

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const startsAt = new Date(String(body?.startsAt ?? "")); const endsAt = new Date(String(body?.endsAt ?? ""));
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) || startsAt.getMinutes() % 30 !== 0 || endsAt.getTime() - startsAt.getTime() !== 30 * 60 * 1000) return NextResponse.json({ error: "Wybierz termin co 30 minut, na 30 minut." }, { status: 400 });
  const project = await prisma.tattooProject.findUnique({ where: { id } });
  if (!project) return NextResponse.json({ error: "Projekt nie istnieje." }, { status: 404 });
  const [collision, blocked] = await Promise.all([
    prisma.appointment.findFirst({ where: { status: { notIn: ["cancelled", "no_show"] }, startsAt: { lt: endsAt }, endsAt: { gt: startsAt } } }),
    prisma.availabilityBlock.findFirst({ where: { startsAt: { lt: endsAt }, endsAt: { gt: startsAt } } }),
  ]);
  if (collision || blocked) return NextResponse.json({ error: "Ten termin nie jest już dostępny." }, { status: 409 });
  const extra = String(body?.note ?? "").trim();
  const appointment = await prisma.appointment.create({ data: { projectId: id, startsAt, endsAt, status: "requested", notes: `[PROPOZYCJA STUDIA]${extra ? ` ${extra}` : ""}` } });
  await prisma.tattooProject.update({ where: { id }, data: { status: "scheduled" } });
  return NextResponse.json({ appointment }, { status: 201 });
}
