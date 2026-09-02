import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentClient } from "@/lib/clientAuth";
import ClientPortalShell from "@/components/client/ClientPortalShell";

export default async function ClientPortalLayout({ children }: { children: React.ReactNode }) {
  const current = await getCurrentClient();
  if (!current) redirect("/app");
  const [client, unreadNotifications, unreadMessages, notifications, messages] = await Promise.all([
    prisma.client.findUniqueOrThrow({ where: { id: current.id }, select: { firstName: true } }),
    prisma.clientNotification.count({ where: { clientId: current.id, readAt: null } }),
    prisma.projectMessage.count({ where: { project: { clientId: current.id }, author: "admin", readAt: null } }),
    prisma.clientNotification.findMany({ where: { clientId: current.id }, orderBy: { createdAt: "desc" }, take: 8, select: { id: true, title: true, body: true, href: true, createdAt: true, readAt: true } }),
    prisma.projectMessage.findMany({ where: { project: { clientId: current.id }, author: "admin" }, orderBy: { createdAt: "desc" }, take: 8, select: { id: true, body: true, createdAt: true, readAt: true, project: { select: { id: true, title: true } } } }),
  ]);
  return <ClientPortalShell firstName={client.firstName} unreadMessages={unreadMessages} unreadNotifications={unreadNotifications} messages={messages.map((item) => ({ id: item.id, projectId: item.project.id, project: item.project.title, body: item.body, createdAt: item.createdAt.toISOString(), unread: !item.readAt }))} notifications={notifications.map((item) => ({ id: item.id, title: item.title, body: item.body, href: item.href, createdAt: item.createdAt.toISOString(), unread: !item.readAt }))}>{children}</ClientPortalShell>;
}
