export const ANNOUNCEMENT_PREFIX = "client-announcement:";
export const DISMISSAL_PREFIX = "announcement-dismissed:";
export const visibleNotificationType = { not: { startsWith: DISMISSAL_PREFIX } };
export interface Announcement {
  id: string; title: string; body: string; href: string; notify: boolean;
  expiresAt: string; createdAt: string; active: boolean;
}
export function validAnnouncementId(id: unknown): id is string {
  return typeof id === "string" && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(id);
}
export function validateAnnouncement(input: unknown, now = new Date()): Omit<Announcement, "createdAt" | "active"> {
  if (!input || typeof input !== "object") throw new Error("Sprawdź treść komunikatu.");
  const b = input as Record<string, unknown>;
  if (!validAnnouncementId(b.id) || typeof b.title !== "string" || typeof b.body !== "string" || typeof b.notify !== "boolean") throw new Error("Sprawdź treść komunikatu.");
  const title = b.title.trim(), body = b.body.trim();
  if (!title || title.length > 120 || !body || body.length > 2000) throw new Error("Tytuł: 1–120 znaków, treść: 1–2000 znaków.");
  // No arbitrary/external links: announcements can only navigate within the client portal.
  const href = typeof b.href === "string" ? b.href : "";
  if (href && !["/app/portal/calendar", "/app/portal/projects", "/app/portal/messages"].includes(href)) throw new Error("Wybierz poprawny odnośnik.");
  const expiry = typeof b.expiresAt === "string" ? new Date(b.expiresAt) : new Date(NaN);
  if (!Number.isFinite(+expiry) || +expiry <= +now || +expiry > +now + 90 * 86400_000) throw new Error("Wygaśnięcie musi przypadać w ciągu kolejnych 90 dni.");
  return { id: b.id, title, body, href, notify: b.notify, expiresAt: expiry.toISOString() };
}
export function parseAnnouncement(value: string): Announcement | null {
  try {
    const a = JSON.parse(value) as Announcement;
    if (!validAnnouncementId(a.id) || typeof a.title !== "string" || typeof a.body !== "string" || typeof a.active !== "boolean" || typeof a.notify !== "boolean" || !Number.isFinite(+new Date(a.createdAt)) || !Number.isFinite(+new Date(a.expiresAt))) return null;
    if (a.href && !["/app/portal/calendar", "/app/portal/projects", "/app/portal/messages"].includes(a.href)) return null;
    return a;
  } catch { return null; }
}
export function announcementActive(a: Announcement, now = new Date()) { return a.active && +new Date(a.expiresAt) > +now; }
