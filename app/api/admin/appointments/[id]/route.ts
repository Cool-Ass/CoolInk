import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface Params { params: Promise<{ id: string }>; }

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params; const body = await request.json().catch(() => null);
  const startsAt = new Date(String(body?.startsAt ?? "")); const endsAt = new Date(String(body?.endsAt ?? ""));
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) || endsAt <= startsAt || startsAt.getMinutes() % 30 !== 0) return NextResponse.json({ error: "Podaj poprawny termin co 30 minut." }, { status: 400 });
  const appointment = await prisma.appointment.findUnique({ where: { id } });
  if (!appointment) return NextResponse.json({ error: "Wizyta nie istnieje." }, { status: 404 });
  const collision = await prisma.appointment.findFirst({ where: { id: { not: id }, status: { notIn: ["cancelled", "no_show"] }, startsAt: { lt: endsAt }, endsAt: { gt: startsAt } } });
  const blocked = await prisma.availabilityBlock.findFirst({ where: { startsAt: { lt: endsAt }, endsAt: { gt: startsAt } } });
  if (collision || blocked) return NextResponse.json({ error: "Ten termin jest niedostępny." }, { status: 409 });
  return NextResponse.json({ appointment: await prisma.appointment.update({ where: { id }, data: { startsAt, endsAt, notes: typeof body?.notes === "string" ? body.notes.trim() || null : appointment.notes, status: typeof body?.status === "string" ? body.status : appointment.status } }) });
}

export async function DELETE(_: Request, { params }: Params) {
  const { id } = await params; const appointment = await prisma.appointment.findUnique({ where: { id } });
  if (!appointment) return NextResponse.json({ error: "Wizyta nie istnieje." }, { status: 404 });
  await prisma.appointment.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
