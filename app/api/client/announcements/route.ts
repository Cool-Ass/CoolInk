import { NextResponse } from "next/server";
import { getCurrentClient } from "@/lib/clientAuth";
import { prisma } from "@/lib/prisma";
import { isSameOrigin, rateLimit, tooManyRequests } from "@/lib/requestSecurity";
import { ANNOUNCEMENT_PREFIX, DISMISSAL_PREFIX, announcementActive, parseAnnouncement, validAnnouncementId } from "@/lib/announcementRules";

export async function PATCH(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const client = await getCurrentClient();
  if (!client) return NextResponse.json({ error: "Zaloguj się ponownie." }, { status: 401 });
  const limit = await rateLimit(request, "announcement-dismiss", 30, 60_000, client.id);
  if (!limit.allowed) return tooManyRequests(limit);
  const body = await request.json().catch(() => null);
  if (!validAnnouncementId(body?.id)) return NextResponse.json({ error: "Niepoprawny komunikat." }, { status: 400 });
  const dismissed = await prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(726061006)`;
    const row = await tx.siteSetting.findUnique({ where: { key: `${ANNOUNCEMENT_PREFIX}${body.id}` } });
    const a = row && parseAnnouncement(row.value);
    if (!a || !announcementActive(a)) return false;
    await tx.clientNotification.upsert({ where: { id: `dismiss:${client.id}:${a.id}` }, update: {}, create: { id: `dismiss:${client.id}:${a.id}`, clientId: client.id, type: `${DISMISSAL_PREFIX}${a.id}`, title: "", body: "", readAt: new Date() } });
    await tx.clientNotification.updateMany({ where: { clientId: client.id, type: `announcement:${a.id}`, readAt: null }, data: { readAt: new Date() } });
    return true;
  });
  return dismissed ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Komunikat nie jest już aktywny." }, { status: 404 });
}
