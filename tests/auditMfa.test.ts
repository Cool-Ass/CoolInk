import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  access: vi.fn(), find: vi.fn(), update: vi.fn(), audit: vi.fn(),
  origin: vi.fn(), password: vi.fn(), totp: vi.fn(), code: vi.fn(),
}));
vi.mock("@/lib/adminApi", () => ({ requireAdminApi: m.access }));
vi.mock("@/lib/auth", () => ({ verifyPassword: m.password }));
vi.mock("@/lib/prisma", () => {
  const db = { adminUser: { findUnique: m.find, updateMany: m.update }, adminAuditLog: { create: m.audit } };
  return { prisma: { ...db, $transaction: (fn: (tx: typeof db) => unknown) => fn(db) } };
});
vi.mock("@/lib/requestSecurity", () => ({
  isSameOrigin: m.origin, rateLimit: vi.fn(async () => ({ allowed: true })),
  tooManyRequests: () => new Response(null, { status: 429 }),
}));
vi.mock("@/lib/adminMfa", () => ({
  createMfaSecret: () => "new-secret", encryptMfaSecret: () => "new-encrypted",
  decryptMfaSecret: () => "secret", mfaOtpAuthUri: () => "otpauth://test",
  createRecoveryCodes: () => ({ plain: ["recovery-one"], stored: "hashed-recovery" }),
  verifyTotp: m.totp, verifyMfaCode: m.code,
}));
import { GET, POST } from "../app/api/admin/mfa/route";

const account = { id: "self", email: "test@example.test", sessionVersion: 2, mfaEnabled: false, mfaSecretEncrypted: "encrypted", mfaRecoveryCodes: null, passwordHash: "hash" };
const post = (action: string) => POST(new Request("https://coolink.test/api/admin/mfa", {
  method: "POST", headers: { "content-type": "application/json" },
  body: JSON.stringify({ action, code: "123456", password: "password", adminId: "other" }),
}));
beforeEach(() => {
  vi.clearAllMocks();
  m.access.mockResolvedValue({ ok: true, admin: { id: "self", role: "artist" } });
  m.find.mockResolvedValue({ ...account }); m.update.mockResolvedValue({ count: 1 });
  m.origin.mockReturnValue(true); m.password.mockResolvedValue(true);
  m.totp.mockReturnValue(true); m.code.mockReturnValue({ ok: true });
});
describe("audit MFA regressions", () => {
  it.each(["setup", "enable"])("cannot replace enabled MFA through %s", async action => {
    m.find.mockResolvedValue({ ...account, mfaEnabled: true });
    expect((await post(action)).status).toBe(409);
    expect(m.update).not.toHaveBeenCalled();
  });
  it("allows own-account MFA without requiring owner settings permission", async () => {
    expect((await GET()).status).toBe(200);
    expect(m.access).toHaveBeenCalledWith();
    await post("setup");
    expect(m.update.mock.calls[0][0].where.id).toBe("self");
  });
  it("does not issue recovery codes when a concurrent setup wins", async () => {
    m.update.mockResolvedValue({ count: 0 });
    const response = await post("enable");
    expect(response.status).toBe(409);
    expect(await response.json()).not.toHaveProperty("recoveryCodes");
    expect(m.audit).not.toHaveBeenCalled();
    expect(m.update.mock.calls[0][0].where).toMatchObject({ mfaEnabled: false, mfaSecretEncrypted: "encrypted", sessionVersion: 2 });
  });
  it("returns uncached recovery codes while revoking existing sessions on enable", async () => {
    const response = await post("enable");
    expect(await response.json()).toMatchObject({ signedOut: true, recoveryCodes: ["recovery-one"] });
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(m.update.mock.calls[0][0].data.sessionVersion).toEqual({ increment: 1 });
  });
  it("requires both password and MFA to disable protection", async () => {
    m.find.mockResolvedValue({ ...account, mfaEnabled: true }); m.password.mockResolvedValue(false);
    expect((await post("disable")).status).toBe(400);
    expect(m.update).not.toHaveBeenCalled();
  });
  it("rejects cross-origin changes before looking up the account", async () => {
    m.origin.mockReturnValue(false);
    expect((await post("setup")).status).toBe(403);
    expect(m.find).not.toHaveBeenCalled();
  });
});
