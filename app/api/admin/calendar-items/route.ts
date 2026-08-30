import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { isHexColor, rangeCanFit, resolveAvailableRanges } from "@/lib/calendarHub";
import { sanitizeRichText } from "@/lib/richText";
import { isValidIconName } from "@/lib/icons";

type CalendarKind = "dayOff" | "freeTerm" | "promotion" | "event" | "workingHours" | "clearStatus";
const text = (value: unknown) => String(value ?? "").trim();
const toDate = (value: unknown) => new Date(String(value ?? ""));
const validRange = (from: Date, to: Date) => !Number.isNaN(from.getTime()) && !Number.isNaN(to.getTime()) && from < to;
const validTime = (value: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
const safeColor = (value: unknown, fallback: string) => isHexColor(text(value)) ? text(value) : fallback;
const safeIcon = (value: unknown) => isValidIconName(text(value)) ? text(value) : null;

async function adminOnly() {
  return (await getCurrentAdmin()) ? null : NextResponse.json({ error: "Brak dostępu administratora." }, { status: 401 });
}
function parse(raw: unknown) {
  const body = raw as Record<string, unknown> | null;
  return { body, kind: text(body?.kind) as CalendarKind, startsAt: toDate(body?.startsAt), endsAt: toDate(body?.endsAt) };
}
function selectedDates(body: Record<string, unknown> | null) {
  const dates = Array.isArray(body?.dates) ? body.dates.map(toDate).filter((date) => !Number.isNaN(date.getTime())) : [];
  return [...new Map(dates.map((date) => { date.setHours(0, 0, 0, 0); return [date.toISOString(), date] as const; })).values()];
}
function safeUrl(value: unknown) {
  const candidate = text(value); if (!candidate) return null;
  try { const url = new URL(candidate, "https://coolink.local"); return url.protocol === "https:" || (url.origin === "https://coolink.local" && candidate.startsWith("/")) ? candidate : null; } catch { return null; }
}
function content(kind: CalendarKind, body: Record<string, unknown> | null, startsAt: Date, endsAt: Date) {
  if (kind === "freeTerm") return { startsAt, endsAt, title: text(body?.title) || null, description: sanitizeRichText(text(body?.description)) || null, color: safeColor(body?.color, "#10B981"), icon: safeIcon(body?.icon), isPublic: Boolean(body?.isPublic) };
  if (kind === "promotion") return { title: text(body?.title), description: sanitizeRichText(text(body?.description)) || null, badge: text(body?.badge) || null, startsAt, endsAt, color: safeColor(body?.color, "#C99A4A"), icon: safeIcon(body?.icon), promoCode: text(body?.promoCode) || null, ctaLabel: text(body?.ctaLabel) || null, ctaUrl: safeUrl(body?.ctaUrl), isPublic: Boolean(body?.isPublic), active: body?.active !== false };
  if (kind === "event") return { title: text(body?.title), description: sanitizeRichText(text(body?.description)) || null, startsAt, endsAt, allDay: Boolean(body?.allDay), color: safeColor(body?.color, "#6B7280"), icon: safeIcon(body?.icon), label: text(body?.label) || null, isPublic: Boolean(body?.isPublic) };
  return null;
}
async function availableForSlot(startsAt: Date, endsAt: Date) {
  const [hours, overrides, blocks, appointments, setting] = await Promise.all([
    prisma.workingHours.findMany(), prisma.workingHoursOverride.findMany(),
    prisma.availabilityBlock.findMany({ where: { startsAt: { lt: endsAt }, endsAt: { gt: startsAt } } }),
    prisma.appointment.findMany({ where: { status: { notIn: ["cancelled", "no_show"] }, startsAt: { lt: endsAt }, endsAt: { gt: startsAt } }, select: { startsAt: true, endsAt: true, status: true } }),
    prisma.siteSetting.findUnique({ where: { key: "booking_buffer_minutes" }, select: { value: true } }),
  ]);
  return rangeCanFit(resolveAvailableRanges({ date: startsAt, recurring: hours, overrides, slots: [{ startsAt, endsAt }], blocks, appointments, bufferMinutes: Number(setting?.value) || 0 }), startsAt, endsAt);
}

export async function POST(request: Request) {
  const denied = await adminOnly(); if (denied) return denied;
  const { body, kind, startsAt, endsAt } = parse(await request.json().catch(() => null)); const dates = selectedDates(body);
  if (kind === "workingHours") {
    const hours = body?.hours as Record<string, unknown> | undefined; const from = text(hours?.startsAt) || "10:00"; const to = text(hours?.endsAt) || "19:00";
    if (!dates.length || !validTime(from) || !validTime(to) || from >= to) return NextResponse.json({ error: "Wybierz dni i poprawne godziny." }, { status: 400 });
    await prisma.$transaction(async (tx) => Promise.all(dates.map((date) => tx.workingHoursOverride.upsert({ where: { date }, update: { enabled: hours?.enabled !== false, startsAt: from, endsAt: to, breakStart: text(hours?.breakStart) || null, breakEnd: text(hours?.breakEnd) || null }, create: { date, enabled: hours?.enabled !== false, startsAt: from, endsAt: to, breakStart: text(hours?.breakStart) || null, breakEnd: text(hours?.breakEnd) || null } }))));
    return NextResponse.json({ ok: true });
  }
  if (kind === "dayOff") {
    if (!validRange(startsAt, endsAt)) return NextResponse.json({ error: "Podaj poprawny zakres dnia wolnego." }, { status: 400 });
    if (dates.length > 1) { await prisma.$transaction(async (tx) => Promise.all(dates.map((date) => { const end = new Date(date); end.setDate(end.getDate() + 1); return tx.availabilityBlock.create({ data: { startsAt: date, endsAt: end, reason: text(body?.reason) || "Dzień wolny" } }); }))); return NextResponse.json({ ok: true }, { status: 201 }); }
    return NextResponse.json({ item: await prisma.availabilityBlock.create({ data: { startsAt, endsAt, reason: text(body?.reason) || "Dzień wolny" } }) }, { status: 201 });
  }
  if (!validRange(startsAt, endsAt)) return NextResponse.json({ error: "Podaj poprawny zakres dat i godzin." }, { status: 400 });
  const data = content(kind, body, startsAt, endsAt);
  if (!data || ((kind === "promotion" || kind === "event") && !data.title)) return NextResponse.json({ error: "Uzupełnij wymagane dane elementu." }, { status: 400 });
  if (kind === "freeTerm") {
    const slotRanges = dates.length > 1 ? dates.map((date) => { const from = new Date(date); from.setHours(startsAt.getHours(), startsAt.getMinutes(), 0, 0); const to = new Date(date); to.setHours(endsAt.getHours(), endsAt.getMinutes(), 0, 0); return { startsAt: from, endsAt: to }; }) : [{ startsAt, endsAt }];
    if (!slotRanges.every((slot) => validRange(slot.startsAt, slot.endsAt)) || !(await Promise.all(slotRanges.map((slot) => availableForSlot(slot.startsAt, slot.endsAt)))).every(Boolean)) return NextResponse.json({ error: "Co najmniej jeden termin jest blokowany przez dzień wolny, wizytę lub bufor. Nic nie zapisano." }, { status: 409 });
    await prisma.$transaction(async (tx) => Promise.all(slotRanges.map((slot) => tx.availableSlot.create({ data: { ...data, ...slot } }))));
    return NextResponse.json({ ok: true }, { status: 201 });
  }
  if ((kind === "promotion" || kind === "event") && dates.length > 1) {
    const ranges = dates.map((date) => { const from = new Date(date); from.setHours(startsAt.getHours(), startsAt.getMinutes(), 0, 0); const to = new Date(date); to.setHours(endsAt.getHours(), endsAt.getMinutes(), 0, 0); return { startsAt: from, endsAt: to }; });
    await prisma.$transaction(async (tx) => Promise.all(ranges.map((range) => kind === "promotion" ? tx.promotion.create({ data: { ...(data as Prisma.PromotionUncheckedCreateInput), ...range } }) : tx.calendarEvent.create({ data: { ...(data as Prisma.CalendarEventUncheckedCreateInput), ...range } }))));
    return NextResponse.json({ ok: true }, { status: 201 });
  }
  if (kind === "promotion") return NextResponse.json({ item: await prisma.promotion.create({ data: data as Prisma.PromotionUncheckedCreateInput }) }, { status: 201 });
  if (kind === "event") return NextResponse.json({ item: await prisma.calendarEvent.create({ data: data as Prisma.CalendarEventUncheckedCreateInput }) }, { status: 201 });
  return NextResponse.json({ error: "Nieznany typ elementu kalendarza." }, { status: 400 });
}

export async function PATCH(request: Request) {
  const denied = await adminOnly(); if (denied) return denied;
  const { body, kind, startsAt, endsAt } = parse(await request.json().catch(() => null)); const id = text(body?.id);
  if (!id) return NextResponse.json({ error: "Brakuje identyfikatora elementu." }, { status: 400 });
  if (kind === "workingHours") { const hours = body?.hours as Record<string, unknown> | undefined; const from = text(hours?.startsAt); const to = text(hours?.endsAt); if (!validTime(from) || !validTime(to) || from >= to) return NextResponse.json({ error: "Podaj poprawne godziny pracy." }, { status: 400 }); return NextResponse.json({ item: await prisma.workingHoursOverride.update({ where: { id }, data: { enabled: hours?.enabled !== false, startsAt: from, endsAt: to, breakStart: text(hours?.breakStart) || null, breakEnd: text(hours?.breakEnd) || null } }) }); }
  if (!validRange(startsAt, endsAt)) return NextResponse.json({ error: "Podaj poprawny zakres dat i godzin." }, { status: 400 });
  if (kind === "dayOff") return NextResponse.json({ item: await prisma.availabilityBlock.update({ where: { id }, data: { startsAt, endsAt, reason: text(body?.reason) || null } }) });
  const data = content(kind, body, startsAt, endsAt); if (!data || ((kind === "promotion" || kind === "event") && !data.title)) return NextResponse.json({ error: "Uzupełnij wymagane dane elementu." }, { status: 400 });
  if (kind === "freeTerm") { if (!(await availableForSlot(startsAt, endsAt))) return NextResponse.json({ error: "Termin koliduje z wizytą, buforem albo dniem wolnym." }, { status: 409 }); return NextResponse.json({ item: await prisma.availableSlot.update({ where: { id }, data }) }); }
  if (kind === "promotion") return NextResponse.json({ item: await prisma.promotion.update({ where: { id }, data: data as Prisma.PromotionUncheckedUpdateInput }) });
  if (kind === "event") return NextResponse.json({ item: await prisma.calendarEvent.update({ where: { id }, data: data as Prisma.CalendarEventUncheckedUpdateInput }) });
  return NextResponse.json({ error: "Nieznany typ elementu kalendarza." }, { status: 400 });
}

export async function DELETE(request: Request) {
  const denied = await adminOnly(); if (denied) return denied;
  const { searchParams } = new URL(request.url); const kind = searchParams.get("kind") as CalendarKind | null; const id = searchParams.get("id"); const ids = searchParams.getAll("id").filter(Boolean);
  if (kind === "clearStatus") {
    const dates = searchParams.getAll("date").map(toDate).filter((date) => !Number.isNaN(date.getTime()));
    if (!dates.length) return NextResponse.json({ error: "Wybierz co najmniej jeden dzień." }, { status: 400 });
    await prisma.$transaction(async (tx) => Promise.all(dates.map((value) => {
      const start = new Date(value); start.setHours(0, 0, 0, 0);
      const end = new Date(start); end.setDate(end.getDate() + 1);
      return Promise.all([
        tx.availableSlot.deleteMany({ where: { startsAt: { gte: start, lt: end } } }),
        tx.availabilityBlock.deleteMany({ where: { startsAt: { gte: start, lt: end } } }),
      ]);
    })));
    return NextResponse.json({ ok: true });
  }
  if (!id || !kind) return NextResponse.json({ error: "Brakuje danych elementu." }, { status: 400 });
  if (ids.length > 1) {
    if (kind === "dayOff") await prisma.$transaction((tx) => Promise.all(ids.map((item) => tx.availabilityBlock.delete({ where: { id: item } }))));
    else if (kind === "freeTerm") await prisma.$transaction((tx) => Promise.all(ids.map((item) => tx.availableSlot.delete({ where: { id: item } }))));
    else if (kind === "promotion") await prisma.$transaction((tx) => Promise.all(ids.map((item) => tx.promotion.delete({ where: { id: item } }))));
    else if (kind === "event") await prisma.$transaction((tx) => Promise.all(ids.map((item) => tx.calendarEvent.delete({ where: { id: item } }))));
    else if (kind === "workingHours") await prisma.$transaction((tx) => Promise.all(ids.map((item) => tx.workingHoursOverride.delete({ where: { id: item } }))));
    else return NextResponse.json({ error: "Nieznany typ elementu kalendarza." }, { status: 400 });
    return NextResponse.json({ ok: true });
  }
  if (kind === "dayOff") await prisma.availabilityBlock.delete({ where: { id } }); else if (kind === "freeTerm") await prisma.availableSlot.delete({ where: { id } }); else if (kind === "promotion") await prisma.promotion.delete({ where: { id } }); else if (kind === "event") await prisma.calendarEvent.delete({ where: { id } }); else if (kind === "workingHours") await prisma.workingHoursOverride.delete({ where: { id } }); else return NextResponse.json({ error: "Nieznany typ elementu kalendarza." }, { status: 400 });
  return NextResponse.json({ ok: true });
}
