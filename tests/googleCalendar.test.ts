import { randomBytes } from "crypto";
import { afterEach, describe, expect, it } from "vitest";
import { decryptGoogleRefreshToken, encryptGoogleRefreshToken } from "../lib/googleCalendarCrypto";
import { eventRange, googleCalendarRedirectUri } from "../lib/googleCalendar";
import { GOOGLE_CALENDAR_STATE_COOKIE, googleCalendarStateCookieValue, isValidGoogleCalendarOAuthState } from "../lib/googleCalendarOAuthState";
import { appointmentFingerprint, decideGoogleSync, googleEventPayload } from "../lib/googleCalendarSync";

const previousKey = process.env.GOOGLE_CALENDAR_TOKEN_ENCRYPTION_KEY;
const previousRedirect = process.env.GOOGLE_CALENDAR_REDIRECT_URI;
afterEach(() => {
  if (previousKey === undefined) delete process.env.GOOGLE_CALENDAR_TOKEN_ENCRYPTION_KEY; else process.env.GOOGLE_CALENDAR_TOKEN_ENCRYPTION_KEY = previousKey;
  if (previousRedirect === undefined) delete process.env.GOOGLE_CALENDAR_REDIRECT_URI; else process.env.GOOGLE_CALENDAR_REDIRECT_URI = previousRedirect;
});

describe("Google Calendar security primitives", () => {
  it("encrypts refresh tokens with authenticated AES-256-GCM and rejects tampering", () => {
    process.env.GOOGLE_CALENDAR_TOKEN_ENCRYPTION_KEY = randomBytes(32).toString("base64");
    const encrypted = encryptGoogleRefreshToken("refresh-token-secret");
    expect(encrypted).not.toContain("refresh-token-secret");
    expect(decryptGoogleRefreshToken(encrypted)).toBe("refresh-token-secret");
    expect(() => decryptGoogleRefreshToken(`${encrypted}x`)).toThrow();
  });

  it("binds an OAuth state nonce to the initiating administrator", () => {
    const saved = googleCalendarStateCookieValue("admin-a", "nonce");
    expect(GOOGLE_CALENDAR_STATE_COOKIE).toBe("coolink_google_calendar_oauth_state");
    expect(isValidGoogleCalendarOAuthState({ adminId: "admin-a", state: "nonce", savedValue: saved })).toBe(true);
    expect(isValidGoogleCalendarOAuthState({ adminId: "admin-b", state: "nonce", savedValue: saved })).toBe(false);
    expect(isValidGoogleCalendarOAuthState({ adminId: "admin-a", state: "other", savedValue: saved })).toBe(false);
  });
});

describe("Google Calendar mapping and conflict safety", () => {
  const start = new Date("2026-09-10T10:00:00.000Z");
  const end = new Date("2026-09-10T11:00:00.000Z");
  const fingerprint = appointmentFingerprint({ startsAt: start, endsAt: end, status: "CONFIRMED" });

  it("keeps local timing as source of truth for an unchanged remote event", () => {
    expect(decideGoogleSync({ localUpdatedAt: new Date("2026-09-10T08:00:00.000Z"), lastSyncedAt: new Date("2026-09-10T09:00:00.000Z"), localFingerprint: fingerprint, currentFingerprint: fingerprint })).toBe("KEEP_COOLINK");
  });
  it("detects a simultaneous local and remote change as a conflict", () => {
    expect(decideGoogleSync({ localUpdatedAt: new Date("2026-09-10T11:00:00.000Z"), googleUpdatedAt: new Date("2026-09-10T11:30:00.000Z"), lastSyncedAt: new Date("2026-09-10T09:00:00.000Z"), localFingerprint: fingerprint, currentFingerprint: "changed" })).toBe("CONFLICT");
  });
  it("records remote deletion without deleting the CoolInk appointment", () => {
    expect(decideGoogleSync({ remoteDeleted: true, localUpdatedAt: start, currentFingerprint: fingerprint })).toBe("REMOTE_DELETED");
  });
  it("uses a privacy-safe event payload and preserves timezone", () => {
    const payload = googleEventPayload({ startsAt: start, endsAt: end, title: "CoolInk — Wizyta" });
    expect(payload.start.timeZone).toBe("Europe/Warsaw");
    expect(payload.description).not.toMatch(/klient|tatuaż|inspiracj/i);
  });
  it("maps Google all-day ranges without inventing 30-minute slots", () => {
    const range = eventRange({ id: "all-day", start: { date: "2026-09-10" }, end: { date: "2026-09-11" } });
    expect(range.allDay).toBe(true);
    expect(range.endsAt.getTime() - range.startsAt.getTime()).toBe(24 * 60 * 60 * 1000);
  });
  it("uses an explicit redirect URI override only when configured", () => {
    process.env.GOOGLE_CALENDAR_REDIRECT_URI = "http://localhost:3000/api/admin/google-calendar/callback";
    expect(googleCalendarRedirectUri("https://www.coolinktattoo.pl")).toBe("http://localhost:3000/api/admin/google-calendar/callback");
  });
});
