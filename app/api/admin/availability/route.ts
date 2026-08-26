import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type HoursPayload = { weekday: number; enabled: boolean; startsAt: string; endsAt: string };

const defaultHours = Array.from({ length: 7 }, (_, weekday) => ({
  weekday,
  enabled: weekday !== 0,
  startsAt: "10:00",
  endsAt: "19:00",
}));

export async function GET() {
  const [hours, blocks, promotions, buffer] = await Promise.all([
    prisma.workingHours.findMany({ orderBy: { weekday: "asc" } }),
    prisma.availabilityBlock.findMany({ where: { endsAt: { gte: new Date() } }, orderBy: { startsAt: "asc" } }),
    prisma.promotion.findMany({ where: { endsAt: { gte: new Date() } }, orderBy: { startsAt: "asc" } }),
    prisma.siteSetting.findUnique({ where: { key: "booking_buffer_minutes" }, select: { value: true } }),
  ]);
  return NextResponse.json({ hours: hours.length ? hours : defaultHours, blocks, promotions, bufferMinutes: Number(buffer?.value) || 30 });
}

export async function PUT(request: Request) {
  const body = await request.json().catch(() => null);
  const hours: HoursPayload[] = Array.isArray(body?.hours) ? body.hours : [];
  const bufferMinutes = Number(body?.bufferMinutes);
  if (hours.length !== 7) return NextResponse.json({ error: "Uzupełnij godziny dla każdego dnia tygodnia." }, { status: 400 });
  if (!Number.isInteger(bufferMinutes) || bufferMinutes < 0 || bufferMinutes > 240 || bufferMinutes % 5 !== 0) return NextResponse.json({ error: "Bufor ustaw od 0 do 240 minut, co 5 minut." }, { status: 400 });

  await prisma.$transaction([...hours.map((item) => prisma.workingHours.upsert({
    where: { weekday: Number(item.weekday) },
    update: { enabled: Boolean(item.enabled), startsAt: String(item.startsAt), endsAt: String(item.endsAt) },
    create: { weekday: Number(item.weekday), enabled: Boolean(item.enabled), startsAt: String(item.startsAt), endsAt: String(item.endsAt) },
  })), prisma.siteSetting.upsert({ where: { key: "booking_buffer_minutes" }, update: { value: String(bufferMinutes) }, create: { key: "booking_buffer_minutes", value: String(bufferMinutes) } })]);
  return NextResponse.json({ ok: true });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const kind = String(body?.kind ?? "");
  if (kind === "block") {
    const startsAt = new Date(String(body?.startsAt ?? ""));
    const endsAt = new Date(String(body?.endsAt ?? ""));
    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) || endsAt <= startsAt) return NextResponse.json({ error: "Podaj poprawny zakres niedostępności." }, { status: 400 });
    const block = await prisma.availabilityBlock.create({ data: { startsAt, endsAt, reason: String(body?.reason ?? "").trim() || null } });
    return NextResponse.json({ block }, { status: 201 });
  }
  if (kind === "promotion") {
    const title = String(body?.title ?? "").trim();
    const startsAt = new Date(String(body?.startsAt ?? ""));
    const endsAt = new Date(String(body?.endsAt ?? ""));
    if (!title || Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) || endsAt < startsAt) return NextResponse.json({ error: "Uzupełnij nazwę oraz poprawny okres promocji." }, { status: 400 });
    const promotion = await prisma.promotion.create({ data: { title, description: String(body?.description ?? "").trim() || null, badge: String(body?.badge ?? "").trim() || null, startsAt, endsAt } });
    return NextResponse.json({ promotion }, { status: 201 });
  }
  return NextResponse.json({ error: "Nieznany typ ustawienia." }, { status: 400 });
}
