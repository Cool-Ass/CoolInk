import { afterEach, describe, expect, it, vi } from "vitest";
import { privacyBackupGate } from "../lib/privacyBackupGate";
afterEach(() => vi.unstubAllGlobals());
function responses(overrides: Record<string, unknown> = {}) {
  const now = Date.now();
  return [
    { head_branch: "main", path: ".github/workflows/backup.yml", status: "completed", conclusion: "success", head_sha: "verified", created_at: new Date(now - 600_000).toISOString(), ...overrides },
    { artifacts: [{ id: 12, name: "coolink-encrypted-backup-123", digest: "sha256:" + "a".repeat(64), expires_at: new Date(now + 86400_000).toISOString(), expired: false }] },
    { workflow_runs: [{ id: 456, head_branch: "main", head_sha: "verified", conclusion: "success", created_at: new Date(now - 300_000).toISOString() }] },
  ];
}
describe("privacy backup gate", () => {
  it("requires recent main artifact and a later matching-version restore", async () => {
    const fetch = vi.fn(); for (const data of responses()) fetch.mockResolvedValueOnce(Response.json(data));
    vi.stubGlobal("fetch", fetch);
    expect(await privacyBackupGate("123")).toEqual({ runId: "123", artifactId: "12", digest: "sha256:" + "a".repeat(64), drillRunId: "456" });
    expect(fetch.mock.calls.every(([url, options]) => String(url).startsWith("https://api.github.com/repos/Cool-Ass/CoolInk/actions/") && options.redirect === "error")).toBe(true);
  });
  it.each([{ head_branch: "test" }, { conclusion: "failure" }, { created_at: "invalid" }, { created_at: "2000-01-01" }])("fails closed for untrusted or stale backup %j", async change => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(Response.json(responses(change)[0])));
    await expect(privacyBackupGate("123")).rejects.toThrow();
  });
  it("rejects expired artifacts, mismatched restores and arbitrary targets", async () => {
    const data = responses(); data[1] = { artifacts: [] };
    const fetch = vi.fn(); for (const item of data) fetch.mockResolvedValueOnce(Response.json(item));
    vi.stubGlobal("fetch", fetch); await expect(privacyBackupGate("123")).rejects.toThrow();
    await expect(privacyBackupGate("https://evil.test")).rejects.toThrow();
    const changed = responses(); changed[2] = { workflow_runs: [{ id: 456, head_branch: "main", head_sha: "different", conclusion: "success", created_at: new Date().toISOString() }] };
    const fetch2 = vi.fn(); for (const item of changed) fetch2.mockResolvedValueOnce(Response.json(item));
    vi.stubGlobal("fetch", fetch2); await expect(privacyBackupGate("123")).rejects.toThrow();
  });
});
