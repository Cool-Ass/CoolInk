import { describe, expect, it } from "vitest";
// @ts-expect-error Standalone workflow helper, independent of application runtime.
import { recoveryAgeHealth } from "../scripts/recoveryAgeHealth.mjs";
const now = Date.parse("2026-10-02T16:00:00Z");
const run = (path: string, hours = 1) => ({ id: 123, head_branch: "main", path: `.github/workflows/${path}.yml`, conclusion: "success", status: "completed", created_at: new Date(now - hours * 3600000).toISOString() });
const valid = () => ({ now, backup: run("backup"), drill: run("restore-drill"), artifact: { name: "coolink-encrypted-backup-123", expired: false, expires_at: new Date(now + 86400000).toISOString() } });
describe("recovery metadata age gates", () => {
  it("requires a trusted successful run and a present unexpired matching artifact", () => {
    expect(recoveryAgeHealth(valid()).healthy).toBe(true);
    for (const artifact of [null, { ...valid().artifact, expired: true }, { ...valid().artifact, name: "different" }, { ...valid().artifact, expires_at: "invalid" }]) expect(recoveryAgeHealth({ ...valid(), artifact }).healthy).toBe(false);
  });
  it("rejects missing, stale, future and branch-only evidence", () => {
    for (const backup of [null, run("backup", 37), run("backup", -1), { ...run("backup"), head_branch: "other" }, { ...run("backup"), conclusion: "failure" }]) expect(recoveryAgeHealth({ ...valid(), backup }).reasons).toContain("BACKUP_MISSING_OR_STALE");
    expect(recoveryAgeHealth({ ...valid(), drill: run("restore-drill", 2401) }).reasons).toContain("RESTORE_DRILL_MISSING_OR_STALE");
  });
});
