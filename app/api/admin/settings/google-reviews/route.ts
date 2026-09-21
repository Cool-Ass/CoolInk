import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/adminApi";
import { prisma } from "@/lib/prisma";
import { isSameOrigin, rateLimit, tooManyRequests } from "@/lib/requestSecurity";
import { encryptGoogleRefreshToken } from "@/lib/googleCalendarCrypto";
import { GOOGLE_REVIEWS_KEY } from "@/lib/googleReviewsSettings";

export async function PUT(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const auth = await requireAdminApi("settings.manage");
  if (!auth.ok) return auth.response;
  const limit = await rateLimit(request, "google-reviews-settings", 10, 60_000, auth.admin.id);
  if (!limit.allowed) return tooManyRequests(limit);
  const body = await request.json().catch(() => null);
  if (!body || typeof body.placeId !== "string" || typeof body.mapsUrl !== "string" || typeof body.apiKey !== "string") return NextResponse.json({ error: "Nieprawidłowe ustawienia." }, { status: 400 });
  const placeId = body.placeId.trim(), mapsUrl = body.mapsUrl.trim(), apiKey = body.apiKey.trim();
  if (placeId.length > 255 || !/^[a-zA-Z0-9_-]*$/.test(placeId) || mapsUrl.length > 2000 || apiKey.length > 512 || (apiKey && !/^[a-zA-Z0-9_-]+$/.test(apiKey))) return NextResponse.json({ error: "Sprawdź Place ID i klucz API." }, { status: 400 });
  if (mapsUrl) {
    try { if (new URL(mapsUrl).protocol !== "https:") throw new Error(); }
    catch { return NextResponse.json({ error: "Link do wizytówki musi zaczynać się od https://." }, { status: 400 }); }
  }
  let encrypted: string | undefined;
  if (apiKey) {
    try { encrypted = encryptGoogleRefreshToken(apiKey); }
    catch { return NextResponse.json({ error: "Brak poprawnego klucza szyfrowania na serwerze (GOOGLE_CALENDAR_TOKEN_ENCRYPTION_KEYS). Klucz API nie został zapisany." }, { status: 503 }); }
  }
  await prisma.$transaction(async (tx) => {
    for (const [key, value] of [["googleReviews.placeId", placeId], ["googleReviews.mapsUrl", mapsUrl], ...(encrypted ? [[GOOGLE_REVIEWS_KEY, encrypted]] : [])]) {
      await tx.siteSetting.upsert({ where: { key }, update: { value }, create: { key, value } });
    }
    if (body.removeKey === true && !apiKey) await tx.siteSetting.deleteMany({ where: { key: GOOGLE_REVIEWS_KEY } });
    await tx.adminAuditLog.create({ data: { adminUserId: auth.admin.id, action: "google_reviews_settings_updated", targetType: "SiteSetting", targetId: "googleReviews", summary: "Zmieniono konfigurację opinii Google" } });
  });
  return NextResponse.json({ ok: true });
}
