import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isSameOrigin } from "@/lib/requestSecurity";

type HoursPayload = { weekday: number; enabled: boolean; startsAt: string; endsAt: string };

const defaultHours = Array.from({ length: 7 }, (_, weekday) => ({
  weekday,
  enabled: weekday !== 0,
  startsAt: "10:00",
  endsAt: "19:00",
}));

export async function GET() {
  if (!(await getCurrentAdmin())) return NextResponse.json({ error: "Brak dostępu administratora." }, { status: 401 });
  const [hours, blocks, promotions, buffer] = await Promise.all([
    prisma.workingHours.findMany({ orderBy: { weekday: "asc" } }),
    prisma.availabilityBlock.findMany({ where: { endsAt: { gte: new Date() } }, orderBy: { startsAt: "asc" } }),
    prisma.promotion.findMany({ where: { endsAt: { gte: new Date() } }, orderBy: { startsAt: "asc" } }),
    prisma.siteSetting.findUnique({ where: { key: "booking_buffer_minutes" }, select: { value: true } }),
  ]);
  return NextResponse.json({ hours: hours.length ? hours : defaultHours, blocks, promotions, bufferMinutes: Number(buffer?.value) || 30 });
}

export async function PUT(request: Request) {
  if (!(await getCurrentAdmin())) return NextResponse.json({ error: "Brak dostępu administratora." }, { status: 401 });
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await request.json().catch(() => null);
  const bufferMinutes = Number(body?.bufferMinutes);
  if (!Number.isInteger(bufferMinutes) || bufferMinutes < 0 || bufferMinutes > 240 || bufferMinutes % 5 !== 0) return NextResponse.json({ error: "Bufor ustaw od 0 do 240 minut, co 5 minut." }, { status: 400 });
  const visibleMonths = Number(body?.visibleMonths ?? 3);
  const defaultFreeStart = String(body?.defaultFreeStart ?? "10:00");
  const defaultFreeEnd = String(body?.defaultFreeEnd ?? "18:00");
  if (!Number.isInteger(visibleMonths) || visibleMonths < 1 || visibleMonths > 12) return NextResponse.json({ error: "Widoczność ustaw od 1 do 12 miesięcy." }, { status: 400 });
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(defaultFreeStart) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(defaultFreeEnd) || defaultFreeStart >= defaultFreeEnd) return NextResponse.json({ error: "Podaj poprawne domyślne godziny wolnego terminu." }, { status: 400 });

  await prisma.$transaction([
    prisma.siteSetting.upsert({ where: { key: "booking_buffer_minutes" }, update: { value: String(bufferMinutes) }, create: { key: "booking_buffer_minutes", value: String(bufferMinutes) } }),
    prisma.siteSetting.upsert({ where: { key: "calendar_visible_months" }, update: { value: String(visibleMonths) }, create: { key: "calendar_visible_months", value: String(visibleMonths) } }),
    prisma.siteSetting.upsert({ where: { key: "calendar_default_free_start" }, update: { value: defaultFreeStart }, create: { key: "calendar_default_free_start", value: defaultFreeStart } }),
    prisma.siteSetting.upsert({ where: { key: "calendar_default_free_end" }, update: { value: defaultFreeEnd }, create: { key: "calendar_default_free_end", value: defaultFreeEnd } }),
  ]);
  return NextResponse.json({ ok: true });
}

export async function POST(request: Request) {
  if (!(await getCurrentAdmin())) return NextResponse.json({ error: "Brak dostępu administratora." }, { status: 401 });
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
