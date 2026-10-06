import { requireAdminPage } from "@/lib/adminPage";
import { getAnnouncements } from "@/lib/announcements";
import AnnouncementsManager from "@/components/admin/AnnouncementsManager";
import WorkspaceHeader from "@/components/ui/WorkspaceHeader";
export const dynamic = "force-dynamic";
export default async function AnnouncementsPage() {
  await requireAdminPage("content.manage");
  return <div className="studio-page"><WorkspaceHeader eyebrow="OBSŁUGA" title="Komunikaty dla klientów" description="Wolne terminy, aktualności i promocje w głównym panelu klienta." /><AnnouncementsManager initial={await getAnnouncements()} /></div>;
}
