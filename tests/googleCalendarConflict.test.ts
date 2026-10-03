import { afterEach, describe, expect, it, vi } from "vitest";
import { GoogleSyncConflict, patchLinkedGoogleEvent } from "../lib/googleCalendarConflict";
import { googleEventPayload } from "../lib/googleCalendarSync";
const start = "2026-10-01T10:00:00.000Z", end = "2026-10-01T11:00:00.000Z";
const link = { googleCalendarId: "cal", googleEventId: "event", localFingerprint: `${start}|${end}|confirmed`, googleUpdatedAt: null };
const payload = googleEventPayload({ startsAt: new Date("2026-10-02T10:00:00Z"), endsAt: new Date("2026-10-02T11:00:00Z") });
const remote = { id: "event", etag: '"v1"', start: { dateTime: start }, end: { dateTime: end } };
afterEach(() => vi.unstubAllGlobals());
describe("Google conflict before export", () => {
  it("never patches a remotely moved event", async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json({ ...remote, start: { dateTime: "2026-10-01T10:30:00Z" } }));
    vi.stubGlobal("fetch", fetch);
    await expect(patchLinkedGoogleEvent("token", link, payload)).rejects.toBeInstanceOf(GoogleSyncConflict);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("conditions writes on the version read and surfaces concurrent modification", async () => {
    const fetch = vi.fn().mockResolvedValueOnce(Response.json(remote)).mockResolvedValueOnce(Response.json({}, { status: 412 }));
    vi.stubGlobal("fetch", fetch);
    await expect(patchLinkedGoogleEvent("token", link, payload)).rejects.toBeInstanceOf(GoogleSyncConflict);
    expect(fetch.mock.calls[1][1].headers["If-Match"]).toBe('"v1"');
  });
  it("does not rewrite an already matching event", async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json({ ...remote, start: payload.start, end: payload.end }));
    vi.stubGlobal("fetch", fetch);
    await patchLinkedGoogleEvent("token", link, payload);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
