import { prisma } from "@/lib/prisma";

export type OperationalModule = "google_calendar_sync" | "reminders_worker" | "recovery_monitor";
export const HEALTH_CODES = ["GOOGLE_SYNC_FAILED", "GOOGLE_EXPORT_PENDING", "GOOGLE_SYNC_CONFLICT", "GOOGLE_BUSY_REFRESH_FAILED", "GOOGLE_EXPORT_QUEUE_STALE", "GOOGLE_EXPORT_WORKER_FAILED", "REMINDERS_WORKER_FAILED", "RECOVERY_UNHEALTHY"] as const;
export type HealthCode = typeof HEALTH_CODES[number];
export function healthEvent(module: OperationalModule, errorCode: HealthCode | null, source: string) {
  return { action: `operational.${module}.${errorCode ? "failure" : "success"}`, targetType: "OperationalHealth", summary: `${module}: ${errorCode ?? "SUCCESS"}`, metadata: JSON.stringify({ errorCode, source }) };
}
// Audit history is append-only: success never removes the previous failure.
export async function recordOperationalHealth(module: OperationalModule, errorCode: HealthCode | null, source: string) {
  try { await prisma.adminAuditLog.create({ data: healthEvent(module, errorCode, source) }); return true; }
  catch { console.error("operational_health_not_persisted", { module }); return false; }
}
export function moduleHealth(success: { createdAt: Date } | null, failure: { createdAt: Date; metadata: string | null } | null) {
  let errorCode: HealthCode | null = null;
  try { const code = JSON.parse(failure?.metadata || "null")?.errorCode; if (HEALTH_CODES.includes(code)) errorCode = code; } catch { /* Unknown legacy metadata is not displayed. */ }
  const failed = Boolean(failure && (!success || failure.createdAt >= success.createdAt));
  return { status: failed ? "failed" as const : success ? "healthy" as const : "unknown" as const, lastSuccessAt: success?.createdAt ?? null, lastFailureAt: failure?.createdAt ?? null, errorCode: failed ? errorCode : null };
}
export async function readOperationalHealth(module: OperationalModule) {
  const [success, failure] = await Promise.all(["success", "failure"].map(status => prisma.adminAuditLog.findFirst({ where: { action: `operational.${module}.${status}` }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], select: { createdAt: true, metadata: true } })));
  return moduleHealth(success, failure);
}
