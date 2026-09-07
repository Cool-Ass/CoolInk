import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin } from "@/lib/auth";
import { hasAdminPermission } from "@/lib/adminPermissions";
import ClientWorkspace from "@/components/admin/ClientWorkspace";
import { getMessageTemplates } from "@/lib/messageTemplates";

export const dynamic = "force-dynamic";

export default async function ClientProfile({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [client, admin, messageTemplates] = await Promise.all([
    prisma.client.findUnique({ where: { id }, include: { projects: { orderBy: { updatedAt: "desc" }, include: { appointments: { orderBy: { startsAt: "asc" } }, activities: { orderBy: { createdAt: "desc" }, take: 100 }, messages: { include: { attachment: { select: { id: true, caption: true } } }, orderBy: { createdAt: "asc" }, take: 200 } } } } }),
    getCurrentAdmin(),
    getMessageTemplates(),
  ]);
  if (!client) notFound();

  const projects = client.projects.map((project) => ({
    id: project.id,
    title: project.title,
    description: project.description,
    kind: project.kind,
    consultationMode: project.consultationMode,
    status: project.status,
    internalNotes: project.internalNotes,
    nextAction: project.nextAction,
    nextActionDueAt: project.nextActionDueAt?.toISOString() ?? null,
    estimatedPrice: project.estimatedPrice,
    finalPrice: project.finalPrice,
    depositStatus: project.depositStatus,
    depositAmount: project.depositAmount,
    depositPaymentMethod: project.depositPaymentMethod,
    appointments: project.appointments.map((item) => ({ id: item.id, startsAt: item.startsAt.toISOString(), endsAt: item.endsAt.toISOString(), status: item.status, notes: item.notes, price: item.price })),
    activities: project.activities.map((item) => ({ id: item.id, message: item.message, createdAt: item.createdAt.toISOString() })),
    messages: project.messages.map((item) => ({ id: item.id, author: item.author, body: item.body, createdAt: item.createdAt.toISOString(), readAt: item.readAt?.toISOString() ?? null, attachment: item.attachment })),
  }));

  return <div className="flex flex-col gap-6"><Link href="/admin/clients" className="text-xs text-ink-grey hover:text-ink-gold">← KLIENCI</Link><ClientWorkspace client={{ id: client.id, firstName: client.firstName, lastName: client.lastName, email: client.email, phone: client.phone, tags: client.tags, notes: client.notes }} projects={projects} messageTemplates={messageTemplates} canManageFinance={Boolean(admin && hasAdminPermission(admin.role, "finance.manage"))} canDeleteProject={Boolean(admin && hasAdminPermission(admin.role, "projects.delete"))} /></div>;
}
