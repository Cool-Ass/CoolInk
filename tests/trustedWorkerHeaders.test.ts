import { afterEach, expect, it, vi } from "vitest";
import { trustedWorkerHeaders } from "../scripts/trustedWorkerHeaders.mjs";
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
it("masks two distinct identities and binds each to its independent audience", async () => {
  vi.stubEnv("ACTIONS_ID_TOKEN_REQUEST_URL", "https://identity.example.test/token");
  vi.stubEnv("ACTIONS_ID_TOKEN_REQUEST_TOKEN", "fixture-request-token");
  const calls = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ value: "fixture-app" }) }).mockResolvedValueOnce({ ok: true, json: async () => ({ value: "fixture-edge" }) });
  vi.stubGlobal("fetch", calls); const mask = vi.fn();
  const audience = "https://www.coolinktattoo.pl/api/cron/recovery-health";
  expect(await trustedWorkerHeaders(audience, mask)).toEqual({ Authorization: "Bearer fixture-app", "x-vercel-trusted-oidc-idp-token": "fixture-edge" });
  expect(new URL(calls.mock.calls[0][0]).searchParams.get("audience")).toBe(audience);
  expect(new URL(calls.mock.calls[1][0]).searchParams.get("audience")).toBe("https://github.com/Cool-Ass");
  expect(mask.mock.calls.flat()).toEqual(["fixture-app", "fixture-edge"]);
  expect(calls.mock.calls[0][1]).toMatchObject({ redirect: "error" });
});
it("rejects arbitrary audiences before requesting an identity", async () => {
  const calls = vi.fn(); vi.stubGlobal("fetch", calls);
  await expect(trustedWorkerHeaders("https://foreign.example.test", vi.fn())).rejects.toThrow();
  expect(calls).not.toHaveBeenCalled();
});
