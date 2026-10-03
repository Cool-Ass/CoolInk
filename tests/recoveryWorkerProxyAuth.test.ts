import { NextRequest } from "next/server";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const identity = vi.hoisted(() => vi.fn());
vi.mock("../lib/githubWorkerAuth", () => ({ recoveryWorkerIdentity: identity, googleWorkerIdentity: vi.fn() }));
import { signedRecoveryMutation } from "../lib/recoveryWorkerProxyAuth";
import { proxy } from "../proxy";
function request(path = "/api/cron/recovery-health", headers: Record<string, string> = {}, method = "POST") {
  return new NextRequest("https://www.coolinktattoo.pl" + path, { method, headers: { authorization: "Bearer fixture-signed-identity", ...headers } });
}
beforeEach(() => { vi.stubEnv("VERCEL_ENV", "production"); identity.mockReset().mockResolvedValue("123:1"); });
afterEach(() => vi.unstubAllEnvs());
it("admits a verified monitor at the actual proxy boundary and forwards its independent authorization", async () => {
  const req = request(); const response = await proxy(req);
  expect(response.headers.get("x-middleware-next")).toBe("1");
  expect(identity).toHaveBeenCalledWith(req);
  expect(response.headers.get("x-middleware-request-authorization")).toBe("Bearer fixture-signed-identity");
});
it("rejects invalid identities at the actual proxy boundary", async () => {
  identity.mockResolvedValue(null);
  expect((await proxy(request())).status).toBe(403);
});
it("does not admit other routes, methods, browser requests or preview targets", async () => {
  for (const req of [request("/api/cron/reminders"), request("/api/admin/clients"), request(undefined, { cookie: "" }), request(undefined, { origin: "https://foreign.invalid" }), request(undefined, {}, "GET")]) expect(await signedRecoveryMutation(req)).toBe(false);
  vi.stubEnv("VERCEL_ENV", "preview"); expect(await signedRecoveryMutation(request())).toBe(false);
  expect(identity).not.toHaveBeenCalled();
});
