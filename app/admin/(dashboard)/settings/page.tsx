import { requireAdminPage } from "@/lib/adminPage";
import ChangePasswordForm from "@/components/admin/ChangePasswordForm";
import GoogleCalendarIntegration from "@/components/admin/GoogleCalendarIntegration";
import TattooStylesSettings from "@/components/admin/TattooStylesSettings";
import { getTattooStyles } from "@/lib/tattooStyles";
import AdminAppSettings from "@/components/admin/AdminAppSettings";
import { prisma } from "@/lib/prisma";
import { ADMIN_ROLE_LABEL, normalizeAdminRole } from "@/lib/adminPermissions";
import CompactDisclosure from "@/components/ui/CompactDisclosure";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const admin = await requireAdminPage("settings.manage");
  const [tattooStyles, auditLogs] = await Promise.all([getTattooStyles(), prisma.adminAuditLog.findMany({ include: { adminUser: { select: { email: true } } }, orderBy: { createdAt: "desc" }, take: 30 })]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="mb-1 text-[11px] font-medium tracking-[0.22em] text-ink-gold">USTAWIENIA</p>
        <h1 className="font-display text-3xl text-ink-white">Konto</h1>
      </div>
      <CompactDisclosure title="GOOGLE CALENDAR" summary="Automatyczny eksport wizyt i prywatne blokady zajętości" bodyClassName="[&>section]:border-0">
        <GoogleCalendarIntegration />
      </CompactDisclosure>
      <AdminAppSettings />
      <CompactDisclosure title="STYLE TATUAŻU" summary={`${tattooStyles.filter((style) => style.active).length} aktywnych opcji w formularzu klienta`} bodyClassName="[&>section]:border-0 [&>section]:p-0">
        <TattooStylesSettings initialStyles={tattooStyles} />
      </CompactDisclosure>

      <CompactDisclosure title="KONTO ADMINISTRATORA" summary={`${ADMIN_ROLE_LABEL[normalizeAdminRole(admin.role)]} · ${admin.email}`}><div>
        <p className="text-[12px] tracking-[0.1em] text-ink-grey">ZALOGOWANO JAKO</p>
        <p className="mt-2 text-[15px] text-ink-white">{admin?.email}</p>
        {admin?.name && <p className="mt-1 text-[13px] text-ink-grey">{admin.name}</p>}
        <p className="mt-2 text-sm text-ink-gold">Rola: {ADMIN_ROLE_LABEL[normalizeAdminRole(admin.role)]}</p>
        <p className="mt-4 text-[12px] text-ink-grey/70">
          Aby utworzyć dodatkowe konta administratora lub zresetować hasło z poziomu terminala,
          uruchom <code className="text-ink-gold">npm run db:seed</code> po zaktualizowaniu
          ADMIN_EMAIL / ADMIN_PASSWORD w pliku .env.
        </p>
      </div></CompactDisclosure>

      <CompactDisclosure title="DZIENNIK BEZPIECZEŃSTWA" summary={`${auditLogs.length} ostatnich działań administratorów`}><section><p className="text-sm text-ink-grey">Najważniejsze zmiany danych i ustawień są zapisywane wraz z kontem wykonującym operację.</p><div className="mt-3 max-h-80 divide-y divide-ink-white/10 overflow-y-auto">{auditLogs.map((log) => <article key={log.id} className="grid gap-1.5 py-2.5 text-sm sm:grid-cols-[180px_1fr_auto]"><p className="text-ink-grey">{log.adminUser?.email || "Usunięte konto"}</p><p>{log.summary}</p><time className="text-xs text-ink-grey">{log.createdAt.toLocaleString("pl-PL", { dateStyle: "short", timeStyle: "short" })}</time></article>)}{auditLogs.length === 0 && <p className="py-4 text-sm text-ink-grey">Dziennik zacznie się wypełniać po kolejnych zmianach.</p>}</div></section></CompactDisclosure>

      <CompactDisclosure title="ZMIEŃ HASŁO" summary="Aktualizacja danych logowania">
        <ChangePasswordForm />
      </CompactDisclosure>
    </div>
  );
}
