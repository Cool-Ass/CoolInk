import Link from "next/link";
import { prisma } from "@/lib/prisma";
import NewClientForm from "@/components/admin/NewClientForm";
import AdminClientList from "@/components/admin/AdminClientList";
import { getCurrentAdmin } from "@/lib/auth";
import { hasAdminPermission } from "@/lib/adminPermissions";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const [clients, deletionRequests, admin] = await Promise.all([
    prisma.client.findMany({ include: { _count: { select: { projects: true } } }, orderBy: { updatedAt: "desc" } }),
    prisma.accountDeletionRequest.findMany({ where: { status: "pending" }, include: { client: { select: { id: true, firstName: true, lastName: true, email: true } } }, orderBy: { requestedAt: "asc" } }),
    getCurrentAdmin(),
  ]);
  return <div className="studio-page">
    <div className="flex flex-wrap items-center justify-between gap-4"><div><p className="studio-eyebrow">CRM · {clients.length} KLIENTÓW</p><h1 className="studio-page-title">Klienci i projekty</h1><p className="studio-page-description">Centralna baza klientów, projektów, wizyt, wpłat i historii kontaktu.</p></div><NewClientForm /></div>
    {deletionRequests.length > 0 && <section className="border border-red-400/50 bg-red-500/5 p-5"><p className="text-[10px] tracking-[.14em] text-red-300">WNIOSKI DOTYCZĄCE DANYCH · {deletionRequests.length}</p><h2 className="mt-2 font-display text-2xl">Prośby o usunięcie konta</h2><p className="mt-2 text-xs text-ink-grey">Zweryfikuj tożsamość, wymagane okresy przechowywania oraz usuń konto także w Supabase Auth. Wniosek nie usuwa automatycznie dokumentacji wizyt.</p><div className="mt-4 space-y-2">{deletionRequests.map((request) => <Link key={request.id} href={`/admin/clients/${request.client.id}`} className="flex flex-wrap justify-between gap-2 border border-red-400/25 p-3 text-sm"><span>{request.client.firstName} {request.client.lastName} · {request.client.email}</span><time className="text-xs text-ink-grey">{request.requestedAt.toLocaleString("pl-PL", { dateStyle: "medium", timeStyle: "short" })}</time></Link>)}</div></section>}
    <AdminClientList clients={clients.map((client) => ({ id: client.id, firstName: client.firstName, lastName: client.lastName, email: client.email, phone: client.phone, tags: client.tags, projectCount: client._count.projects }))} canDeleteClients={Boolean(admin && hasAdminPermission(admin.role, "clients.delete"))} />
  </div>;
}
