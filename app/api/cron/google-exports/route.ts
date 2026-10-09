import { NextResponse } from "next/server";
import { googleWorkerIdentity } from "@/lib/githubWorkerAuth";
import { reserveWebhook } from "@/lib/webhookSecurity";
import { retryGoogleCalendarExports } from "@/lib/googleCalendarSyncEngine";
import { prisma } from "@/lib/prisma";
import { monitorGoogleQueue } from "@/lib/googleQueueHealth";
import { recordOperationalHealth } from "@/lib/operationalHealth";

export const maxDuration = 300;

export async function POST(request: Request) {
  // The signed workflow identity is the only authority; no cookies or static
  // shared secret are accepted. Preview deployments must not consume production work.
  if (process.env.VERCEL_ENV !== "production") return NextResponse.json({ error: "Unavailable" }, { status: 503 });
  if (request.headers.has("cookie") || request.headers.has("origin")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const eventId = await googleWorkerIdentity(request);
  if (!eventId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const reserved = await reserveWebhook("github-google-export", eventId, request.headers.get("authorization") ?? "");
  if (reserved.duplicate) return NextResponse.json({ error: "Replay rejected" }, { status: 409 });
  try {
    const result = await retryGoogleCalendarExports();
    const health = await monitorGoogleQueue();
    if (!health.healthy) {
      await recordOperationalHealth("google_calendar_sync", "GOOGLE_EXPORT_QUEUE_STALE", "export_worker");
      await prisma.webhookReceipt.update({ where: { id: reserved.receipt.id }, data: { status: "failed", error: "GOOGLE_EXPORT_QUEUE_STALE", processedAt: new Date() } });
      return NextResponse.json({ ok: false, error: "GOOGLE_EXPORT_QUEUE_STALE", eventId, ...health }, { status: 503 });
    }
    await prisma.webhookReceipt.update({ where: { id: reserved.receipt.id }, data: { status: "processed", processedAt: new Date() } });
    return NextResponse.json({ ok: true, ...result });
  } catch {
    await recordOperationalHealth("google_calendar_sync", "GOOGLE_EXPORT_WORKER_FAILED", "export_worker");
    await prisma.webhookReceipt.update({ where: { id: reserved.receipt.id }, data: { status: "failed", error: "GOOGLE_EXPORT_WORKER_FAILED", processedAt: new Date() } });
    console.error("google_export_worker_failed", { eventId });
    return NextResponse.json({ ok: false, error: "GOOGLE_EXPORT_WORKER_FAILED", eventId }, { status: 503 });
  }
}
