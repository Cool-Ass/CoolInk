import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentClient } from "@/lib/clientAuth";
import { isSameOrigin, rateLimit, tooManyRequests } from "@/lib/requestSecurity";
import { withClientMediaWrite } from "@/lib/clientMediaWrite";
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const client = await getCurrentClient(); if (!client) return NextResponse.json({ error: "Zaloguj się." }, { status: 401 });
  const limit = await rateLimit(request, "aftercare-consultation", 8, 86400000, client.id); if (!limit.allowed) return tooManyRequests(limit);
  const { id } = await params;
  const visit = await prisma.appointment.findFirst({ where: { id, status: "completed", AND: [{ OR: [{ serviceType: null }, { serviceType: "tattoo" }] }], project: { clientId: client.id, kind: "tattoo" } }, select: { projectId: true } });
  if (!visit) return NextResponse.json({ error: "Nie znaleziono zakończonej sesji." }, { status: 404 });
  await withClientMediaWrite(client.id, async tx => {
    const changed = await tx.appointment.updateMany({ where: { id, status: "completed", AND: [{ OR: [{ serviceType: null }, { serviceType: "tattoo" }] }], OR: [{ aftercareConsultationRequestedAt: null }, { aftercareConsultationResolvedAt: { not: null } }], project: { clientId: client.id } }, data: { aftercareConsultationRequestedAt: new Date(), aftercareConsultationResolvedAt: null } });
    if (changed.count) {
      await tx.tattooProject.update({ where: { id: visit.projectId }, data: { nextAction: "Odpowiedz na prośbę o konsultację gojenia", nextActionDueAt: new Date() } });
      await tx.projectActivity.create({ data: { projectId: visit.projectId, type: "aftercare_consultation", visibility: "admin", message: "Klient prosi o konsultację po sesji." } });
      await tx.projectMessage.create({ data: { projectId: visit.projectId, author: "client", body: "Proszę o konsultację dotyczącą gojenia tatuażu po tej sesji." } });
    }
    return null;
  });
  return NextResponse.json({ ok: true });
}
