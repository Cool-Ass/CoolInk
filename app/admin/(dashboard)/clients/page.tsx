import Link from "next/link";
import { prisma } from "@/lib/prisma";
import NewClientForm from "@/components/admin/NewClientForm";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const [clients, deletionRequests] = await Promise.all([
    prisma.client.findMany({ include: { _count: { select: { projects: true } } }, orderBy: { updatedAt: "desc" } }),
    prisma.accountDeletionRequest.findMany({ where: { status: "pending" }, include: { client: { select: { id: true, firstName: true, lastName: true, email: true } } }, orderBy: { requestedAt: "asc" } }),
  ]);
  return <div className="flex flex-col gap-5">
    <div className="flex flex-wrap items-center justify-between gap-4"><div><p className="mb-1 text-[11px] font-medium tracking-[.2em] text-ink-gold">CRM · {clients.length} KLIENTÓW</p><h1 className="font-display text-3xl text-ink-white">Klienci i projekty</h1><p className="mt-1 max-w-xl text-sm leading-relaxed text-ink-grey">Centralna baza klientów, projektów, wizyt, wpłat i historii kontaktu.</p></div><NewClientForm /></div>
    {deletionRequests.length > 0 && <section className="border border-red-400/50 bg-red-500/5 p-5"><p className="text-[10px] tracking-[.14em] text-red-300">WNIOSKI DOTYCZĄCE DANYCH · {deletionRequests.length}</p><h2 className="mt-2 font-display text-2xl">Prośby o usunięcie konta</h2><p className="mt-2 text-xs text-ink-grey">Zweryfikuj tożsamość, wymagane okresy przechowywania oraz usuń konto także w Supabase Auth. Wniosek nie usuwa automatycznie dokumentacji wizyt.</p><div className="mt-4 space-y-2">{deletionRequests.map((request) => <Link key={request.id} href={`/admin/clients/${request.client.id}`} className="flex flex-wrap justify-between gap-2 border border-red-400/25 p-3 text-sm"><span>{request.client.firstName} {request.client.lastName} · {request.client.email}</span><time className="text-xs text-ink-grey">{request.requestedAt.toLocaleString("pl-PL", { dateStyle: "medium", timeStyle: "short" })}</time></Link>)}</div></section>}
    <div className="overflow-hidden border border-ink-white/10 bg-ink-charcoal/20">{clients.length === 0 ? <div className="p-10 text-center text-sm text-ink-grey">Nie ma jeszcze klientów. Dodaj pierwszego klienta, aby rozpocząć pracę z CRM.</div> : <div className="divide-y divide-ink-white/10">{clients.map((client) => <div key={client.id} className="flex flex-col gap-1.5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><Link href={`/admin/clients/${client.id}`} className="text-sm text-ink-white hover:text-ink-gold">{client.firstName} {client.lastName}</Link><p className="mt-0.5 truncate text-[11px] text-ink-grey">{client.email}{client.phone ? ` · ${client.phone}` : ""}</p>{client.tags && <p className="mt-1 text-[10px] text-ink-gold">{client.tags}</p>}</div><Link href={`/admin/clients/${client.id}`} className="shrink-0 text-[11px] text-ink-grey hover:text-ink-gold">{client._count.projects} projektów →</Link></div>)}</div>}</div>
  </div>;
}
