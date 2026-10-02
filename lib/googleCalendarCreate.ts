import { createHash } from "node:crypto";
import { eventRange, GoogleCalendarApiError, googleCalendarRequest, type GoogleEvent } from "@/lib/googleCalendar";
import { GoogleSyncConflict } from "@/lib/googleCalendarConflict";
import { googleEventPayload } from "@/lib/googleCalendarSync";

/** Retrying a POST after a lost response adopts the same event instead of duplicating it. */
export async function createIdempotentGoogleEvent(token: string, calendarId: string, appointmentId: string, generation: string, payload: ReturnType<typeof googleEventPayload>) {
  const id = createHash("sha256").update(JSON.stringify([calendarId, appointmentId, generation])).digest("hex");
  const path = `/calendars/${encodeURIComponent(calendarId)}/events`;
  try {
    return await googleCalendarRequest<GoogleEvent>(token, path, { method: "POST", body: JSON.stringify({ ...payload, id }) });
  } catch (error) {
    if (!(error instanceof GoogleCalendarApiError) || error.status !== 409) throw error;
    const existing = await googleCalendarRequest<GoogleEvent>(token, `${path}/${id}`);
    if (existing.status === "cancelled") throw new GoogleSyncConflict("Poprzedni eksport usunięto w Google. Wymaga ręcznego wyjaśnienia.");
    const range = eventRange(existing);
    if (range.startsAt.getTime() !== new Date(payload.start.dateTime).getTime() || range.endsAt.getTime() !== new Date(payload.end.dateTime).getTime()) {
      throw new GoogleSyncConflict("Poprzedni eksport zmieniono w Google. Wymaga ręcznego wyjaśnienia.");
    }
    return existing;
  }
}
