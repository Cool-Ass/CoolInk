import { getAdminSectionLayout } from "@/lib/adminSectionSettings";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin } from "@/lib/auth";
import { hasAdminPermission } from "@/lib/adminPermissions";
import ClientWorkspace from "@/components/admin/ClientWorkspace";
import { getMessageTemplates } from "@/lib/messageTemplates";
import { privateImageUrl } from "@/lib/privateMedia";
import LoyaltyCard from "@/components/client/LoyaltyCard";
import { getLoyaltyCard } from "@/lib/loyalty";
import { formatCoolinkDateTime } from "@/lib/dateTime";

export const dynamic = "force-dynamic";

export default async function ClientProfile({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [client, admin, messageTemplates] = await Promise.all([
    prisma.client.findUnique({ where: { id }, include: { directMessages: { orderBy: { createdAt: "asc" }, take: 200 }, projects: { orderBy: { updatedAt: "desc" }, include: { appointments: { orderBy: { startsAt: "asc" } }, activities: { orderBy: { createdAt: "desc" }, take: 100 }, images: { orderBy: { createdAt: "asc" } }, messages: { include: { attachment: { select: { id: true, caption: true } } }, orderBy: { createdAt: "asc" }, take: 200 } } } } }),
    getCurrentAdmin(),
    getMessageTemplates(),
  ]);
  if (!client) notFound();
  const loyalty = await getLoyaltyCard(id);
  const unsettled = await prisma.appointment.findMany({ where: { project: { clientId: id, kind: { not: "consultation" } }, status: { in: ["confirmed", "completed"] }, startsAt: { lte: new Date() }, loyaltyEntry: null, OR: [{ serviceType: null }, { serviceType: "tattoo" }] }, include: { project: { select: { title: true } } }, orderBy: { startsAt: "desc" } });

  const projects = client.projects.map((project) => ({
    id: project.id,
    title: project.title,
    description: project.description,
    kind: project.kind,
    consultationMode: project.consultationMode,
    status: project.status,
    leadSource: project.leadSource,
    internalNotes: project.internalNotes,
    nextAction: project.nextAction,
    nextActionDueAt: project.nextActionDueAt?.toISOString() ?? null,
    estimatedSessionsMin: project.estimatedSessionsMin,
    estimatedSessionsMax: project.estimatedSessionsMax,
    sessionPriceCents: project.sessionPriceCents ?? loyalty.rules.sessionPriceCents,
    estimatedPrice: project.estimatedPrice,
    estimatedPriceMax: project.estimatedPriceMax,
    finalPrice: project.finalPrice,
    depositStatus: project.depositStatus,
    depositAmount: project.depositAmount,
    depositPaymentMethod: project.depositPaymentMethod,
    appointments: project.appointments.map((item) => ({ id: item.id, startsAt: item.startsAt.toISOString(), endsAt: item.endsAt.toISOString(), status: item.status, notes: item.notes, price: item.price, createdAt: item.createdAt.toISOString() })),
    activities: project.activities.map((item) => ({ id: item.id, message: item.message, createdAt: item.createdAt.toISOString() })),
    images: project.images.map((image) => ({ id: image.id, caption: image.caption, createdAt: image.createdAt.toISOString(), url: privateImageUrl(image.id, "admin", admin?.id || "") })),
    messages: project.messages.map((item) => ({ id: item.id, author: item.author, body: item.body, createdAt: item.createdAt.toISOString(), readAt: item.readAt?.toISOString() ?? null, attachment: item.attachment ? { ...item.attachment, url: privateImageUrl(item.attachment.id, "admin", admin?.id || "") } : null })),
  }));

  return <div className="flex flex-col gap-3"><Link href="/admin/clients" className="text-xs text-ink-grey hover:text-ink-gold">← KLIENCI</Link><LoyaltyCard card={loyalty} clientId={admin && hasAdminPermission(admin.role, "finance.manage") ? id : undefined} visits={unsettled.map((item) => ({ id: item.id, title: item.project.title, date: formatCoolinkDateTime(item.startsAt), price: item.price, status: item.status, loyaltyRequested: item.loyaltyRequested }))} /><ClientWorkspace sectionLayout={await getAdminSectionLayout(admin?.id ?? "", "client")} client={{ id: client.id, firstName: client.firstName, lastName: client.lastName, email: client.email, phone: client.phone, tags: client.tags, notes: client.notes }} projects={projects} directMessages={client.directMessages.map((message) => ({ id: message.id, author: message.author, body: message.body, createdAt: message.createdAt.toISOString(), readAt: message.readAt?.toISOString() ?? null, attachment: null }))} messageTemplates={messageTemplates} canManageFinance={Boolean(admin && hasAdminPermission(admin.role, "finance.manage"))} canDeleteProject={Boolean(admin && hasAdminPermission(admin.role, "projects.delete"))} /></div>;
}
