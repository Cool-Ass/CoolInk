import { eventRange, GoogleCalendarApiError, googleCalendarRequest, type GoogleEvent } from "@/lib/googleCalendar";
import { googleEventPayload } from "@/lib/googleCalendarSync";

export class GoogleSyncConflict extends Error {}
type Link = { googleCalendarId: string; googleEventId: string; localFingerprint: string | null; googleUpdatedAt: Date | null };

// Compare BEFORE writing. If-Match also protects the interval between GET and PATCH.
export async function patchLinkedGoogleEvent(token: string, link: Link, payload: ReturnType<typeof googleEventPayload>) {
  const path = `/calendars/${encodeURIComponent(link.googleCalendarId)}/events/${encodeURIComponent(link.googleEventId)}`;
  const remote = await googleCalendarRequest<GoogleEvent>(token, path);
  if (remote.status === "cancelled") throw new GoogleSyncConflict("Wydarzenie usunięto w Google.");
  const range = eventRange(remote);
  const remoteRange = `${range.startsAt.toISOString()}|${range.endsAt.toISOString()}`;
  const desiredRange = `${new Date(payload.start.dateTime).toISOString()}|${new Date(payload.end.dateTime).toISOString()}`;
  if (remoteRange === desiredRange) return remote;
  const previousRange = link.localFingerprint?.split("|").slice(0, 2).join("|");
  if (!previousRange || remoteRange !== previousRange || !remote.etag) {
    throw new GoogleSyncConflict("Zmiana po stronie Google wymaga ręcznego rozstrzygnięcia.");
  }
  try {
    return await googleCalendarRequest<GoogleEvent>(token, path, { method: "PATCH", headers: { "If-Match": remote.etag }, body: JSON.stringify(payload) });
  } catch (error) {
    if (error instanceof GoogleCalendarApiError && error.status === 412) throw new GoogleSyncConflict("Wydarzenie zmieniono w trakcie synchronizacji.");
    throw error;
  }
}
