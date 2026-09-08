import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentClient } from "@/lib/clientAuth";
import ClientNotifications from "@/components/client/ClientNotifications";
export const dynamic = "force-dynamic";
export default async function NotificationsPage() { const current = await getCurrentClient(); if (!current) redirect("/app"); const notifications = await prisma.clientNotification.findMany({ where: { clientId: current.id }, orderBy: { createdAt: "desc" }, take: 100 }); return <ClientNotifications initial={notifications.map((item) => ({ ...item, createdAt: item.createdAt.toISOString(), readAt: item.readAt?.toISOString() ?? null }))} />; }
