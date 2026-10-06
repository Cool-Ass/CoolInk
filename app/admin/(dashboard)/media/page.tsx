import { prisma } from "@/lib/prisma";
import WorkspaceHeader from "@/components/ui/WorkspaceHeader";
import MediaGrid from "@/components/admin/MediaGrid";
import { getMediaUsageMap } from "@/lib/mediaUsage";
import type { Media } from "@prisma/client";
import { usesExternalStorage } from "@/lib/storage";
import { requireAdminPage } from "@/lib/adminPage";

export const dynamic = "force-dynamic";

export default async function MediaPage() {
  await requireAdminPage("content.manage");
  const [media, usageMap] = await Promise.all([
    prisma.media.findMany({ orderBy: { createdAt: "desc" } }),
    getMediaUsageMap(),
  ]);

  const mediaWithUsage = media.map((item: Media) => ({
    ...item,
    usedIn: usageMap.get(item.url) ?? [],
  }));

  return (
    <div className="studio-page">
      <WorkspaceHeader eyebrow="STRONA / CMS" title="Biblioteka mediów" description="Przesyłaj zdjęcia, sprawdzaj ich użycia i edytuj opisy. Obrazy rastrowe optymalizujemy do WebP z zachowaniem przezroczystości." />
      {!usesExternalStorage() && <div role="status" className="studio-panel border-amber-400/45 text-xs leading-relaxed text-amber-200">Trwałe przesyłanie nowych zdjęć jest wyłączone, dopóki w Vercel nie skonfigurujesz magazynu zgodnego z S3 (np. Cloudflare R2). Obrazy dołączone do repozytorium nadal działają.</div>}
      <MediaGrid initialMedia={mediaWithUsage} />
    </div>
  );
}
