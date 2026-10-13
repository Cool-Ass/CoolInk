import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { MARKETING_SEGMENTS } from "@/lib/marketingCatalog";
export { MARKETING_SEGMENTS } from "@/lib/marketingCatalog";
export type MarketingSegment = keyof typeof MARKETING_SEGMENTS;
export function marketingSegment(visits: number, lastVisit: Date | null, now: Date): MarketingSegment {
  if (!visits || !lastVisit) return "no_visits";
  if (lastVisit.getTime() < now.getTime() - 180 * 86400000) return "dormant";
  return visits >= 2 ? "returning" : "first_visit";
}
export async function marketingSegments(now = new Date()) {
  const cutoff = new Date(now.getTime() - 180 * 86400000);
  const rows = await prisma.$queryRaw<{ no_visits: number; first_visit: number; returning: number; dormant: number }[]>`
    WITH history AS (
      SELECT c.id, count(a.id)::int AS visits, max(a."startsAt") AS last_visit
      FROM "Client" c
      LEFT JOIN "TattooProject" p ON p."clientId" = c.id AND p.kind = 'tattoo'
      LEFT JOIN "Appointment" a ON a."projectId" = p.id AND a.status = 'completed' AND (a."serviceType" IS NULL OR a."serviceType" = 'tattoo') AND a."startsAt" <= ${now}
      WHERE NOT EXISTS (SELECT 1 FROM "AccountDeletionRequest" r WHERE r."clientId" = c.id)
      GROUP BY c.id
    )
    SELECT count(*) FILTER (WHERE visits = 0)::int AS no_visits,
      count(*) FILTER (WHERE visits = 1 AND last_visit >= ${cutoff})::int AS first_visit,
      count(*) FILTER (WHERE visits >= 2 AND last_visit >= ${cutoff})::int AS returning,
      count(*) FILTER (WHERE visits > 0 AND last_visit < ${cutoff})::int AS dormant
    FROM history
  `;
  return rows[0] || { no_visits: 0, first_visit: 0, returning: 0, dormant: 0 };
}
export function campaignInput(value: unknown, now = new Date()) {
  if (!value || typeof value !== "object") throw Error("Sprawdź ofertę.");
  const data = value as Record<string, unknown>;
  const title = typeof data.title === "string" ? data.title.trim() : "", audience = data.audience;
  const startsAt = new Date(String(data.startsAt ?? "")), endsAt = new Date(String(data.endsAt ?? ""));
  if (!title || title.length > 160 || typeof audience !== "string" || !Object.hasOwn(MARKETING_SEGMENTS, audience) || !Number.isFinite(startsAt.getTime()) || !Number.isFinite(endsAt.getTime()) || startsAt <= now || endsAt <= startsAt || endsAt.getTime() - startsAt.getTime() > 12 * 3600000) throw Error("Wybierz przyszły termin, tytuł i segment klientów.");
  const discount = data.discount ?? 0;
  if (typeof discount !== "number" || !Number.isInteger(discount) || discount < 0 || discount > 30) throw Error("Proponowany rabat musi wynosić od 0 do 30%.");
  const date = startsAt.toLocaleString("pl-PL", { timeZone: "Europe/Warsaw", dateStyle: "long", timeStyle: "short" });
  const offer = discount ? ` Propozycja rabatu: ${discount}% (wymaga potwierdzenia przez studio, nie łączy się automatycznie z innymi rabatami).` : "";
  const caption = data.caption ?? `Wolny termin w CoolInk: ${date}. ${title}.${offer} Napisz, aby omówić projekt i potwierdzić dostępność.`;
  const story = data.story ?? `WOLNY TERMIN\n${date}\n${title}\nNapisz do CoolInk po szczegóły.${offer}`;
  if (typeof caption !== "string" || !caption.trim() || caption.length > 4000 || typeof story !== "string" || !story.trim() || story.length > 2000) throw Error("Skróć treść posta lub relacji.");
  return { title, startsAt, endsAt, campaignAudience: audience, suggestedDiscountPercent: discount, campaignCaption: caption.trim(), campaignStory: story.trim() };
}
export async function resolveBookingPromotion(tx: Prisma.TransactionClient, code: string, startsAt: Date, endsAt: Date) {
  if (!code) return null;
  const matches = await tx.promotion.findMany({ where: { promoCode: { equals: code, mode: "insensitive" }, active: true, isPublic: true, startsAt: { lte: startsAt }, endsAt: { gte: endsAt }, OR: [{ campaignStatus: null }, { campaignStatus: "approved" }] }, select: { id: true }, take: 2 });
  if (matches.length !== 1) throw Error("PROMOTION_INVALID");
  return matches[0].id;
}
