import { beforeEach, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({ find: vi.fn(), update: vi.fn(), audit: vi.fn(), token: vi.fn() }));
vi.mock("@/lib/prisma", () => {
  const db = { adminUser: { findUnique: m.find, updateMany: m.update }, adminAuditLog: { create: m.audit } };
  return { prisma: { ...db, $transaction: (fn: (tx: typeof db) => unknown) => fn(db) } };
});
vi.mock("@/lib/auth", () => ({ verifyPassword: async () => true }));
vi.mock("@/lib/session", () => ({ createSessionToken: m.token, SESSION_COOKIE: "session", sessionCookieOptions: { path: "/" } }));
vi.mock("@/lib/adminMfa", () => ({ decryptMfaSecret: () => "secret", verifyMfaCode: () => ({ ok: true, remainingRecoveryCodes: "remaining" }) }));
vi.mock("@/lib/requestSecurity", () => ({ isSameOrigin: () => true, rateLimit: async () => ({ allowed: true }), setRateLimitHeaders: (r: Response) => r, tooManyRequests: () => new Response(null, { status: 429 }) }));
import { POST } from "../app/api/admin/login/route";

const account = { id: "staff", email: "staff@example.test", passwordHash: "hash", mfaEnabled: true, mfaSecretEncrypted: "encrypted", mfaRecoveryCodes: "original", sessionVersion: 3 };
const login = () => POST(new Request("https://coolink.test/api/admin/login", { method: "POST", body: JSON.stringify({ email: account.email, password: "password", mfaCode: "one-use" }) }));
beforeEach(() => {
  vi.clearAllMocks(); m.find.mockResolvedValue(account); m.token.mockResolvedValue("signed");
});
it("only one simultaneous login can consume a recovery code", async () => {
  let consumed = false;
  m.update.mockImplementation(async () => {
    if (consumed) return { count: 0 };
    consumed = true; return { count: 1 };
  });
  const responses = await Promise.all([login(), login()]);
  expect(responses.map(r => r.status).sort()).toEqual([200, 401]);
  expect(m.token).toHaveBeenCalledTimes(1);
  expect(m.audit).toHaveBeenCalledTimes(1);
  expect(m.update.mock.calls[0][0].where).toEqual({ id: account.id, mfaEnabled: true, sessionVersion: 3, mfaSecretEncrypted: "encrypted", mfaRecoveryCodes: "original" });
  expect(responses.find(r => r.status === 401)?.headers.has("set-cookie")).toBe(false);
});
it("does not issue a session after concurrent MFA replacement or revocation", async () => {
  m.update.mockResolvedValue({ count: 0 });
  expect((await login()).status).toBe(401);
  expect(m.token).not.toHaveBeenCalled();
  expect(m.audit).not.toHaveBeenCalled();
});
