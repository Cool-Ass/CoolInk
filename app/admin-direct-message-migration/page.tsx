import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/auth";
import { hasAdminPermission } from "@/lib/adminPermissions";

export const dynamic = "force-dynamic";

export default async function DirectMessageMigrationPage() {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");
  if (!hasAdminPermission(admin.role, "settings.manage")) redirect("/admin?access=denied");
  return <main className="flex min-h-screen items-center justify-center bg-ink-black p-6 text-ink-white"><form method="post" action="/api/admin/migrations/direct-messages" className="max-w-lg border border-ink-white/15 bg-ink-charcoal/40 p-6"><p className="text-[10px] tracking-[.16em] text-ink-gold">AKTUALIZACJA SYSTEMU</p><h1 className="mt-2 font-display text-3xl">Wiadomości ogólne</h1><p className="mt-3 text-sm leading-relaxed text-ink-grey">Jednorazowo przygotuj bezpieczne miejsce na rozmowy niezwiązane z projektem.</p><button className="mt-5 border border-ink-gold bg-ink-gold px-4 py-2.5 text-xs text-ink-black">URUCHOM MIGRACJĘ</button></form></main>;
}
