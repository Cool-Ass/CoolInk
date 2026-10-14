import Link from "next/link";
import { requireAdminPage } from "@/lib/adminPage";
import { hasAdminPermission } from "@/lib/adminPermissions";
import { prisma } from "@/lib/prisma";
import CompactDisclosure from "@/components/ui/CompactDisclosure";
import SystemHealth from "@/components/admin/SystemHealth";
import GoogleSyncRetry from "@/components/admin/GoogleSyncRetry";
import GoogleCalendarIntegration from "@/components/admin/GoogleCalendarIntegration";
import GoogleReviewsSettings from "@/components/admin/GoogleReviewsSettings";
import DepositInstructionsSettings from "@/components/admin/DepositInstructionsSettings";
import AdminAppSettings from "@/components/admin/AdminAppSettings";
import AdminMfaSettings from "@/components/admin/AdminMfaSettings";
import ChangePasswordForm from "@/components/admin/ChangePasswordForm";
import TattooStylesSettings from "@/components/admin/TattooStylesSettings";
import LoyaltySettings from "@/components/admin/LoyaltySettings";
import AftercareModule from "@/components/admin/AftercareModule";
import { getGoogleReviewsSettings } from "@/lib/googleReviewsSettings";
import { getDepositInstructions } from "@/lib/depositSettings";
import { getTattooStyles } from "@/lib/tattooStyles";
import { getLoyaltyRules, getLoyaltyDescription } from "@/lib/loyaltySettings";
export const dynamic = "force-dynamic";
const categories = [{ id: "studio", title: "Studio i rezerwacje" }, { id: "payments", title: "Płatności i nagrody" }, { id: "care", title: "Opieka po sesji" }, { id: "integrations", title: "Integracje" }, { id: "security", title: "Konto i bezpieczeństwo" }];
export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const input = await searchParams;
  const selected = categories.some(item => item.id === input.category) ? input.category! : "studio";
  const admin = await requireAdminPage(selected === "care" ? "operations.manage" : "settings.manage");
  const visible = hasAdminPermission(admin.role, "settings.manage") ? categories : categories.filter(item => item.id === "care");
  return <div className="studio-page"><header><h1 className="studio-page-title">Ustawienia</h1></header>
    <nav aria-label="Kategorie ustawień" className="flex flex-wrap gap-2">{visible.map(item => <Link key={item.id} href={`/admin/settings?category=${item.id}`} aria-current={selected === item.id ? "page" : undefined} className={selected === item.id ? "studio-primary-link" : "studio-secondary-link"}>{item.title}</Link>)}</nav>
    <div className="space-y-4">
      {selected === "studio" && <><AdminAppSettings /><CompactDisclosure title="STYLE TATUAŻU"><TattooStylesSettings initialStyles={await getTattooStyles()} /></CompactDisclosure></>}
      {selected === "payments" && <><CompactDisclosure title="ZADATKI" summary="Gotówka, BLIK i podgląd klienta"><DepositInstructionsSettings initial={await getDepositInstructions()} /></CompactDisclosure><CompactDisclosure title="KARTA LOJALNOŚCIOWA"><LoyaltySettings initial={await getLoyaltyRules()} initialDescription={await getLoyaltyDescription()} /></CompactDisclosure><Link className="studio-secondary-link" href="/admin/vouchers">Vouchery</Link></>}
      {selected === "care" && <AftercareModule admin={admin} />}
      {selected === "integrations" && <><CompactDisclosure title="GOOGLE CALENDAR"><GoogleCalendarIntegration /><GoogleSyncRetry /></CompactDisclosure><CompactDisclosure title="OPINIE GOOGLE"><GoogleReviewsSettings initial={await getGoogleReviewsSettings()} /></CompactDisclosure></>}
      {selected === "security" && <><CompactDisclosure title="LOGOWANIE I MFA"><AdminMfaSettings /></CompactDisclosure><CompactDisclosure title="ZMIEŃ HASŁO"><ChangePasswordForm /></CompactDisclosure><CompactDisclosure title="STAN SYSTEMU"><SystemHealth /></CompactDisclosure><CompactDisclosure title="HISTORIA DZIAŁAŃ"><div className="max-h-96 divide-y divide-ink-white/10 overflow-y-auto">{(await prisma.adminAuditLog.findMany({ include: { adminUser: { select: { email: true } } }, orderBy: { createdAt: "desc" }, take: 30 })).map(log => <article key={log.id} className="py-3 text-sm"><p>{log.summary}</p><p className="mt-1 text-xs text-ink-grey">{log.adminUser?.email} · {log.createdAt.toLocaleString("pl-PL", { timeZone: "Europe/Warsaw" })}</p></article>)}</div></CompactDisclosure></>}
    </div>
  </div>;
}
