export const ANNOUNCEMENT_PREFIX = "client-announcement:";
export const DISMISSAL_PREFIX = "announcement-dismissed:";
export const visibleNotificationType = { not: { startsWith: DISMISSAL_PREFIX } };
export interface Announcement {
  id: string; title: string; body: string; href: string; notify: boolean;
  expiresAt: string; createdAt: string; active: boolean;
  bodyFormat?: "plain" | "markdown"; images?: { url: string; alt: string }[];
}
export function validAnnouncementImage(url: unknown): url is string {
  if (typeof url !== "string" || url.length > 2048) return false;
  if (/^\/uploads\/[a-z0-9-]+\.(webp|png|jpe?g)$/i.test(url)) return true;
  try { const parsed = new URL(url); return parsed.protocol === "https:" && !parsed.username && !parsed.password; } catch { return false; }
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
  const bodyFormat = b.bodyFormat ?? "plain";
  if (bodyFormat !== "plain" && bodyFormat !== "markdown") throw new Error("Niepoprawny format tekstu.");
  const images = b.images ?? [];
  if (!Array.isArray(images) || images.length > 4 || images.some(image => !image || !validAnnouncementImage(image.url) || typeof image.alt !== "string" || !image.alt.trim() || image.alt.length > 300)) throw new Error("Dodaj maksymalnie 4 obrazy z opisem (do 300 znaków).");
  if (new Set(images.map(image => image.url)).size !== images.length) throw new Error("Ten sam obraz można dodać tylko raz.");
  return { id: b.id, title, body, href, notify: b.notify, expiresAt: expiry.toISOString(), bodyFormat, images: images.map(image => ({ url: image.url, alt: image.alt.trim() })) };
}
export function parseAnnouncement(value: string): Announcement | null {
  try {
    const a = JSON.parse(value) as Announcement;
    if (!validAnnouncementId(a.id) || typeof a.title !== "string" || typeof a.body !== "string" || typeof a.active !== "boolean" || typeof a.notify !== "boolean" || !Number.isFinite(+new Date(a.createdAt)) || !Number.isFinite(+new Date(a.expiresAt))) return null;
    if (a.href && !["/app/portal/calendar", "/app/portal/projects", "/app/portal/messages"].includes(a.href)) return null;
    if (a.bodyFormat && !["plain", "markdown"].includes(a.bodyFormat)) return null;
    if (a.images && (!Array.isArray(a.images) || a.images.length > 4 || a.images.some(image => !image || !validAnnouncementImage(image.url) || typeof image.alt !== "string" || !image.alt.trim() || image.alt.length > 300))) return null;
    return { ...a, bodyFormat: a.bodyFormat ?? "plain", images: a.images ?? [] };
  } catch { return null; }
}
export function announcementActive(a: Announcement, now = new Date()) { return a.active && +new Date(a.expiresAt) > +now; }
