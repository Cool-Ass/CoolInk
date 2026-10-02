import { generateKeyPairSync } from "node:crypto";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const identity = vi.hoisted(() => vi.fn());
vi.mock("../lib/githubBackupAuth", () => ({ backupWorkflowIdentity: identity }));
import { signedBackupMutation } from "../lib/backupProxyAuth";
import { escrowRecipient } from "../lib/configEscrow";
import { proxy } from "../proxy";
const publicKey = generateKeyPairSync("rsa", { modulusLength: 3072 }).publicKey.export({ type: "spki", format: "der" }).toString("base64");
function request(path = "/api/cron/config-escrow", extra: Record<string, string> = {}, body = JSON.stringify({ publicKey })) {
  return new NextRequest("https://www.coolinktattoo.pl" + path, { method: "POST", headers: { authorization: "Bearer test-identity", "content-type": "application/json", ...extra }, body });
}
beforeEach(() => { vi.stubEnv("VERCEL_ENV", "production"); vi.stubEnv("BACKUP_CONFIG_ESCROW_ENABLED", "1"); identity.mockReset().mockResolvedValue("123:1"); });
afterEach(() => vi.unstubAllEnvs());
describe("backup authorization before browser CSRF", () => {
  it("verifies the key-bound identity in the real proxy without consuming the route body", async () => {
    const req = request(); const response = await proxy(req);
    expect(response.headers.get("x-middleware-next")).toBe("1");
    expect(identity).toHaveBeenCalledWith(req, escrowRecipient(publicKey).audience);
    expect(await req.json()).toEqual({ publicKey });
  });
  it("rejects forged signatures before reaching the escrow route", async () => {
    identity.mockResolvedValue(null);
    expect((await proxy(request())).status).toBe(403);
  });
  it("has no browser, cookie, other cron, arbitrary Bearer or disabled-environment exemption", async () => {
    for (const req of [request("/api/cron/reminders"), request("/api/admin/clients"), request("/api/cron/config-escrow", { origin: "https://evil.invalid" }), request("/api/cron/config-escrow", { cookie: "" }), request("/api/cron/config-escrow", {}, JSON.stringify({ publicKey, extra: true }))]) expect(await signedBackupMutation(req)).toBe(false);
    vi.stubEnv("VERCEL_ENV", "preview"); expect(await signedBackupMutation(request())).toBe(false);
    vi.stubEnv("VERCEL_ENV", "production"); vi.stubEnv("BACKUP_CONFIG_ESCROW_ENABLED", "0"); expect(await signedBackupMutation(request())).toBe(false);
    expect(identity).not.toHaveBeenCalled();
  });
  it("bounds both declared and streamed bodies before remote signature verification", async () => {
    expect(await signedBackupMutation(request("/api/cron/config-escrow", { "content-length": "3000" }))).toBe(false);
    expect(await signedBackupMutation(request("/api/cron/config-escrow", {}, " ".repeat(2049)))).toBe(false);
    expect(identity).not.toHaveBeenCalled();
  });
});
