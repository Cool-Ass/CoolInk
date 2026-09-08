import { getCurrentAdmin } from "@/lib/auth";
import { getSiteContent } from "@/lib/content";
import Sidebar from "@/components/admin/Sidebar";
import Topbar from "@/components/admin/Topbar";
import { ToastProvider } from "@/components/admin/ToastProvider";
import { prisma } from "@/lib/prisma";

// Middleware already blocks unauthenticated requests to everything under
// /admin, so by the time this layout renders we always have a session —
// this just fetches display info (email) for the topbar.
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [admin, content, unreadMessages, unreadNotifications, inbox, notifications] = await Promise.all([getCurrentAdmin(), getSiteContent(), prisma.projectMessage.count({ where: { author: "client", readAt: null } }), prisma.contactMessage.count({ where: { isRead: false } }), prisma.projectMessage.findMany({ where: { author: "client" }, include: { project: { include: { client: { select: { id: true, firstName: true, lastName: true } } } } }, orderBy: { createdAt: "desc" }, take: 100 }), prisma.contactMessage.findMany({ orderBy: { createdAt: "desc" }, take: 8 })]);
  const conversations = Array.from(new Map(inbox.map((item) => [item.projectId, item])).values()).slice(0, 8);

  return (
    <ToastProvider>
      <div className="admin-shell flex min-h-screen bg-ink-black text-ink-white">
        <Sidebar logoUrl={content.brand.logoUrl} role={admin?.role} />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar adminEmail={admin?.email ?? ""} adminRole={admin?.role} unreadMessages={unreadMessages} unreadNotifications={unreadNotifications} inbox={conversations.map((item) => ({ id: item.id, clientId: item.project.client.id, client: `${item.project.client.firstName} ${item.project.client.lastName}`, project: item.project.title, body: item.body || "Załączona inspiracja", createdAt: item.createdAt.toISOString(), unread: !item.readAt }))} notifications={notifications.map((item) => ({ id: item.id, title: item.subject || "Nowe zapytanie", body: item.message, createdAt: item.createdAt.toISOString(), unread: !item.isRead }))} />
          <main className="admin-workspace studio-workspace"><div className="mx-auto w-full max-w-[1800px]">{children}</div></main>
        </div>
      </div>
    </ToastProvider>
  );
}
