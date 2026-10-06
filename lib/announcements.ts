import { prisma } from "@/lib/prisma";
import { ANNOUNCEMENT_PREFIX, DISMISSAL_PREFIX, announcementActive, parseAnnouncement } from "@/lib/announcementRules";

export async function getAnnouncements() {
  const rows = await prisma.siteSetting.findMany({ where: { key: { startsWith: ANNOUNCEMENT_PREFIX } }, orderBy: { updatedAt: "desc" }, take: 100 });
  return rows.flatMap(row => { const a = parseAnnouncement(row.value); return a ? [a] : []; });
}
export async function getClientAnnouncements(clientId: string) {
  const active = (await getAnnouncements()).filter(a => announcementActive(a));
  if (!active.length) return [];
  const dismissed = await prisma.clientNotification.findMany({ where: { clientId, type: { in: active.map(a => `${DISMISSAL_PREFIX}${a.id}`) } }, select: { type: true } });
  const hidden = new Set(dismissed.map(row => row.type));
  return active.filter(a => !hidden.has(`${DISMISSAL_PREFIX}${a.id}`));
}
