import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/adminApi";
import { isSameOrigin } from "@/lib/requestSecurity";
import { withClientMediaWrite } from "@/lib/clientMediaWrite";
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const access = await requireAdminApi("operations.manage"); if (!access.ok) return access.response;
  const { id } = await params, body = await request.json().catch(() => null);
  const expected = new Date(String(body?.expectedRequestedAt || ""));
  if (Number.isNaN(expected.getTime())) return NextResponse.json({ error: "Odśwież zgłoszenie." }, { status: 400 });
  const visit = await prisma.appointment.findUnique({ where: { id }, select: { project: { select: { id: true, clientId: true } } } });
  if (!visit) return NextResponse.json({ error: "Nie znaleziono sesji." }, { status: 404 });
  const updated = await withClientMediaWrite(visit.project.clientId, async tx => {
    const changed = await tx.appointment.updateMany({ where: { id, aftercareConsultationRequestedAt: expected, aftercareConsultationResolvedAt: null }, data: { aftercareConsultationResolvedAt: new Date() } });
    if (!changed.count) return false;
    await tx.projectActivity.create({ data: { projectId: visit.project.id, type: "aftercare_resolved", visibility: "client", message: "Studio oznaczyło konsultację po sesji jako obsłużoną." } });
    await tx.tattooProject.updateMany({ where: { id: visit.project.id, nextAction: "Odpowiedz na prośbę o konsultację gojenia" }, data: { nextAction: null, nextActionDueAt: null } });
    await tx.adminAuditLog.create({ data: { adminUserId: access.admin.id, action: "aftercare.resolved", targetType: "Appointment", targetId: id, summary: "Obsłużono zgłoszenie aftercare." } });
    return true;
  });
  return NextResponse.json(updated ? { ok: true } : { error: "Zgłoszenie zmieniło się. Odśwież stronę." }, { status: updated ? 200 : 409 });
}
