import { GoogleSyncConflict, patchLinkedGoogleEvent } from "@/lib/googleCalendarConflict";
import { decryptGoogleRefreshToken } from "@/lib/googleCalendarCrypto";
import { eventRange, googleCalendarRequest, isGoogleCalendarResourceGone, refreshGoogleCalendarAccessToken, type GoogleEvent } from "@/lib/googleCalendar";
import { externalGoogleTitle, googleEventPayload } from "@/lib/googleCalendarSync";
import { prisma } from "@/lib/prisma";

type GoogleEventsResponse = { items?: GoogleEvent[]; nextPageToken?: string };
type SyncResult = { exported: number; imported: number; conflicts: number; remoteDeletes: number; recovered: number };

// Existing appointments retain their original connection. Never route by updatedAt,
// which changes during a sync and used to silently switch Google accounts.
export async function unambiguousExportConnection() {
  const connections = await prisma.googleCalendarConnection.findMany({
    where: { active: true, encryptedRefreshToken: { not: "REVOKED" }, selections: { some: { role: "primary", enabled: true } } },
    include: { selections: true },
    take: 2,
  });
  if (connections.length > 1) throw new Error("Wiele aktywnych kalendarzy eksportu. Pozostaw jeden kalendarz główny studia.");
  return connections[0] ?? null;
}

function eventPath(calendarId: string, eventId?: string) {
  const calendar = encodeURIComponent(calendarId);
  return eventId ? `/calendars/${calendar}/events/${encodeURIComponent(eventId)}` : `/calendars/${calendar}/events`;
}

async function removeGoogleEvent(accessToken: string, calendarId: string, eventId: string) {
  try {
    await googleCalendarRequest(accessToken, eventPath(calendarId, eventId), { method: "DELETE" });
  } catch (error) {
    // Google documents 410 Gone for an event which has already been deleted.
    // That is the desired end state, so it must not abort the remaining sync.
    if (!isGoogleCalendarResourceGone(error)) throw error;
  }
}

