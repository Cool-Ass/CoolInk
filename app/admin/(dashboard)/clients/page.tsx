import Link from "next/link";
import { prisma } from "@/lib/prisma";
import NewClientForm from "@/components/admin/NewClientForm";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const clients = await prisma.client.findMany({ include: { _count: { select: { projects: true } } }, orderBy: { updatedAt: "desc" } });
  return <div className="flex flex-col gap-8"><div className="flex flex-wrap items-center justify-between gap-4"><div><p className="mb-2 text-[13px] font-medium tracking-[0.3em] text-ink-gold">CRM</p><h1 className="font-display text-3xl text-ink-white">Klienci i projekty</h1><p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-grey">Centralna baza klientów. W następnej fazie dołączymy projekty, wizyty, wpłaty i historię kontaktu.</p></div><NewClientForm /></div><div className="overflow-hidden border border-ink-white/10">{clients.length === 0 ? <div className="p-10 text-center text-sm text-ink-grey">Nie ma jeszcze klientów. Dodaj pierwszego klienta, aby rozpocząć pracę z CRM.</div> : <div className="divide-y divide-ink-white/10">{clients.map((client) => <div key={client.id} className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div><Link href={`/admin/clients/${client.id}`} className="text-[15px] text-ink-white hover:text-ink-gold">{client.firstName} {client.lastName}</Link><p className="mt-1 text-[12px] text-ink-grey">{client.email}{client.phone ? ` · ${client.phone}` : ""}</p>{client.tags && <p className="mt-2 text-[11px] text-ink-gold">{client.tags}</p>}</div><Link href={`/admin/clients/${client.id}`} className="text-[12px] text-ink-grey hover:text-ink-gold">{client._count.projects} projektów →</Link></div>)}</div>}</div></div>;
}
