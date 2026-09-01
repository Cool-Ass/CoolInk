import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import { decryptGoogleRefreshToken } from "@/lib/googleCalendarCrypto";
import { googleCalendarRequest, refreshGoogleCalendarAccessToken, type GoogleCalendarSummary } from "@/lib/googleCalendar";
import { prisma } from "@/lib/prisma";
import { isSameOrigin } from "@/lib/requestSecurity";
import { syncGoogleCalendarForAdmin } from "@/lib/googleCalendarSyncEngine";

type CalendarListResponse = { items?: GoogleCalendarSummary[] };

async function connectedAdmin() {
  const admin = await getCurrentAdmin();
  if (!admin) return { error: NextResponse.json({ error: "Brak dostępu administratora." }, { status: 401 }) };
  const connection = await prisma.googleCalendarConnection.findUnique({ where: { adminUserId: admin.id } });
  if (!connection?.active || connection.encryptedRefreshToken === "REVOKED") return { error: NextResponse.json({ error: "Najpierw połącz Google Calendar." }, { status: 409 }) };
  return { admin, connection };
}

async function availableCalendars(encryptedRefreshToken: string) {
  const token = await refreshGoogleCalendarAccessToken(decryptGoogleRefreshToken(encryptedRefreshToken));
  const result = await googleCalendarRequest<CalendarListResponse>(token.access_token, "/users/me/calendarList?minAccessRole=reader");
  return (result.items || []).filter((calendar) => calendar.id && calendar.accessRole !== "freeBusyReader").map((calendar) => ({ id: calendar.id, summary: calendar.summary || calendar.id, primary: Boolean(calendar.primary), accessRole: calendar.accessRole || "reader" }));
}

export async function GET() {
  const result = await connectedAdmin();
  if ("error" in result) return result.error;
  try { return NextResponse.json({ calendars: await availableCalendars(result.connection.encryptedRefreshToken) }); }
  catch { return NextResponse.json({ error: "Nie udało się pobrać listy kalendarzy. Połącz integrację ponownie." }, { status: 502 }); }
}

export async function PUT(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const result = await connectedAdmin();
  if ("error" in result) return result.error;
  const body = await request.json().catch(() => null) as { primaryCalendarId?: unknown; busyCalendarIds?: unknown } | null;
  const primaryCalendarId = typeof body?.primaryCalendarId === "string" ? body.primaryCalendarId : "";
  const busyCalendarIds = Array.isArray(body?.busyCalendarIds) && body.busyCalendarIds.every((id) => typeof id === "string") ? [...new Set(body.busyCalendarIds as string[])] : null;
  if (!primaryCalendarId || !busyCalendarIds) return NextResponse.json({ error: "Wybierz primary calendar oraz poprawną listę kalendarzy blokujących terminy." }, { status: 400 });
  try {
    const calendars = await availableCalendars(result.connection.encryptedRefreshToken);
    const allowed = new Map(calendars.map((calendar) => [calendar.id, calendar]));
    const primary = allowed.get(primaryCalendarId);
    if (!primary || !["owner", "writer"].includes(primary.accessRole) || busyCalendarIds.some((id) => !allowed.has(id))) return NextResponse.json({ error: "Primary calendar musi mieć uprawnienia zapisu, a wszystkie kalendarze muszą należeć do autoryzowanego konta Google." }, { status: 400 });
    await prisma.$transaction(async (tx) => {
      await tx.googleCalendarConnection.update({ where: { id: result.connection.id }, data: { primaryCalendarId, accountEmail: primaryCalendarId.includes("@") ? primaryCalendarId : null } });
      await tx.googleCalendarSelection.deleteMany({ where: { connectionId: result.connection.id } });
      await tx.googleCalendarSelection.createMany({ data: [
        { connectionId: result.connection.id, calendarId: primaryCalendarId, summary: allowed.get(primaryCalendarId)?.summary, role: "primary", enabled: true },
        ...busyCalendarIds.filter((id) => id !== primaryCalendarId).map((id) => ({ connectionId: result.connection.id, calendarId: id, summary: allowed.get(id)?.summary, role: "busy", enabled: true })),
      ] });
    });
    // A new calendar selection must immediately import existing Google events.
    // Incremental/manual sync alone left a newly connected calendar empty in
    // Calendar Hub until another unrelated change happened.
    const sync = await syncGoogleCalendarForAdmin(result.admin.id);
    return NextResponse.json({ ok: true, sync });
  } catch { return NextResponse.json({ error: "Nie udało się zapisać wyboru kalendarzy." }, { status: 502 }); }
}
