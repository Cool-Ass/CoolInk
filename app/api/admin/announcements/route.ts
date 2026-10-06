import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/adminApi";
import { prisma } from "@/lib/prisma";
import { isSameOrigin, rateLimit, tooManyRequests } from "@/lib/requestSecurity";
import { ANNOUNCEMENT_PREFIX, parseAnnouncement, validAnnouncementId, validateAnnouncement } from "@/lib/announcementRules";
import { getAnnouncements } from "@/lib/announcements";
class PublicationError extends Error {}

export async function GET() {
  const auth = await requireAdminApi("content.manage");
  if (!auth.ok) return auth.response;
  return NextResponse.json({ announcements: await getAnnouncements() });
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const auth = await requireAdminApi("content.manage");
  if (!auth.ok) return auth.response;
  const limit = await rateLimit(request, "announcement-publish", 5, 60_000, auth.admin.id);
  if (!limit.allowed) return tooManyRequests(limit);
  let input;
  try { input = validateAnnouncement(await request.json()); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Sprawdź formularz." }, { status: 400 }); }
  try {
    const result = await prisma.$transaction(async tx => {
      // Publication and disable share this transaction lock: retries cannot fan out twice.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(726061006)`;
      const key = `${ANNOUNCEMENT_PREFIX}${input.id}`;
      const existing = await tx.siteSetting.findUnique({ where: { key } });
      if (existing) {
        const a = parseAnnouncement(existing.value);
        if (!a || Object.keys(input).some(k => input[k as keyof typeof input] !== a[k as keyof typeof input])) throw new PublicationError("Identyfikator był już użyty dla innego komunikatu.");
        return { announcement: a, duplicate: true };
      }
      // Bounded history, no permanent accumulation of expired announcement bodies.
      const history = await tx.siteSetting.findMany({ where: { key: { startsWith: ANNOUNCEMENT_PREFIX } }, orderBy: { updatedAt: "desc" } });
      for (const row of history) {
        const a = parseAnnouncement(row.value);
        if (a && +new Date(a.expiresAt) < Date.now() - 90 * 86400_000) {
          await tx.clientNotification.deleteMany({ where: { type: { in: [`announcement:${a.id}`, `announcement-dismissed:${a.id}`] } } });
          await tx.siteSetting.delete({ where: { key: row.key } });
        }
      }
      if (await tx.siteSetting.count({ where: { key: { startsWith: ANNOUNCEMENT_PREFIX } } }) >= 100) throw new PublicationError("Limit 100 komunikatów. Poczekaj na zwolnienie historii wygasłych komunikatów.");
      const a = { ...input, active: true, createdAt: new Date().toISOString() };
      await tx.siteSetting.create({ data: { key, value: JSON.stringify(a) } });
      let recipients = 0;
      if (input.notify) {
        // In-app bell only. No email/SMS/push marketing or unbounded synchronous sending.
        const clients = await tx.client.findMany({ where: { supabaseUserId: { not: null }, deletionRequest: null }, select: { id: true }, take: 5001 });
        if (clients.length > 5000) throw new PublicationError("Powiadomienie przekracza limit 5000 odbiorców. Opublikuj bez dzwonka.");
        recipients = clients.length;
        if (clients.length) await tx.clientNotification.createMany({ data: clients.map(c => ({ clientId: c.id, type: `announcement:${a.id}`, title: a.title, body: a.body, href: "/app/portal" })) });
      }
      await tx.adminAuditLog.create({ data: { adminUserId: auth.admin.id, action: "announcement_published", targetType: "SiteSetting", targetId: key, summary: "Opublikowano komunikat dla klientów", metadata: JSON.stringify({ notify: a.notify, recipients, expiresAt: a.expiresAt }) } });
      return { announcement: a, recipients, duplicate: false };
    }, { timeout: 15_000 });
    return NextResponse.json(result);
  } catch (error) { return NextResponse.json({ error: error instanceof PublicationError ? error.message : "Publikacja nie powiodła się. Ponów żądanie." }, { status: error instanceof PublicationError ? 409 : 503 }); }
}

export async function PATCH(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const auth = await requireAdminApi("content.manage");
  if (!auth.ok) return auth.response;
  const limit = await rateLimit(request, "announcement-disable", 15, 60_000, auth.admin.id);
  if (!limit.allowed) return tooManyRequests(limit);
  const body = await request.json().catch(() => null);
  if (!validAnnouncementId(body?.id)) return NextResponse.json({ error: "Niepoprawny komunikat." }, { status: 400 });
  const announcement = await prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(726061006)`;
    const key = `${ANNOUNCEMENT_PREFIX}${body.id}`;
    const row = await tx.siteSetting.findUnique({ where: { key } });
    const a = row && parseAnnouncement(row.value);
    if (!a) return null;
    a.active = false;
    await tx.siteSetting.update({ where: { key }, data: { value: JSON.stringify(a) } });
    await tx.clientNotification.deleteMany({ where: { type: `announcement:${a.id}` } });
    await tx.adminAuditLog.create({ data: { adminUserId: auth.admin.id, action: "announcement_disabled", targetType: "SiteSetting", targetId: key, summary: "Wyłączono komunikat dla klientów" } });
    return a;
  });
  return announcement ? NextResponse.json({ announcement }) : NextResponse.json({ error: "Nie znaleziono komunikatu." }, { status: 404 });
}
