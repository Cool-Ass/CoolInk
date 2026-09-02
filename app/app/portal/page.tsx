import { redirect } from "next/navigation";
import { getCurrentClient } from "@/lib/clientAuth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ClientPortalPage({ searchParams }: { searchParams: Promise<{ booking?: string }> }) {
  const current = await getCurrentClient();
  if (!current) redirect("/app");
  const { booking } = await searchParams;
  const [client, projects] = await Promise.all([
    prisma.client.findUniqueOrThrow({ where: { id: current.id }, select: { firstName: true } }),
    prisma.tattooProject.findMany({ where: { clientId: current.id, status: { not: "cancelled" } }, select: { id: true, title: true }, orderBy: { updatedAt: "desc" }, take: 30 }),
  ]);
  return <div><p className="text-[11px] tracking-[.2em] text-ink-gold">STREFA KLIENTA</p><h1 className="mt-2 font-display text-4xl sm:text-6xl">Cześć, {client.firstName}.</h1><p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-grey">Tu sprawdzisz swoje zgłoszenia i wybierzesz dostępny termin.</p><div className="mt-8 grid gap-4 lg:grid-cols-2"><Link href="/app/portal/projects" className="border border-ink-white/15 bg-ink-charcoal/30 p-5 transition-colors hover:border-ink-gold"><p className="text-[10px] tracking-widest text-ink-gold">TWOJE ZGŁOSZENIA</p><p className="mt-3 font-display text-3xl">{projects.length}</p><p className="mt-2 text-sm text-ink-grey">{projects[0]?.title || "Nie masz jeszcze aktywnego zgłoszenia."}</p><span className="mt-5 inline-block text-xs text-ink-gold">OTWÓRZ PROJEKTY →</span></Link><Link href={`/app/portal/calendar${booking ? `?booking=${encodeURIComponent(booking)}` : ""}`} className="border border-emerald-500/35 bg-emerald-500/5 p-5 transition-colors hover:border-emerald-400"><p className="text-[10px] tracking-widest text-emerald-300">KALENDARZ</p><p className="mt-3 font-display text-3xl">Wolne terminy</p><p className="mt-2 text-sm text-ink-grey">Zobacz terminy udostępnione przez studio.</p><span className="mt-5 inline-block text-xs text-emerald-300">OTWÓRZ KALENDARZ →</span></Link></div></div>;
}
