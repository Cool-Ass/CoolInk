import Link from "next/link";
import { prisma } from "@/lib/prisma";
import NewClientForm from "@/components/admin/NewClientForm";
import AdminClientList from "@/components/admin/AdminClientList";
import { getCurrentAdmin } from "@/lib/auth";
import { hasAdminPermission } from "@/lib/adminPermissions";
import { privacyRequestDeadline } from "@/lib/privacyRequestDeadline";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const admin = await getCurrentAdmin();
  const canReviewPrivacy = Boolean(admin && hasAdminPermission(admin.role, "clients.delete"));
  const [clients, deletionRequests] = await Promise.all([
    prisma.client.findMany({ include: { _count: { select: { projects: true } } }, orderBy: { updatedAt: "desc" } }),
    canReviewPrivacy ? prisma.accountDeletionRequest.findMany({ where: { status: "pending" }, include: { client: { select: { id: true, firstName: true, lastName: true, email: true } } }, orderBy: { requestedAt: "asc" } }) : Promise.resolve([]),
  ]);
  const stampTotals = await prisma.loyaltyEntry.groupBy({ by: ["clientId"], where: { voidedAt: null }, _sum: { stamps: true } });
  const stamps = new Map(stampTotals.map((item) => [item.clientId, Math.max(0, item._sum.stamps ?? 0)]));
  const evaluatedAt = new Date();
  return <div className="studio-page">
    <div className="flex flex-wrap items-center justify-between gap-4"><div><p className="studio-eyebrow">CRM · {clients.length} KLIENTÓW</p><h1 className="studio-page-title">Klienci i projekty</h1><p className="studio-page-description">Centralna baza klientów, projektów, wizyt, wpłat i historii kontaktu.</p></div><NewClientForm /></div>
    {deletionRequests.length > 0 && <section className="rounded-xl border border-red-400/40 bg-red-500/5 p-3">
      <p className="text-[10px] tracking-[.14em] text-red-300">WNIOSKI DOTYCZĄCE DANYCH · {deletionRequests.length}</p>
      <h2 className="mt-1 text-lg font-semibold">Prośby o usunięcie konta</h2>
      <p className="mt-2 text-xs text-ink-grey">Odpowiedzialny: właściciel studia. Oceń tożsamość, zakres wniosku i podstawę retencji. Termin przypomnienia: miesiąc od przyjęcia. Dane i pliki nie są automatycznie kasowane.</p>
      <div className="mt-3 space-y-2">{deletionRequests.map((request) => {
        const due = privacyRequestDeadline(request.requestedAt);
        const overdue = due.getTime() <= evaluatedAt.getTime();
        return <Link key={request.id} href={`/admin/clients/${request.client.id}`} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-red-400/25 p-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-ink-gold">
          <span>{request.client.firstName} {request.client.lastName} · {request.client.email}</span>
          <span className={overdue ? "text-xs text-red-300" : "text-xs text-ink-grey"}>{overdue ? "Termin przekroczony" : "Odpowiedź do"}: <time dateTime={due.toISOString()}>{due.toLocaleDateString("pl-PL")}</time></span>
        </Link>;
      })}</div>
    </section>}
    <AdminClientList clients={clients.map((client) => ({ id: client.id, firstName: client.firstName, lastName: client.lastName, email: client.email, phone: client.phone, tags: client.tags, stamps: stamps.get(client.id) ?? 0, projectCount: client._count.projects }))} canDeleteClients={Boolean(admin && hasAdminPermission(admin.role, "clients.delete"))} />
  </div>;
}
