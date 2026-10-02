import { beforeEach, describe, expect, it, vi } from "vitest";
const verify = vi.hoisted(() => vi.fn());
vi.mock("jose", () => ({ createRemoteJWKSet: () => "verified-jwks", jwtVerify: verify }));
import { backupWorkflowIdentity, trustedBackupClaims } from "../lib/githubBackupAuth";
const claims = { repository_id: "1341372006", repository_owner_id: "319302461", repository: "Cool-Ass/CoolInk", ref: "refs/heads/main", workflow_ref: "Cool-Ass/CoolInk/.github/workflows/backup.yml@refs/heads/main", event_name: "schedule", runner_environment: "github-hosted", jti: "unique-run-token", run_id: "12345", run_attempt: "1" };
beforeEach(() => vi.resetAllMocks());
describe("configuration backup identity", () => {
  it("rejects other repositories, owners, branches, workflows, runners and events", () => {
    expect(trustedBackupClaims(claims)).toBe(true);
    for (const key of Object.keys(claims)) expect(trustedBackupClaims({ ...claims, [key]: "" })).toBe(false);
    expect(trustedBackupClaims({ ...claims, event_name: "pull_request" })).toBe(false);
  });
  it("requires signature, issuer, key-bound audience, algorithm and short lifetime", async () => {
    verify.mockResolvedValue({ payload: claims });
    const req = new Request("https://example.com", { headers: { authorization: "Bearer signed" } });
    expect(await backupWorkflowIdentity(req, "key-bound-audience")).toBe("12345:1");
    expect(verify).toHaveBeenCalledWith("signed", "verified-jwks", expect.objectContaining({ audience: "key-bound-audience", algorithms: ["RS256"], maxTokenAge: "5m", issuer: "https://token.actions.githubusercontent.com" }));
    verify.mockRejectedValue(new Error("invalid"));
    expect(await backupWorkflowIdentity(req, "different-recipient")).toBeNull();
    expect(await backupWorkflowIdentity(new Request("https://example.com"), "key-bound-audience")).toBeNull();
  });
});
