import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const m = vi.hoisted(() => ({ admin: vi.fn(), find: vi.fn(), exchange: vi.fn(), upsert: vi.fn() }));
vi.mock("@/lib/auth", () => ({ getCurrentAdmin: m.admin }));
vi.mock("@/lib/requestSecurity", () => ({ isSameOrigin: () => true, rateLimit: async () => ({ allowed: true }) }));
vi.mock("@/lib/prisma", () => ({ prisma: { googleCalendarConnection: { findUnique: m.find, upsert: m.upsert }, siteSetting: { count: async () => 0 } } }));
vi.mock("@/lib/googleCalendar", () => ({
  exchangeGoogleCalendarCode: m.exchange,
  googleCalendarAuthorizationUrl: () => "https://accounts.google.com/o/oauth2/auth",
}));
vi.mock("@/lib/googleCalendarSyncEngine", () => ({ syncGoogleCalendarForAdmin: vi.fn(), retryGoogleCalendarExports: vi.fn() }));
vi.mock("@/lib/googleCalendarCrypto", () => ({ encryptGoogleRefreshToken: () => "encrypted", decryptGoogleRefreshToken: vi.fn() }));
import { GET as connect } from "../app/api/admin/google-calendar/connect/route";
import { GET as callback } from "../app/api/admin/google-calendar/callback/route";
import { GET as calendars, PUT as selectCalendars } from "../app/api/admin/google-calendar/calendars/route";
import { GET as status } from "../app/api/admin/google-calendar/status/route";
import { POST as sync } from "../app/api/admin/google-calendar/sync/route";
import { POST as disconnect } from "../app/api/admin/google-calendar/disconnect/route";
import { GET as retries, POST as retry } from "../app/api/admin/google-calendar/retry/route";
const request = () => new Request("https://coolink.test/api/admin/google-calendar", { method: "POST", body: "{}" });
const operations = [() => connect(request()), calendars, () => selectCalendars(request()), status, () => sync(request()), () => disconnect(request()), retries, () => retry(request())];
beforeEach(() => { vi.clearAllMocks(); m.find.mockResolvedValue(null); m.exchange.mockResolvedValue({ refresh_token: "token" }); m.upsert.mockResolvedValue({ id: "connection" }); });
describe("Google settings authorization", () => {
  it.each(["manager", "artist", "receptionist"])("denies every endpoint to %s before data or OAuth access", async role => {
    m.admin.mockResolvedValue({ id: "admin", role });
    for (const operation of operations) expect((await operation())?.status).toBe(403);
    const result = await callback(new NextRequest("https://coolink.test/api/admin/google-calendar/callback?code=code&state=nonce", { headers: { cookie: "coolink_google_calendar_oauth_state=admin.nonce" } }));
    expect(result.headers.get("location")).toContain("googleCalendar=error");
    expect(m.find).not.toHaveBeenCalled();
    expect(m.exchange).not.toHaveBeenCalled();
    expect(m.upsert).not.toHaveBeenCalled();
  });
  it("requires authentication", async () => {
    m.admin.mockResolvedValue(null);
    for (const operation of operations) expect((await operation())?.status).toBe(401);
  });
  it("allows the owner and verifies the callback state", async () => {
    m.admin.mockResolvedValue({ id: "admin", role: "owner" });
    expect((await connect(request())).status).toBe(307);
    expect((await status()).status).toBe(200);
    const result = await callback(new NextRequest("https://coolink.test/api/admin/google-calendar/callback?code=code&state=nonce", { headers: { cookie: "coolink_google_calendar_oauth_state=admin.nonce" } }));
    expect(result.headers.get("location")).toContain("googleCalendar=connected");
    expect(m.upsert).toHaveBeenCalledOnce();
  });
});
