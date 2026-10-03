export const RECOVERY_MONITOR_KEY = "internal.recoveryMonitor";
export const RECOVERY_REASONS = ["BACKUP_MISSING_OR_STALE", "BACKUP_ARTIFACT_UNAVAILABLE", "RESTORE_DRILL_MISSING_OR_STALE", "LATEST_RECOVERY_RUN_FAILED"] as const;
export type RecoveryMonitor = { checkedAt: string; eventId: string; healthy: boolean; reasons: string[] };
export function validateRecoveryHealth(input: unknown) {
  if (!input || typeof input !== "object") throw new Error("Invalid health report");
  const data = input as Record<string, unknown>;
  if (!Array.isArray(data.reasons) || data.reasons.length > RECOVERY_REASONS.length || data.reasons.some(reason => !RECOVERY_REASONS.includes(reason)) || new Set(data.reasons).size !== data.reasons.length || data.healthy !== (data.reasons.length === 0)) throw new Error("Invalid health report");
  return { healthy: data.healthy as boolean, reasons: data.reasons as string[] };
}
export function readRecoveryMonitor(value: string | undefined, now = Date.now()) {
  try {
    const data = JSON.parse(value || "null") as RecoveryMonitor;
    const health = validateRecoveryHealth(data);
    const age = now - Date.parse(data.checkedAt);
    if (!Number.isFinite(age) || age < -60_000 || age > 2 * 3600_000 || !/^\d{1,30}:\d{1,10}$/.test(data.eventId)) return null;
    return { ...health, checkedAt: data.checkedAt, eventId: data.eventId };
  } catch { return null; }
}
