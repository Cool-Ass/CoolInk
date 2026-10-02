import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const identity = vi.hoisted(() => vi.fn());
vi.mock("../lib/githubWorkerAuth", () => ({ googleWorkerIdentity: identity }));
import { signedGoogleExportMutation } from "../lib/googleWorkerProxyAuth";
import { proxy } from "../proxy";
function request(path = "/api/cron/google-exports", headers: Record<string, string> = {}, method = "POST") {
  return new NextRequest("https://www.coolinktattoo.pl" + path, { method, headers: { authorization: "Bearer signed-identity", ...headers } });
}
beforeEach(() => { vi.stubEnv("VERCEL_ENV", "production"); identity.mockReset().mockResolvedValue("123:1"); });
afterEach(() => vi.unstubAllEnvs());
describe("Google export worker at the real proxy boundary", () => {
  it("admits only verified machine identity and preserves authorization for replay protection", async () => {
    const req = request(); const result = await proxy(req);
    expect(result.headers.get("x-middleware-next")).toBe("1");
    expect(identity).toHaveBeenCalledWith(req);
    expect(result.headers.get("x-middleware-request-authorization")).toBe("Bearer signed-identity");
  });
  it("rejects an invalid signature before the handler", async () => {
    identity.mockResolvedValue(null);
    expect((await proxy(request())).status).toBe(403);
  });
  it("rejects other endpoints, browsers and nonproduction without signature verification", async () => {
    for (const req of [request("/api/cron/reminders"), request("/api/admin/clients"), request(undefined, { cookie: "" }), request(undefined, { origin: "https://evil.invalid" }), request(undefined, {}, "GET")]) expect(await signedGoogleExportMutation(req)).toBe(false);
    vi.stubEnv("VERCEL_ENV", "preview"); expect(await signedGoogleExportMutation(request())).toBe(false);
    expect(identity).not.toHaveBeenCalled();
  });
});
