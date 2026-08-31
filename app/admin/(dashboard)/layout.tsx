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
  const [admin, content, unreadMessages, unreadNotifications] = await Promise.all([getCurrentAdmin(), getSiteContent(), prisma.projectMessage.count({ where: { author: "client", readAt: null } }), prisma.contactMessage.count({ where: { isRead: false } })]);

  return (
    <ToastProvider>
      <div className="flex min-h-screen bg-ink-black text-ink-white">
        <Sidebar logoUrl={content.brand.logoUrl} />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar adminEmail={admin?.email ?? ""} unreadMessages={unreadMessages} unreadNotifications={unreadNotifications} />
          <main className="flex-1 p-6 md:p-10">{children}</main>
        </div>
      </div>
    </ToastProvider>
  );
}
