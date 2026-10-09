import { describe, expect, it } from "vitest";
import { validateRecoveryHealth, readRecoveryMonitor, readRecoveryMonitorReceipt } from "../lib/recoveryMonitor";
describe("recovery dashboard health", () => {
  it("accepts only bounded fixed reasons and consistent health", () => {
    expect(validateRecoveryHealth({ healthy: true, reasons: [] })).toEqual({ healthy: true, reasons: [] });
    for (const data of [null, { healthy: true, reasons: ["BACKUP_MISSING_OR_STALE"] }, { healthy: false, reasons: [] }, { healthy: false, reasons: ["secret string"] }, { healthy: false, reasons: ["BACKUP_MISSING_OR_STALE", "BACKUP_MISSING_OR_STALE"] }]) expect(() => validateRecoveryHealth(data)).toThrow();
  });
  it("rejects missing, stale, future and invalid receipts", () => {
    const now = Date.now(); const data = { healthy: true, reasons: [], checkedAt: new Date(now).toISOString(), eventId: "12345:1" };
    expect(readRecoveryMonitor(JSON.stringify(data), now)?.healthy).toBe(true);
    expect(readRecoveryMonitor(undefined, now)).toBeNull();
    expect(readRecoveryMonitor(JSON.stringify(data), now + 2 * 3600_000 + 1)).toBeNull();
    expect(readRecoveryMonitorReceipt(JSON.stringify(data), now + 2 * 3600_000 + 1)?.checkedAt).toBe(data.checkedAt);
    expect(readRecoveryMonitorReceipt(JSON.stringify({ ...data, checkedAt: "invalid" }), now)).toBeNull();
    expect(readRecoveryMonitor(JSON.stringify({ ...data, checkedAt: "invalid" }), now)).toBeNull();
    expect(readRecoveryMonitor(JSON.stringify({ ...data, checkedAt: new Date(now + 120_000).toISOString() }), now)).toBeNull();
  });
});