async function createGoogleEvent(accessToken: string, calendarId: string, payload: ReturnType<typeof googleEventPayload>) {
  return googleCalendarRequest<GoogleEvent>(accessToken, eventPath(calendarId), {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/**
 * Fast, best-effort export used after a single appointment mutation. It keeps
 * the selected Google calendar current without running the much heavier busy
 * calendar import on every booking action.
 */
async function exportAppointmentToGoogle(appointmentId: string) {
  const appointment = await prisma.appointment.findUnique({ where: { id: appointmentId } });
  if (!appointment) return false;
  const sync = await prisma.googleCalendarEventSync.findUnique({ where: { appointmentId } });
  const connection = sync
    ? await prisma.googleCalendarConnection.findUnique({ where: { id: sync.connectionId }, include: { selections: true } })
    : await unambiguousExportConnection();
  if (!connection) {
    if (sync) throw new Error("Brak połączenia przypisanego do wizyty.");
    return false;
  }
  if (!connection.active || connection.encryptedRefreshToken === "REVOKED") throw new Error("Połączenie przypisane do wizyty jest nieaktywne.");
  const primary = connection.selections.find((selection) => selection.role === "primary" && selection.enabled);
  if (!primary) return false;
  const token = await refreshGoogleCalendarAccessToken(decryptGoogleRefreshToken(connection.encryptedRefreshToken));

  if (appointment.status === "cancelled") {
    if (sync?.googleEventId && !sync.remoteDeletedAt) await removeGoogleEvent(token.access_token, sync.googleCalendarId, sync.googleEventId);
    if (sync) await prisma.googleCalendarEventSync.update({ where: { id: sync.id }, data: { syncStatus: "DELETED_REMOTE", remoteDeletedAt: new Date(), lastSyncedAt: new Date(), syncError: null } });
    await prisma.googleCalendarConnection.update({ where: { id: connection.id }, data: { lastSyncedAt: new Date() } });
    return true;
  }

  const payload = googleEventPayload({ startsAt: appointment.startsAt, endsAt: appointment.endsAt });
  let remote: GoogleEvent;
  if (sync?.googleEventId && sync.googleCalendarId === primary.calendarId) {
    try {
      remote = await patchLinkedGoogleEvent(token.access_token, sync, payload);
    } catch (error) {
      if (!isGoogleCalendarResourceGone(error)) throw error;
      remote = await createGoogleEvent(token.access_token, primary.calendarId, payload);
    }
  } else {
    if (sync?.googleEventId) await removeGoogleEvent(token.access_token, sync.googleCalendarId, sync.googleEventId);
    remote = await createGoogleEvent(token.access_token, primary.calendarId, payload);
  }
  if (!remote.id) throw new Error("Google Calendar nie zwrócił ID wydarzenia.");
  await prisma.googleCalendarEventSync.upsert({
    where: { appointmentId },
    update: { connectionId: connection.id, googleCalendarId: primary.calendarId, googleEventId: remote.id, googleUpdatedAt: remote.updated ? new Date(remote.updated) : null, localFingerprint: `${appointment.startsAt.toISOString()}|${appointment.endsAt.toISOString()}|${appointment.status}`, lastSyncedAt: new Date(), syncStatus: "SYNCED", syncError: null, remoteDeletedAt: null },
    create: { connectionId: connection.id, appointmentId, googleCalendarId: primary.calendarId, googleEventId: remote.id, googleUpdatedAt: remote.updated ? new Date(remote.updated) : null, localFingerprint: `${appointment.startsAt.toISOString()}|${appointment.endsAt.toISOString()}|${appointment.status}`, lastSyncedAt: new Date() },
  });
  await prisma.googleCalendarConnection.update({ where: { id: connection.id }, data: { lastSyncedAt: new Date() } });
  return true;
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
  const result: SyncResult = { exported: 0, imported: 0, conflicts: 0, remoteDeletes: 0, recovered: 0 };
  const appointments = await prisma.appointment.findMany({ where: { endsAt: { gt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) } }, orderBy: { startsAt: "asc" } });

  for (const appointment of appointments) {
    const sync = await prisma.googleCalendarEventSync.findUnique({ where: { appointmentId: appointment.id } });
    if (sync && sync.connectionId !== connection.id) continue;
    if (!sync && (await unambiguousExportConnection())?.id !== connection.id) continue;
    if (appointment.status === "cancelled") {
      if (sync?.googleEventId && !sync.remoteDeletedAt) await removeGoogleEvent(token.access_token, sync.googleCalendarId, sync.googleEventId);
      if (sync) await prisma.googleCalendarEventSync.update({ where: { id: sync.id }, data: { syncStatus: "DELETED_REMOTE", remoteDeletedAt: new Date(), lastSyncedAt: new Date() } });
      continue;
    }
    const payload = googleEventPayload({ startsAt: appointment.startsAt, endsAt: appointment.endsAt });
    let remote: GoogleEvent;
    if (sync?.googleEventId && sync.googleCalendarId === primary.calendarId) {
      try {
        remote = await patchLinkedGoogleEvent(token.access_token, sync, payload);
      } catch (error) {
        if (error instanceof GoogleSyncConflict) {
          await prisma.googleCalendarEventSync.update({ where: { id: sync.id }, data: { syncStatus: "CONFLICT", syncError: error.message } });
          result.conflicts += 1;
          continue;
        }
        if (!isGoogleCalendarResourceGone(error)) throw error;
        remote = await createGoogleEvent(token.access_token, primary.calendarId, payload);
        result.recovered += 1;
      }
    } else {
      // A changed primary calendar makes the previous event id invalid in the
      // new calendar. Remove the old copy first, then create a correctly linked
      // event instead of persisting a mismatched calendar/event pair.
      if (sync?.googleEventId) {
        await removeGoogleEvent(token.access_token, sync.googleCalendarId, sync.googleEventId);
        result.recovered += 1;
      }
      remote = await createGoogleEvent(token.access_token, primary.calendarId, payload);
    }
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
      if (existing && existing.connectionId !== connection.id) continue;
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

// Durable retry marker precedes the external request. A newer mutation must not
// be acknowledged by an older worker finishing later.
export async function syncAppointmentToGoogle(appointmentId: string) {
  const key = `google_retry:${appointmentId}`;
  const value = JSON.stringify({ appointmentId, queuedAt: new Date().toISOString(), nonce: crypto.randomUUID() });
  await prisma.siteSetting.upsert({ where: { key }, update: { value }, create: { key, value } });
  try {
    const result = await exportAppointmentToGoogle(appointmentId);
    await prisma.siteSetting.deleteMany({ where: { key, value } });
    return result;
  } catch (error) {
    await prisma.googleCalendarEventSync.updateMany({ where: { appointmentId }, data: { syncStatus: error instanceof GoogleSyncConflict ? "CONFLICT" : "ERROR", syncError: error instanceof GoogleSyncConflict ? error.message : "Eksport nie powiódł się. Oczekuje na ponowienie." } });
    console.error("google_calendar_export_failed", { appointmentId });
    return false;
  }
}

export async function retryGoogleCalendarExports() {
  const pending = await prisma.siteSetting.findMany({ where: { key: { startsWith: "google_retry:" } }, orderBy: { updatedAt: "asc" }, take: 25, select: { key: true } });
  let synced = 0;
  for (const item of pending) if (await syncAppointmentToGoogle(item.key.slice("google_retry:".length))) synced += 1;
  return { checked: pending.length, synced };
}
