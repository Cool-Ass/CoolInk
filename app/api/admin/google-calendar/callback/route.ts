import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { encryptGoogleRefreshToken } from "@/lib/googleCalendarCrypto";
import { exchangeGoogleCalendarCode } from "@/lib/googleCalendar";
import { GOOGLE_CALENDAR_STATE_COOKIE, isValidGoogleCalendarOAuthState } from "@/lib/googleCalendarOAuthState";

export async function GET(request: NextRequest) {
  const admin = await getCurrentAdmin(); const url = new URL(request.url); const state = url.searchParams.get("state"); const code = url.searchParams.get("code"); const saved = request.cookies.get(GOOGLE_CALENDAR_STATE_COOKIE)?.value;
  const errorUrl = new URL("/admin/settings?googleCalendar=error", request.url);
  const clearAndRedirect = (target: URL) => { const response = NextResponse.redirect(target); response.cookies.set(GOOGLE_CALENDAR_STATE_COOKIE, "", { path: "/api/admin/google-calendar", maxAge: 0 }); return response; };
  if (!admin || !code || !state || !isValidGoogleCalendarOAuthState({ adminId: admin.id, state, savedValue: saved })) return clearAndRedirect(errorUrl);
  try { const token = await exchangeGoogleCalendarCode(code, url.origin); const connection = await prisma.googleCalendarConnection.upsert({ where: { adminUserId: admin.id }, update: { encryptedRefreshToken: encryptGoogleRefreshToken(token.refresh_token), tokenExpiresAt: token.expires_in ? new Date(Date.now() + token.expires_in * 1000) : null, active: true, syncToken: null }, create: { adminUserId: admin.id, encryptedRefreshToken: encryptGoogleRefreshToken(token.refresh_token), tokenExpiresAt: token.expires_in ? new Date(Date.now() + token.expires_in * 1000) : null } }); return clearAndRedirect(new URL(`/admin/settings?googleCalendar=connected&connection=${connection.id}`, request.url)); } catch { return clearAndRedirect(errorUrl); }
}
