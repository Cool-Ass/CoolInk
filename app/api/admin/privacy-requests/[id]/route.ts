import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/adminApi";
import { prisma } from "@/lib/prisma";
import { isSameOrigin, rateLimit, tooManyRequests } from "@/lib/requestSecurity";
import { validatePrivacyReview } from "@/lib/privacyReview";
import { privacyRevision } from "@/lib/privacyRevision";

class ReviewConflict extends Error {}
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const access = await requireAdminApi("clients.delete");
  if (!access.ok) return access.response;
  const limit = await rateLimit(request, "privacy-review", 20, 15 * 60_000, access.admin.id);
  if (!limit.allowed) return tooManyRequests(limit);
  const reader = request.body?.getReader();
  if (!reader) return NextResponse.json({ error: "Brak formularza." }, { status: 400 });
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size > 8192) { void reader.cancel().catch(() => {}); return NextResponse.json({ error: "Formularz jest zbyt duży." }, { status: 413 }); }
      chunks.push(value);
    }
  } catch { return NextResponse.json({ error: "Nie udało się odczytać formularza." }, { status: 400 }); }
  finally { reader.releaseLock(); }
  const text = Buffer.concat(chunks).toString("utf8");
  let body; let plan;
  try { body = JSON.parse(text); plan = validatePrivacyReview(body); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Nieprawidłowy formularz." }, { status: 400 }); }
  if (typeof body.expectedRevision !== "string" || !/^[a-f0-9]{64}$/.test(body.expectedRevision)) return NextResponse.json({ error: "Odśwież wniosek przed zapisem." }, { status: 400 });
  const { id } = await params;
  try {
    await prisma.$transaction(async tx => {
      const current = await tx.accountDeletionRequest.findUnique({ where: { id } });
      const retentionReview = Boolean(current && ["completed_retained", "retention_review", "awaiting_retention_execution", "retention_retained"].includes(current.status));
      if (!current || (current.resolvedAt && !retentionReview) || !["pending", "reviewing", "awaiting_execution", "retained", "completed_retained", "retention_review", "awaiting_retention_execution", "retention_retained"].includes(current.status) || privacyRevision(current) !== body.expectedRevision) throw new ReviewConflict();
      if (retentionReview) {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${"privacy:" + current.clientId}, 0))`;
        await tx.$executeRaw`SELECT set_config('coolink.privacy_execution', ${id}, true)`;
      }
      const status = retentionReview ? { review: "retention_review", approve: "awaiting_retention_execution", retain: "retention_retained" }[plan.decision] : { review: "reviewing", approve: "awaiting_execution", retain: "retained" }[plan.decision];
      const note = JSON.stringify({ version: 1, ...plan, reviewerId: access.admin.id, reviewedAt: new Date().toISOString() });
      const updated = await tx.accountDeletionRequest.updateMany({ where: { id, status: current.status, note: current.note, resolvedAt: current.resolvedAt }, data: { status, note, ...(retentionReview ? { resolvedAt: null } : {}) } });
      if (updated.count !== 1) throw new ReviewConflict();
      await tx.adminAuditLog.create({ data: { adminUserId: access.admin.id, action: "privacy.review", targetType: "AccountDeletionRequest", targetId: id, summary: `Ocena wniosku: ${status}. Dane nie zostały usunięte.`, metadata: JSON.stringify({ decision: plan.decision, retainedScopes: plan.retainedScopes, retainUntil: plan.retainUntil }) } });
      if (plan.response && !retentionReview) await tx.clientNotification.create({ data: { clientId: current.clientId, type: "privacy", title: "Aktualizacja Twojego wniosku", body: plan.response, href: "/app/portal/profile" } });
    }, { isolationLevel: "Serializable" });
    return NextResponse.json({ ok: true, deleted: false }, { headers: { "Cache-Control": "no-store" } });
  } catch { return NextResponse.json({ error: "Wniosek zmienił się lub nie udało się zapisać oceny. Odśwież widok." }, { status: 409 }); }
}
