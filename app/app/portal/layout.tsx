import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentClient } from "@/lib/clientAuth";
import ClientPortalShell from "@/components/client/ClientPortalShell";

export default async function ClientPortalLayout({ children }: { children: React.ReactNode }) {
  const current = await getCurrentClient();
  if (!current) redirect("/app");
  const [client, unreadNotifications, unreadProjectMessages, unreadDirectMessages, notifications, messages, directMessages] = await Promise.all([
    prisma.client.findUniqueOrThrow({ where: { id: current.id }, select: { firstName: true } }),
    prisma.clientNotification.count({ where: { clientId: current.id, readAt: null } }),
    prisma.projectMessage.count({ where: { project: { clientId: current.id }, author: "admin", readAt: null } }),
    prisma.directMessage.count({ where: { clientId: current.id, author: "admin", readAt: null } }),
    prisma.clientNotification.findMany({ where: { clientId: current.id }, orderBy: { createdAt: "desc" }, take: 8, select: { id: true, title: true, body: true, href: true, createdAt: true, readAt: true } }),
    prisma.projectMessage.findMany({ where: { project: { clientId: current.id }, author: "admin" }, orderBy: { createdAt: "desc" }, take: 100, select: { id: true, body: true, createdAt: true, readAt: true, project: { select: { id: true, title: true } } } }),
    prisma.directMessage.findMany({ where: { clientId: current.id, author: "admin" }, orderBy: { createdAt: "desc" }, take: 100 }),
  ]);
  const conversations = Array.from(new Map(messages.map((item) => [item.project.id, item])).values()).slice(0, 8);
  const latestDirect = directMessages[0];
  const messageItems = [...conversations.map((item) => ({ id: item.id, projectId: item.project.id, project: item.project.title, body: item.body, createdAt: item.createdAt.toISOString(), unread: !item.readAt })), ...(latestDirect ? [{ id: `direct:${latestDirect.id}`, projectId: "studio", project: "CoolInk Tattoo Studio", body: latestDirect.body, createdAt: latestDirect.createdAt.toISOString(), unread: !latestDirect.readAt }] : [])].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)).slice(0, 8);
  return <ClientPortalShell firstName={client.firstName} unreadMessages={unreadProjectMessages + unreadDirectMessages} unreadNotifications={unreadNotifications} messages={messageItems} notifications={notifications.map((item) => ({ id: item.id, title: item.title, body: item.body, href: item.href, createdAt: item.createdAt.toISOString(), unread: !item.readAt }))}>{children}</ClientPortalShell>;
}
