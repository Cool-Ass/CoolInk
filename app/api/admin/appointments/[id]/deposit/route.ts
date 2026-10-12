import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/adminApi";
import { prisma } from "@/lib/prisma";
import { lockBookingCalendar } from "@/lib/bookingRules";
import { isSameOrigin, rateLimit, tooManyRequests } from "@/lib/requestSecurity";
import { validateVisitDeposit } from "@/lib/visitDeposit";
import { formatCoolinkDateTime } from "@/lib/dateTime";
import { projectStatusAfterAppointmentChange } from "@/lib/projectLifecycle";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const access = await requireAdminApi("finance.manage");
  if (!access.ok) return access.response;
  const limit = await rateLimit(request, "visit-deposit", 20, 60_000, access.admin.id);
  if (!limit.allowed) return tooManyRequests(limit);
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const assigning = body?.action === "assign_legacy";
  let parsed: ReturnType<typeof validateVisitDeposit> | undefined;
  try { if (!assigning) parsed = validateVisitDeposit(body); }
  catch (error) { return NextResponse.json({ error: (error as Error).message }, { status: 400 }); }
  try {
    const visit = await prisma.$transaction(async tx => {
      await lockBookingCalendar(tx);
      const current = await tx.appointment.findUnique({ where: { id }, include: { project: true } });
      if (!current) throw new Error("Nie znaleziono wizyty.");
      if (typeof body?.expectedUpdatedAt !== "string" || body.expectedUpdatedAt !== current.updatedAt.toISOString()) throw new Error("Dane wizyty zmieniły się. Odśwież widok przed zapisem.");
      if (current.project.kind !== "tattoo" || (current.serviceType && current.serviceType !== "tattoo")) throw new Error("Zadatek dotyczy wizyty tatuażu.");
      const source = current.project;
      if (assigning && source.depositAssignedAppointmentId === id) return current;
      if (assigning && (source.depositAssignedAppointmentId || source.depositStatus === "not_required" || !source.depositAmount || current.depositStatus !== "not_required" || current.depositAmount !== null)) throw new Error("Ten zadatek został już przypisany albo wizyta ma własny zadatek.");
      const next = assigning ? { depositStatus: source.depositStatus, depositAmount: source.depositAmount, depositPaymentMethod: source.depositPaymentMethod } : parsed!;
      if (!assigning && !source.depositAssignedAppointmentId && source.depositStatus !== "not_required" && source.depositAmount) throw new Error("Najpierw przypisz dotychczasowy zadatek projektu do właściwej wizyty.");
      if ((["completed", "cancelled", "no_show"].includes(current.status) || ["completed", "cancelled"].includes(source.status)) && next.depositStatus === "awaiting") throw new Error("Nie żądaj wpłaty dla zakończonej lub anulowanej wizyty.");
      const updated = await tx.appointment.update({ where: { id }, data: { ...next, depositPaidAt: assigning ? source.depositPaidAt : next.depositStatus === "paid" ? current.depositPaidAt ?? new Date() : current.depositPaidAt } });
      if (assigning) await tx.tattooProject.update({ where: { id: current.projectId }, data: { depositAssignedAppointmentId: id } });
      const sessions = await tx.appointment.findMany({ where: { projectId: current.projectId }, select: { status: true, depositStatus: true } });
      await tx.tattooProject.update({ where: { id: current.projectId }, data: { status: projectStatusAfterAppointmentChange(sessions, "not_required", source.status) } });
      await tx.adminAuditLog.create({ data: { adminUserId: access.admin.id, action: assigning ? "deposit.assign_legacy" : "appointment.deposit_update", targetType: "Appointment", targetId: id, summary: assigning ? "Przypisano istniejący zadatek projektu do wybranej wizyty" : "Zaktualizowano zadatek wizyty", metadata: JSON.stringify({ projectId: current.projectId, before: { status: current.depositStatus, amount: current.depositAmount, method: current.depositPaymentMethod, paidAt: current.depositPaidAt }, after: { ...next, paidAt: updated.depositPaidAt }, ...(assigning ? { sourcePaidAt: source.depositPaidAt } : {}) }) } });
      await tx.projectActivity.create({ data: { projectId: current.projectId, type: "visit_deposit_updated", visibility: "admin", message: `Zadatek wizyty ${formatCoolinkDateTime(current.startsAt)}: ${next.depositStatus}${assigning ? " (przypisano dotychczasowy zadatek projektu)" : ""}.` } });
      if (next.depositStatus !== current.depositStatus || next.depositAmount !== current.depositAmount) await tx.clientNotification.create({ data: { clientId: source.clientId, projectId: current.projectId, appointmentId: id, type: "VISIT_DEPOSIT_UPDATED", title: "Zadatek wizyty", body: `Zaktualizowano zadatek wizyty ${formatCoolinkDateTime(current.startsAt)}. Sprawdź szczegóły na swoim koncie.`, href: `/app/portal/projects?project=${current.projectId}&appointment=${id}` } });
      return updated;
    });
    return NextResponse.json({ visit });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const known = /^(Nie znaleziono wizyty|Dane wizyty zmieniły się|Zadatek dotyczy|Ten zadatek został|Nie żądaj wpłaty|Najpierw przypisz)/.test(message);
    return NextResponse.json({ error: known ? message : "Nie udało się zapisać zadatku. Odśwież widok." }, { status: known ? 409 : 500 });
  }
}
