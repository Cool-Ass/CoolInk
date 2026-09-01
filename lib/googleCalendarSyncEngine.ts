import { decryptGoogleRefreshToken } from "@/lib/googleCalendarCrypto";
import { eventRange, googleCalendarRequest, refreshGoogleCalendarAccessToken, type GoogleEvent } from "@/lib/googleCalendar";
import { externalGoogleTitle, googleEventPayload } from "@/lib/googleCalendarSync";
import { prisma } from "@/lib/prisma";

type GoogleEventsResponse = { items?: GoogleEvent[]; nextPageToken?: string };
type SyncResult = { exported: number; imported: number; conflicts: number; remoteDeletes: number };

function eventPath(calendarId: string, eventId?: string) {
  const calendar = encodeURIComponent(calendarId);
  return eventId ? `/calendars/${calendar}/events/${encodeURIComponent(eventId)}` : `/calendars/${calendar}/events`;
}

/**
 * Admin-only synchronisation. CoolInk remains business source of truth: a
 * Google-side edit of a linked appointment is marked CONFLICT, never applied
 * silently. External busy events become private CalendarEvent records.
 */
export async function syncGoogleCalendarForAdmin(adminId: string): Promise<SyncResult> {
  const connection = await prisma.googleCalendarConnection.findUnique({ where: { adminUserId: adminId }, include: { selections: true } });
  if (!connection?.active || connection.encryptedRefreshToken === "REVOKED") throw new Error("Najpierw połącz Google Calendar.");
  const primary = connection.selections.find((selection) => selection.role === "primary" && selection.enabled);
  if (!primary) throw new Error("Wybierz primary sync calendar przed synchronizacją.");
  const token = await refreshGoogleCalendarAccessToken(decryptGoogleRefreshToken(connection.encryptedRefreshToken));
  const result: SyncResult = { exported: 0, imported: 0, conflicts: 0, remoteDeletes: 0 };
  const appointments = await prisma.appointment.findMany({ where: { endsAt: { gt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) } }, orderBy: { startsAt: "asc" } });

  for (const appointment of appointments) {
    const sync = await prisma.googleCalendarEventSync.findUnique({ where: { appointmentId: appointment.id } });
    if (appointment.status === "cancelled") {
      if (sync?.googleEventId) await googleCalendarRequest(token.access_token, eventPath(sync.googleCalendarId, sync.googleEventId), { method: "DELETE" });
      if (sync) await prisma.googleCalendarEventSync.update({ where: { id: sync.id }, data: { syncStatus: "DELETED_REMOTE", remoteDeletedAt: new Date(), lastSyncedAt: new Date() } });
      continue;
    }
    const payload = googleEventPayload({ startsAt: appointment.startsAt, endsAt: appointment.endsAt });
    const remote = sync?.googleEventId
      ? await googleCalendarRequest<GoogleEvent>(token.access_token, eventPath(sync.googleCalendarId, sync.googleEventId), { method: "PATCH", body: JSON.stringify(payload) })
      : await googleCalendarRequest<GoogleEvent>(token.access_token, eventPath(primary.calendarId), { method: "POST", body: JSON.stringify(payload) });
    if (!remote.id) throw new Error("Google Calendar nie zwrócił ID wydarzenia.");
    await prisma.googleCalendarEventSync.upsert({ where: { appointmentId: appointment.id }, update: { googleCalendarId: primary.calendarId, googleEventId: remote.id, googleUpdatedAt: remote.updated ? new Date(remote.updated) : null, localFingerprint: `${appointment.startsAt.toISOString()}|${appointment.endsAt.toISOString()}|${appointment.status}`, lastSyncedAt: new Date(), syncStatus: "SYNCED", syncError: null, remoteDeletedAt: null }, create: { connectionId: connection.id, appointmentId: appointment.id, googleCalendarId: primary.calendarId, googleEventId: remote.id, googleUpdatedAt: remote.updated ? new Date(remote.updated) : null, localFingerprint: `${appointment.startsAt.toISOString()}|${appointment.endsAt.toISOString()}|${appointment.status}`, lastSyncedAt: new Date() } });
    result.exported += 1;
  }

  // The primary calendar is both the CoolInk export target and a read source.
  // Without it, pre-existing Google events in the selected main calendar never
  // reached Calendar Hub, even though OAuth and manual sync reported success.
  const busySources = connection.selections.filter((selection) => selection.enabled && (selection.role === "primary" || selection.role === "busy"));
  const timeMin = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(); const timeMax = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
  for (const source of busySources) {
    // `showDeleted` is not guaranteed to return a recently deleted item when
    // this is a windowed full-list request rather than an incremental sync
    // token request. Keep track of what Google actually returned so a removed
    // external busy item cannot remain stale in Calendar Hub forever.
    const seenRemoteIds = new Set<string>();
    let pageToken: string | undefined;
    do {
      const page = pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : "";
      const events = await googleCalendarRequest<GoogleEventsResponse>(token.access_token, `${eventPath(source.calendarId)}?singleEvents=true&showDeleted=true&maxResults=2500&timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}${page}`);
      for (const remote of events.items || []) {
      if (!remote.id) continue;
      seenRemoteIds.add(remote.id);
      const existing = await prisma.googleCalendarEventSync.findUnique({ where: { googleCalendarId_googleEventId: { googleCalendarId: source.calendarId, googleEventId: remote.id } } });
      if (remote.status === "cancelled") {
        if (existing) {
          if (existing.calendarEventId) {
            await prisma.googleCalendarEventSync.update({ where: { id: existing.id }, data: { calendarEventId: null, syncStatus: "DELETED_REMOTE", remoteDeletedAt: new Date(), lastSyncedAt: new Date() } });
            await prisma.calendarEvent.delete({ where: { id: existing.calendarEventId } });
          } else await prisma.googleCalendarEventSync.update({ where: { id: existing.id }, data: { syncStatus: "DELETED_REMOTE", remoteDeletedAt: new Date(), lastSyncedAt: new Date() } });
          result.remoteDeletes += 1;
        }
        continue;
      }
      if (existing?.appointmentId) {
        const appointment = await prisma.appointment.findUnique({ where: { id: existing.appointmentId } });
        const range = eventRange(remote);
        if (appointment && appointment.startsAt.getTime() === range.startsAt.getTime() && appointment.endsAt.getTime() === range.endsAt.getTime()) {
          await prisma.googleCalendarEventSync.update({ where: { id: existing.id }, data: { syncStatus: "SYNCED", googleUpdatedAt: remote.updated ? new Date(remote.updated) : null, lastSyncedAt: new Date(), syncError: null } });
        } else {
          await prisma.googleCalendarEventSync.update({ where: { id: existing.id }, data: { syncStatus: "CONFLICT", syncError: "Zmiana po stronie Google wymaga ręcznego rozstrzygnięcia.", googleUpdatedAt: remote.updated ? new Date(remote.updated) : null } });
          result.conflicts += 1;
        }
        continue;
      }
      const range = eventRange(remote);
      const data = { title: externalGoogleTitle(remote), description: null, startsAt: range.startsAt, endsAt: range.endsAt, allDay: range.allDay, color: "#6B7280", icon: null, label: "GOOGLE_BUSY", isPublic: false };
      const calendarEvent = existing?.calendarEventId ? await prisma.calendarEvent.update({ where: { id: existing.calendarEventId }, data }) : await prisma.calendarEvent.create({ data });
      await prisma.googleCalendarEventSync.upsert({ where: { googleCalendarId_googleEventId: { googleCalendarId: source.calendarId, googleEventId: remote.id } }, update: { calendarEventId: calendarEvent.id, googleUpdatedAt: remote.updated ? new Date(remote.updated) : null, lastSyncedAt: new Date(), syncStatus: "SYNCED", syncError: null, remoteDeletedAt: null }, create: { connectionId: connection.id, calendarEventId: calendarEvent.id, googleCalendarId: source.calendarId, googleEventId: remote.id, googleUpdatedAt: remote.updated ? new Date(remote.updated) : null, lastSyncedAt: new Date() } });
        result.imported += 1;
      }
      pageToken = events.nextPageToken;
    }
    while (pageToken);

    // Never touch records linked to an Appointment: a Google deletion must
    // only create a conflict/recovery state for those. This cleanup applies
    // exclusively to private, imported `GOOGLE_BUSY` CalendarEvent records.
    const missingExternalEvents = await prisma.googleCalendarEventSync.findMany({
      where: {
        connectionId: connection.id,
        googleCalendarId: source.calendarId,
        appointmentId: null,
        calendarEventId: { not: null },
        remoteDeletedAt: null,
      },
      select: { id: true, calendarEventId: true, googleEventId: true },
    });
    for (const missing of missingExternalEvents) {
      const calendarEventId = missing.calendarEventId;
      if (seenRemoteIds.has(missing.googleEventId) || !calendarEventId) continue;
      await prisma.$transaction(async (tx) => {
        await tx.googleCalendarEventSync.update({ where: { id: missing.id }, data: { calendarEventId: null, syncStatus: "DELETED_REMOTE", remoteDeletedAt: new Date(), lastSyncedAt: new Date() } });
        await tx.calendarEvent.delete({ where: { id: calendarEventId } });
      });
      result.remoteDeletes += 1;
    }
  }
  await prisma.googleCalendarConnection.update({ where: { id: connection.id }, data: { lastSyncedAt: new Date() } });
  return result;
}
