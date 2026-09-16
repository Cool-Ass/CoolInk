import Link from "next/link";
import { getCurrentAdmin } from "@/lib/auth";
import { hasAdminPermission } from "@/lib/adminPermissions";

export default async function PublicAdminBar({ pageId }: { pageId?: string }) {
  const admin = await getCurrentAdmin();
  if (!admin) return null;
  return <nav data-public-admin-bar aria-label="Narzędzia administratora" className="sticky top-0 z-[100] flex h-9 items-center gap-3 border-b border-white/15 bg-[#17191c] px-3 py-1 text-xs text-white">
    <span className="text-ink-gold">CoolInk</span>
    <Link href="/admin" className="rounded px-2 py-1 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ink-gold">Panel administratora</Link>
    {hasAdminPermission(admin.role, "content.manage") && <Link href={pageId ? `/admin/pages/${pageId}` : "/admin/pages"} className="rounded px-2 py-1 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ink-gold">Edytuj stronę</Link>}
  </nav>;
}
