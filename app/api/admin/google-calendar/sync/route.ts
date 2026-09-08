import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isSameOrigin } from "@/lib/requestSecurity";
import { syncGoogleCalendarForAdmin } from "@/lib/googleCalendarSyncEngine";
import { GoogleCalendarApiError, isGoogleCalendarResourceGone } from "@/lib/googleCalendar";

function syncErrorMessage(error: unknown) {
  if (isGoogleCalendarResourceGone(error)) return "Wybrany kalendarz Google już nie istnieje. Wybierz „Zmień kalendarze” i wskaż aktywny kalendarz.";
  if (error instanceof GoogleCalendarApiError && (error.status === 401 || error.status === 403)) return "Google Calendar odrzucił dostęp. Połącz integrację ponownie i zaakceptuj wymagane uprawnienia.";
  if (error instanceof GoogleCalendarApiError && error.status === 429) return "Google Calendar chwilowo ograniczył liczbę operacji. Odczekaj minutę i spróbuj ponownie.";
  return error instanceof Error ? error.message : "Synchronizacja Google Calendar nie powiodła się.";
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Brak dostępu administratora." }, { status: 401 });
  const connection = await prisma.googleCalendarConnection.findUnique({ where: { adminUserId: admin.id } });
  if (!connection?.active) return NextResponse.json({ error: "Najpierw połącz Google Calendar." }, { status: 409 });
  if (!process.env.GOOGLE_CALENDAR_CLIENT_ID || !process.env.GOOGLE_CALENDAR_CLIENT_SECRET || !process.env.GOOGLE_CALENDAR_TOKEN_ENCRYPTION_KEY) return NextResponse.json({ error: "Brakuje server-side konfiguracji Google Calendar. Synchronizacja nie została uruchomiona." }, { status: 503 });
  try {
    return NextResponse.json({ ok: true, result: await syncGoogleCalendarForAdmin(admin.id) });
  } catch (error) {
    return NextResponse.json({ error: syncErrorMessage(error) }, { status: 409 });
  }
}
