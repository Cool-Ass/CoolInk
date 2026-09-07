import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/adminApi";
import {
  activityMessage,
  isProjectStatus,
  DEPOSIT_STATUS,
} from "@/lib/projectWorkflow";
import { isSameOrigin } from "@/lib/requestSecurity";
import { hasAdminPermission } from "@/lib/adminPermissions";

interface Params {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, { params }: Params) {
  const access = await requireAdminApi("operations.manage");
  if (!access.ok) return access.response;
  if (!isSameOrigin(request))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const financialFields = ["estimatedPrice", "finalPrice", "depositStatus", "depositAmount", "depositPaymentMethod"];
  if (financialFields.some((field) => Object.prototype.hasOwnProperty.call(body ?? {}, field)) && !hasAdminPermission(access.admin.role, "finance.manage")) return NextResponse.json({ error: "Twoja rola nie ma uprawnień do danych finansowych." }, { status: 403 });
  const project = await prisma.tattooProject.findUnique({ where: { id } });
  if (!project)
    return NextResponse.json(
      { error: "Projekt nie istnieje." },
      { status: 404 },
    );
  const status = isProjectStatus(body?.status) ? body.status : project.status;
  const depositStatus =
    typeof body?.depositStatus === "string" &&
    (DEPOSIT_STATUS as readonly string[]).includes(body.depositStatus)
      ? body.depositStatus
      : project.depositStatus;
  const converting = body?.convertConsultation === true && project.kind === "consultation";
  const kind = converting ? "tattoo" : project.kind;
  const nextAction = typeof body?.nextAction === "string" ? body.nextAction.trim().slice(0, 500) || null : project.nextAction;
  const dueValue = typeof body?.nextActionDueAt === "string" ? new Date(body.nextActionDueAt) : null;
  const nextActionDueAt = body?.nextActionDueAt === "" ? null : dueValue && !Number.isNaN(dueValue.getTime()) ? dueValue : project.nextActionDueAt;
  const updated = await prisma.$transaction(async (tx) => {
    const next = await tx.tattooProject.update({
      where: { id },
      data: {
        status,
        kind,
        consultationMode: converting ? null : project.consultationMode,
        nextAction,
        nextActionDueAt,
        internalNotes:
          typeof body?.internalNotes === "string"
            ? body.internalNotes.slice(0, 5000)
            : project.internalNotes,
        estimatedPrice:
          body?.estimatedPrice === "" || body?.estimatedPrice === undefined
            ? project.estimatedPrice
            : Number(body.estimatedPrice) || null,
        finalPrice:
          body?.finalPrice === "" || body?.finalPrice === undefined
            ? project.finalPrice
            : Number(body.finalPrice) || null,
        depositStatus,
        depositAmount:
          body?.depositAmount === "" || body?.depositAmount === undefined
            ? project.depositAmount
            : Number(body.depositAmount) || null,
        depositPaymentMethod:
          typeof body?.depositPaymentMethod === "string"
            ? body.depositPaymentMethod.slice(0, 80) || null
            : project.depositPaymentMethod,
        depositPaidAt:
          depositStatus === "paid" && project.depositStatus !== "paid"
            ? new Date()
            : project.depositPaidAt,
      },
    });
    if (status !== project.status)
      await tx.projectActivity.create({
        data: {
          projectId: id,
          type: "status_changed",
          message: activityMessage("status_changed", status),
          visibility: "admin",
        },
      });
    if (depositStatus !== project.depositStatus)
      await tx.projectActivity.create({
        data: {
          projectId: id,
          type: "deposit_updated",
          message: activityMessage("deposit_updated", depositStatus),
          visibility: "admin",
        },
      });
    if (converting) await tx.projectActivity.create({ data: { projectId: id, type: "consultation_converted", message: "Konsultacja została przekształcona w projekt tatuażu. Zdjęcia, rozmowa i historia zostały zachowane.", visibility: "admin" } });
    await tx.adminAuditLog.create({ data: { adminUserId: access.admin.id, action: converting ? "consultation.convert" : "project.update", targetType: "TattooProject", targetId: id, summary: converting ? `Przekształcono konsultację „${project.title}” w projekt.` : `Zaktualizowano projekt „${project.title}”.`, metadata: JSON.stringify({ previousStatus: project.status, status, nextAction }) } });
    return next;
  });
  return NextResponse.json({ project: updated });
}

export async function DELETE(request: Request, { params }: Params) {
  const access = await requireAdminApi("projects.delete");
  if (!access.ok) return access.response;
  if (!isSameOrigin(request))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const project = await prisma.tattooProject.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!project)
    return NextResponse.json(
      { error: "Projekt nie istnieje." },
      { status: 404 },
    );
  // Database relations (appointments, activities, messages and inspirations)
  // use ON DELETE CASCADE. Storage objects remain private and unreachable;
  // their lifecycle is handled by the bucket retention policy.
  await prisma.$transaction(async (tx) => {
    await tx.adminAuditLog.create({ data: { adminUserId: access.admin.id, action: "project.delete", targetType: "TattooProject", targetId: id, summary: "Usunięto projekt wraz z powiązaną historią." } });
    await tx.tattooProject.delete({ where: { id } });
  });
  return NextResponse.json({ ok: true });
}
