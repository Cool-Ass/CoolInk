import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/adminApi";
import { hasAdminPermission } from "@/lib/adminPermissions";
import { prisma } from "@/lib/prisma";
import { getLoyaltyCard } from "@/lib/loyalty";
import { messageRecipient, visibleMessages } from "@/lib/messageVisibility";
import { privateImageUrl } from "@/lib/privateMedia";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireAdminApi("operations.manage");
  if (!access.ok) return access.response;
  const { id } = await params;
  const visit = await prisma.appointment.findUnique({ where: { id }, include: { loyaltyEntry: { select: { id: true } }, project: { select: { id: true, clientId: true, kind: true, title: true, depositStatus: true, depositAmount: true } } } });
  if (!visit) return NextResponse.json({ error: "Nie znaleziono wizyty." }, { status: 404 });
  const finance = hasAdminPermission(access.admin.role, "finance.manage");
  const [card, messages, documents] = await Promise.all([
    finance ? getLoyaltyCard(visit.project.clientId) : null,
    prisma.projectMessage.findMany({ where: { projectId: visit.projectId, ...visibleMessages(messageRecipient("admin", access.admin.id)) }, include: { attachment: { select: { id: true, caption: true } } }, orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.studioDocument.findMany({ where: { published: true }, select: { id: true, title: true, version: true, category: true, acceptances: { where: { clientId: visit.project.clientId }, select: { version: true } } }, orderBy: { title: "asc" } }),
  ]);
  return NextResponse.json({
    projectId: visit.projectId, clientId: visit.project.clientId,
    deposit: { status: visit.project.depositStatus, amount: finance ? visit.project.depositAmount : null },
    card, settleable: finance && !visit.loyaltyEntry && ["confirmed", "completed"].includes(visit.status) && visit.startsAt <= new Date() && visit.project.kind !== "consultation" && (!visit.serviceType || visit.serviceType === "tattoo"),
    visit: { id: visit.id, title: visit.project.title, date: visit.startsAt.toISOString(), price: finance ? visit.price : null, status: visit.status, loyaltyRequested: visit.loyaltyRequested },
    documents: documents.map(doc => ({ id: doc.id, title: doc.title, category: doc.category, accepted: doc.acceptances.some(a => a.version === doc.version) })),
    messages: messages.reverse().map(message => ({ id: message.id, author: message.author, body: message.body, createdAt: message.createdAt.toISOString(), readAt: message.readAt?.toISOString() ?? null, attachment: message.attachment ? { ...message.attachment, url: privateImageUrl(message.attachment.id, "admin", access.admin.id) } : null })),
  }, { headers: { "Cache-Control": "private, no-store" } });
}
