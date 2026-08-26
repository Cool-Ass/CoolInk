import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { activityMessage, isProjectStatus, DEPOSIT_STATUS } from "@/lib/projectWorkflow";

interface Params { params: Promise<{ id: string }>; }

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const project = await prisma.tattooProject.findUnique({ where: { id } });
  if (!project) return NextResponse.json({ error: "Projekt nie istnieje." }, { status: 404 });
  const status = isProjectStatus(body?.status) ? body.status : project.status;
  const depositStatus = typeof body?.depositStatus === "string" && (DEPOSIT_STATUS as readonly string[]).includes(body.depositStatus) ? body.depositStatus : project.depositStatus;
  const updated = await prisma.$transaction(async (tx) => {
    const next = await tx.tattooProject.update({ where: { id }, data: { status, internalNotes: typeof body?.internalNotes === "string" ? body.internalNotes.slice(0, 5000) : project.internalNotes, estimatedPrice: body?.estimatedPrice === "" || body?.estimatedPrice === undefined ? project.estimatedPrice : Number(body.estimatedPrice) || null, finalPrice: body?.finalPrice === "" || body?.finalPrice === undefined ? project.finalPrice : Number(body.finalPrice) || null, depositStatus, depositAmount: body?.depositAmount === "" || body?.depositAmount === undefined ? project.depositAmount : Number(body.depositAmount) || null, depositPaymentMethod: typeof body?.depositPaymentMethod === "string" ? body.depositPaymentMethod.slice(0, 80) || null : project.depositPaymentMethod, depositPaidAt: depositStatus === "paid" && project.depositStatus !== "paid" ? new Date() : project.depositPaidAt } });
    if (status !== project.status) await tx.projectActivity.create({ data: { projectId: id, type: "status_changed", message: activityMessage("status_changed", status), visibility: "admin" } });
    if (depositStatus !== project.depositStatus) await tx.projectActivity.create({ data: { projectId: id, type: "deposit_updated", message: activityMessage("deposit_updated", depositStatus), visibility: "admin" } });
    return next;
  });
  return NextResponse.json({ project: updated });
}
