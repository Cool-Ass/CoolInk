import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentClient } from "@/lib/clientAuth";
import ClientPortalShell from "@/components/client/ClientPortalShell";

export default async function ClientPortalLayout({ children }: { children: React.ReactNode }) {
  const current = await getCurrentClient();
  if (!current) redirect("/app");
  const [client, unreadNotifications, unreadMessages] = await Promise.all([
    prisma.client.findUniqueOrThrow({ where: { id: current.id }, select: { firstName: true } }),
    prisma.clientNotification.count({ where: { clientId: current.id, readAt: null } }),
    prisma.projectMessage.count({ where: { project: { clientId: current.id }, author: "admin", readAt: null } }),
  ]);
  return <ClientPortalShell firstName={client.firstName} unreadMessages={unreadMessages} unreadNotifications={unreadNotifications}>{children}</ClientPortalShell>;
}
