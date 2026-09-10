import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizeCalendarBlockRange } from "@/lib/dateTime";

export async function GET() {
  if (!(await getCurrentAdmin())) return NextResponse.json({ error: "Brak dostępu administratora." }, { status: 401 });
  const from = new Date(); const to = new Date(from); to.setMonth(to.getMonth() + 4);
  const [appointments, blocks, slots, googleEvents, bufferSetting] = await Promise.all([
    prisma.appointment.findMany({ where: { status: { notIn: ["cancelled", "no_show"] }, endsAt: { gte: from }, startsAt: { lte: to } }, select: { id: true, startsAt: true, endsAt: true, status: true, notes: true, price: true, project: { select: { title: true, client: { select: { id: true, firstName: true, lastName: true } } } } } }),
    prisma.availabilityBlock.findMany({ where: { endsAt: { gte: from }, startsAt: { lte: to } }, select: { id: true, startsAt: true, endsAt: true, reason: true } }),
    prisma.availableSlot.findMany({ where: { endsAt: { gte: from }, startsAt: { lte: to } }, select: { id: true, startsAt: true, endsAt: true, title: true, description: true, color: true, icon: true, isPublic: true } }),
    prisma.calendarEvent.findMany({ where: { endsAt: { gte: from }, startsAt: { lte: to }, googleCalendarSync: { isNot: null } }, select: { startsAt: true, endsAt: true, title: true, color: true } }),
    prisma.siteSetting.findUnique({ where: { key: "booking_buffer_minutes" }, select: { value: true } }),
  ]);
  return NextResponse.json({
    appointments: appointments.map((item) => ({ id: item.id, startsAt: item.startsAt.toISOString(), endsAt: item.endsAt.toISOString(), status: item.status, notes: item.notes, price: item.price, clientId: item.project.client.id, clientName: `${item.project.client.firstName} ${item.project.client.lastName}`, projectTitle: item.project.title, label: `${item.project.client.firstName} ${item.project.client.lastName} · ${item.project.title}` })),
    blocks: blocks.map((item) => { const range = normalizeCalendarBlockRange(item); return { id: item.id, startsAt: range.startsAt.toISOString(), endsAt: range.endsAt.toISOString(), reason: item.reason }; }),
    slots: slots.map((item) => ({ ...item, startsAt: item.startsAt.toISOString(), endsAt: item.endsAt.toISOString() })),
    googleBusy: googleEvents.map((item) => ({ ...item, startsAt: item.startsAt.toISOString(), endsAt: item.endsAt.toISOString() })),
    bufferMinutes: Math.min(240, Math.max(0, Number(bufferSetting?.value ?? 0) || 0)),
  });
}
