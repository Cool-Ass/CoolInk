import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/adminApi";
import { googleCalendarAuthorizationUrl } from "@/lib/googleCalendar";
import { GOOGLE_CALENDAR_STATE_COOKIE, googleCalendarStateCookieValue } from "@/lib/googleCalendarOAuthState";

export async function GET(request: Request) {
  const auth = await requireAdminApi("settings.manage");
  if (!auth.ok) return auth.response;
  const admin = auth.admin;
  const state = randomBytes(32).toString("base64url");
  try { const response = NextResponse.redirect(googleCalendarAuthorizationUrl({ state, origin: new URL(request.url).origin })); response.cookies.set(GOOGLE_CALENDAR_STATE_COOKIE, googleCalendarStateCookieValue(admin.id, state), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/api/admin/google-calendar", maxAge: 600 }); return response; } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Nie skonfigurowano Google Calendar OAuth." }, { status: 503 }); }
}
