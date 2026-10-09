import { NextResponse } from "next/server";
import { recoveryWorkerIdentity } from "@/lib/githubWorkerAuth";
import { prisma } from "@/lib/prisma";
import { reserveWebhook } from "@/lib/webhookSecurity";
import { RECOVERY_MONITOR_KEY, validateRecoveryHealth } from "@/lib/recoveryMonitor";
import { sendPushToAdmins } from "@/lib/webPush";
import { healthEvent } from "@/lib/operationalHealth";

export async function POST(request: Request) {
  if (process.env.VERCEL_ENV !== "production") return NextResponse.json({ error: "Unavailable" }, { status: 503 });
  if (request.headers.has("cookie") || request.headers.has("origin")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const eventId = await recoveryWorkerIdentity(request);
  if (!eventId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // Bounded stream, not Content-Length: chunked bodies have no trusted length.
  const reader = request.body?.getReader();
  if (!reader) return NextResponse.json({ error: "Invalid report" }, { status: 400 });
  let health;
  try {
    const chunks: Uint8Array[] = []; let size = 0;
    for (;;) {
      const { value, done } = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size > 2048) { void reader.cancel().catch(() => {}); return NextResponse.json({ error: "Report too large" }, { status: 413 }); }
      chunks.push(value);
    }
    health = validateRecoveryHealth(JSON.parse(Buffer.concat(chunks).toString("utf8")));
  } catch { return NextResponse.json({ error: "Invalid report" }, { status: 400 }); }
  finally { reader.releaseLock(); }
  const reserved = await reserveWebhook("github-recovery-health", eventId, request.headers.get("authorization") ?? "");
  if (reserved.duplicate) return NextResponse.json({ error: "Replay rejected" }, { status: 409 });
  try {
    const checkedAt = new Date().toISOString();
    await prisma.$transaction(async tx => {
      await tx.adminAuditLog.create({ data: healthEvent("recovery_monitor", health.healthy ? null : "RECOVERY_UNHEALTHY", "github_report") });
      await tx.siteSetting.upsert({ where: { key: RECOVERY_MONITOR_KEY }, create: { key: RECOVERY_MONITOR_KEY, value: JSON.stringify({ ...health, checkedAt, eventId }) }, update: { value: JSON.stringify({ ...health, checkedAt, eventId }) } });
      if (!health.healthy) await tx.adminAuditLog.create({ data: { action: "operational.recovery", targetType: "RecoveryMonitor", summary: "Kopia bezpieczeństwa lub test odtworzenia wymaga sprawdzenia.", metadata: JSON.stringify({ eventId, reasons: health.reasons }) } });
      await tx.webhookReceipt.update({ where: { id: reserved.receipt.id }, data: { status: "processed", processedAt: new Date() } });
    });
    let pushDelivered = false;
    if (!health.healthy) {
      try { const push = await sendPushToAdmins({ title: "Sprawdź kopię bezpieczeństwa", body: "Kopia lub test odtworzenia wymaga uwagi. Szczegóły w panelu studia.", url: "/admin", tag: "recovery-health" }); pushDelivered = push.configured && push.sent > 0; } catch { /* The owner dashboard remains the durable delivery channel. */ }
    }
    return NextResponse.json({ ok: true, persisted: true, healthy: health.healthy, pushDelivered }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    await prisma.webhookReceipt.update({ where: { id: reserved.receipt.id }, data: { status: "failed", error: "RECOVERY_REPORT_PERSISTENCE_FAILED", processedAt: new Date() } }).catch(() => {});
    return NextResponse.json({ ok: false, error: "RECOVERY_REPORT_PERSISTENCE_FAILED" }, { status: 503 });
  }
}
