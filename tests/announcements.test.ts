import { beforeEach, describe, expect, it, vi } from "vitest";
import { announcementActive, parseAnnouncement, validateAnnouncement, visibleNotificationType } from "@/lib/announcementRules";
const m = vi.hoisted(() => ({ auth: vi.fn(), clientAuth: vi.fn(), origin: vi.fn(), limit: vi.fn(), find: vi.fn(), list: vi.fn(), count: vi.fn(), create: vi.fn(), update: vi.fn(), removeSetting: vi.fn(), clients: vi.fn(), notify: vi.fn(), audit: vi.fn(), remove: vi.fn(), dismiss: vi.fn(), read: vi.fn(), lock: vi.fn() }));
vi.mock("@/lib/adminApi", () => ({ requireAdminApi: m.auth }));
vi.mock("@/lib/clientAuth", () => ({ getCurrentClient: m.clientAuth }));
vi.mock("@/lib/requestSecurity", () => ({ isSameOrigin: m.origin, rateLimit: m.limit, tooManyRequests: () => new Response(null, { status: 429 }) }));
vi.mock("@/lib/prisma", () => ({ prisma: { $transaction: (run: (tx: unknown) => unknown) => run({ $queryRaw: m.lock, siteSetting: { findUnique: m.find, findMany: m.list, count: m.count, create: m.create, update: m.update, delete: m.removeSetting }, client: { findMany: m.clients }, clientNotification: { createMany: m.notify, deleteMany: m.remove, upsert: m.dismiss, updateMany: m.read }, adminAuditLog: { create: m.audit } }) } }));
import { POST, PATCH } from "@/app/api/admin/announcements/route";
import { PATCH as dismiss } from "@/app/api/client/announcements/route";
const id = "afba4826-3caf-4fb6-b73c-5430da21cb44";
const payload = () => ({ id, title: "Wolne terminy", body: "Nowe miejsca ✨", href: "/app/portal/calendar", notify: false, expiresAt: new Date(Date.now() + 86400_000).toISOString() });
const req = (body: unknown) => new Request("http://localhost/api/admin/announcements", { method: "POST", body: JSON.stringify(body) });
const stored = () => ({ ...payload(), active: true, createdAt: new Date().toISOString() });
beforeEach(() => { vi.clearAllMocks(); m.auth.mockResolvedValue({ ok: true, admin: { id: "owner" } }); m.clientAuth.mockResolvedValue({ id: "own-client" }); m.origin.mockReturnValue(true); m.limit.mockResolvedValue({ allowed: true }); m.find.mockResolvedValue(null); m.list.mockResolvedValue([]); m.count.mockResolvedValue(0); m.clients.mockResolvedValue([{ id: "one" }]); });
describe("client announcements", () => {
  it("validates expiry, lengths and only internal portal destinations", () => {
    expect(validateAnnouncement(payload()).body).toContain("✨");
    for (const extra of [{ href: "javascript:alert(1)" }, { href: "//evil.test" }, { title: "" }, { body: "x".repeat(2001) }, { notify: "true" }, { expiresAt: "bad" }, { expiresAt: new Date(0).toISOString() }, { id: "bad" }]) expect(() => validateAnnouncement({ ...payload(), ...extra })).toThrow();
    expect(parseAnnouncement("bad")).toBeNull(); expect(announcementActive({ ...stored(), active: false })).toBe(false);
    expect(announcementActive({ ...stored(), expiresAt: new Date(0).toISOString() })).toBe(false);
    expect(visibleNotificationType.not.startsWith).toBe("announcement-dismissed:");
  });
  it("requires permission, origin and rate limit before writes", async () => {
    m.origin.mockReturnValue(false); expect((await POST(req(payload()))).status).toBe(403);
    m.origin.mockReturnValue(true); m.auth.mockResolvedValue({ ok: false, response: new Response(null, { status: 403 }) }); expect((await POST(req(payload()))).status).toBe(403);
    m.auth.mockResolvedValue({ ok: true, admin: { id: "owner" } }); m.limit.mockResolvedValue({ allowed: false }); expect((await POST(req(payload()))).status).toBe(429);
    expect(m.auth).toHaveBeenCalledWith("content.manage"); expect(m.create).not.toHaveBeenCalled();
  });
  it("publishes silently without creating recipient notifications", async () => {
    expect((await POST(req(payload()))).status).toBe(200); expect(m.create).toHaveBeenCalledOnce(); expect(m.notify).not.toHaveBeenCalled(); expect(m.clients).not.toHaveBeenCalled(); expect(m.audit).toHaveBeenCalledOnce();
  });
  it("fans out only opted-in in-app bell once; identical retry does not send twice", async () => {
    const input = { ...payload(), notify: true };
    expect((await POST(req(input))).status).toBe(200); expect(m.notify).toHaveBeenCalledOnce();
    expect(m.clients).toHaveBeenCalledWith(expect.objectContaining({ where: { supabaseUserId: { not: null }, deletionRequest: null }, take: 5001 }));
    m.find.mockResolvedValue({ value: JSON.stringify({ ...input, active: true, createdAt: new Date().toISOString() }) });
    const retry = await POST(req(input)); expect((await retry.json()).duplicate).toBe(true); expect(m.notify).toHaveBeenCalledOnce();
    expect((await POST(req({ ...input, title: "Changed" }))).status).toBe(409);
  });
  it("does not expose database errors", async () => {
    m.create.mockRejectedValueOnce(new Error("private-db-host password")); const r = await POST(req(payload())); expect(r.status).toBe(503); expect(await r.text()).not.toContain("private-db-host");
  });
  it("deactivates and removes only that announcement bell type", async () => {
    m.find.mockResolvedValue({ value: JSON.stringify(stored()) }); expect((await PATCH(req({ id }))).status).toBe(200);
    expect(m.remove).toHaveBeenCalledWith({ where: { type: `announcement:${id}` } }); expect(JSON.parse(m.update.mock.calls[0][0].data.value).active).toBe(false);
  });
  it("dismissal derives owner from session, is idempotent and marks only own bell", async () => {
    m.find.mockResolvedValue({ value: JSON.stringify(stored()) }); expect((await dismiss(req({ id, clientId: "victim" }))).status).toBe(200);
    expect(m.dismiss).toHaveBeenCalledWith(expect.objectContaining({ where: { id: `dismiss:own-client:${id}` }, create: expect.objectContaining({ clientId: "own-client", readAt: expect.any(Date) }) }));
    expect(m.read).toHaveBeenCalledWith(expect.objectContaining({ where: { clientId: "own-client", type: `announcement:${id}`, readAt: null } }));
  });
  it("refuses expired, unknown, cross-origin and anonymous dismissal", async () => {
    expect((await dismiss(req({ id }))).status).toBe(404);
    m.find.mockResolvedValue({ value: JSON.stringify({ ...stored(), active: false }) }); expect((await dismiss(req({ id }))).status).toBe(404);
    m.origin.mockReturnValue(false); expect((await dismiss(req({ id }))).status).toBe(403);
    m.origin.mockReturnValue(true); m.clientAuth.mockResolvedValue(null); expect((await dismiss(req({ id }))).status).toBe(401); expect(m.dismiss).not.toHaveBeenCalled();
  });
});
