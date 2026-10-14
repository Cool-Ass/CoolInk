import { reservedLoyaltyRules } from "@/lib/voucherRules";
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
  const visit = await prisma.appointment.findUnique({ where: { id }, include: { voucher: true, aftercareImages: { where: { kind: "voucher" }, select: { id: true } }, loyaltyEntry: { select: { id: true } }, project: { select: { id: true, clientId: true, kind: true, title: true, depositStatus: true, depositAmount: true, depositPaymentMethod: true, depositAssignedAppointmentId: true } } } });
  if (!visit) return NextResponse.json({ error: "Nie znaleziono wizyty." }, { status: 404 });
  const finance = hasAdminPermission(access.admin.role, "finance.manage");
  const [card, messages, documents] = await Promise.all([
    finance ? getLoyaltyCard(visit.project.clientId) : null,
    prisma.projectMessage.findMany({ where: { projectId: visit.projectId, ...visibleMessages(messageRecipient("admin", access.admin.id)) }, include: { attachment: { select: { id: true, caption: true } } }, orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.studioDocument.findMany({ where: { published: true }, select: { id: true, title: true, version: true, category: true, acceptances: { where: { clientId: visit.project.clientId }, select: { version: true } } }, orderBy: { title: "asc" } }),
  ]);
  return NextResponse.json({
    projectId: visit.projectId, clientId: visit.project.clientId,
    canManageFinance: finance,
    deposit: { status: visit.depositStatus, amount: finance ? visit.depositAmount : null, paymentMethod: finance ? visit.depositPaymentMethod : null },
    legacyDeposit: finance && !visit.project.depositAssignedAppointmentId && visit.project.depositStatus !== "not_required" && visit.project.depositAmount ? { status: visit.project.depositStatus, amount: visit.project.depositAmount, paymentMethod: visit.project.depositPaymentMethod } : null,
    card, settleable: finance && !visit.loyaltyEntry && ["confirmed", "completed"].includes(visit.status) && visit.startsAt <= new Date() && visit.project.kind !== "consultation" && (!visit.serviceType || visit.serviceType === "tattoo"),
    visit: { id: visit.id, title: visit.project.title, date: visit.startsAt.toISOString(), updatedAt: visit.updatedAt.toISOString(), price: finance ? visit.price : null, status: visit.status, loyaltyRequested: visit.loyaltyReserved, loyaltyRules: finance ? reservedLoyaltyRules(visit.loyaltyReservation) : null, voucherAmountCents: finance ? visit.voucher?.amountCents ?? 0 : 0, voucherRequested: visit.voucherRequested, depositPaidCents: finance && visit.depositStatus === "paid" ? (visit.depositAmount || 0) * 100 : 0 },
    voucherPhotos: finance ? visit.aftercareImages.map(image => privateImageUrl(image.id, "admin", access.admin.id)) : [],
    documents: documents.map(doc => ({ id: doc.id, title: doc.title, category: doc.category, accepted: doc.acceptances.some(a => a.version === doc.version) })),
    messages: messages.reverse().map(message => ({ id: message.id, author: message.author, body: message.body, createdAt: message.createdAt.toISOString(), readAt: message.readAt?.toISOString() ?? null, deliveredAt: message.deliveredAt?.toISOString() ?? null, attachment: message.attachment ? { ...message.attachment, url: privateImageUrl(message.attachment.id, "admin", access.admin.id) } : null })),
  }, { headers: { "Cache-Control": "private, no-store" } });
}
