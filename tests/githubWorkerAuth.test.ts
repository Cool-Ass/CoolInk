import { beforeEach, describe, expect, it, vi } from "vitest";
const verify = vi.hoisted(() => vi.fn());
vi.mock("jose", () => ({ createRemoteJWKSet: () => "verified-jwks", jwtVerify: verify }));
import { googleWorkerIdentity, trustedGoogleWorkerClaims, GOOGLE_WORKER_AUDIENCE } from "../lib/githubWorkerAuth";
const claims = { repository_id: "1341372006", repository_owner_id: "319302461", repository: "Cool-Ass/CoolInk", ref: "refs/heads/main", workflow_ref: "Cool-Ass/CoolInk/.github/workflows/google-export-worker.yml@refs/heads/main", event_name: "schedule", runner_environment: "github-hosted", jti: "unique-run-token", run_id: "12345", run_attempt: "1" };
beforeEach(() => vi.resetAllMocks());
describe("GitHub export worker identity", () => {
  it("accepts only the exact immutable repository, owner and main workflow", () => {
    expect(trustedGoogleWorkerClaims(claims)).toBe(true);
    for (const key of Object.keys(claims).filter(key => key !== "jti")) expect(trustedGoogleWorkerClaims({ ...claims, [key]: "wrong" })).toBe(false);
    expect(trustedGoogleWorkerClaims({ ...claims, jti: "" })).toBe(false);
    expect(trustedGoogleWorkerClaims({ ...claims, event_name: "workflow_dispatch" })).toBe(true);
  });
  it("requires verified issuer, audience, algorithm and token age before claims", async () => {
    verify.mockResolvedValue({ payload: claims });
    expect(await googleWorkerIdentity(new Request("https://example.com", { headers: { authorization: "Bearer signed-token" } }))).toBe("12345:1");
    expect(verify).toHaveBeenCalledWith("signed-token", "verified-jwks", expect.objectContaining({ issuer: "https://token.actions.githubusercontent.com", audience: GOOGLE_WORKER_AUDIENCE, algorithms: ["RS256"], maxTokenAge: "5m" }));
  });
  it("rejects invalid signatures and missing bearer authentication", async () => {
    verify.mockRejectedValue(new Error("invalid signature"));
    expect(await googleWorkerIdentity(new Request("https://example.com", { headers: { authorization: "Bearer forged" } }))).toBeNull();
    expect(await googleWorkerIdentity(new Request("https://example.com"))).toBeNull();
  });
});
