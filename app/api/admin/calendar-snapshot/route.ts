import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  if (!(await getCurrentAdmin())) return NextResponse.json({ error: "Brak dostępu administratora." }, { status: 401 });
  const from = new Date(); const to = new Date(from); to.setMonth(to.getMonth() + 4);
  const [appointments, blocks, slots, googleEvents] = await Promise.all([
    prisma.appointment.findMany({ where: { status: { notIn: ["cancelled", "no_show"] }, endsAt: { gte: from }, startsAt: { lte: to } }, select: { startsAt: true, endsAt: true } }),
    prisma.availabilityBlock.findMany({ where: { endsAt: { gte: from }, startsAt: { lte: to } }, select: { startsAt: true, endsAt: true } }),
    prisma.availableSlot.findMany({ where: { endsAt: { gte: from }, startsAt: { lte: to } }, select: { startsAt: true, endsAt: true } }),
    prisma.calendarEvent.findMany({ where: { endsAt: { gte: from }, startsAt: { lte: to }, googleCalendarSync: { isNot: null } }, select: { startsAt: true, endsAt: true } }),
  ]);
  const serialise = (items: { startsAt: Date; endsAt: Date }[]) => items.map((item) => ({ startsAt: item.startsAt.toISOString(), endsAt: item.endsAt.toISOString() }));
  return NextResponse.json({ appointments: serialise(appointments), blocks: serialise(blocks), slots: serialise(slots), googleBusy: serialise(googleEvents) });
}
