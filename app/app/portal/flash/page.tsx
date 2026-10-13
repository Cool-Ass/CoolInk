import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { getCurrentClient } from "@/lib/clientAuth";
import { prisma } from "@/lib/prisma";
import { flashClaimWhere } from "@/lib/flashBooking";
import { imageSource } from "@/lib/imageSource";
export const dynamic = "force-dynamic";
export default async function FlashPage() {
  if (!await getCurrentClient()) redirect("/app");
  const items = await prisma.portfolioItem.findMany({ where: { published: true, flashEnabled: true, OR: [{ flashUnique: false }, { flashProjects: { none: flashClaimWhere } }] }, orderBy: { order: "asc" }, take: 100,
    select: { id: true, title: true, description: true, imageUrl: true, flashUnique: true, flashPrice: true, flashSize: true, flashDurationMinutes: true, flashDepositAmount: true } });
  return <div className="studio-page"><header><p className="studio-eyebrow">GOTOWE WZORY</p><h1 className="studio-page-title">Flash</h1><p className="studio-page-description">Wybierz wzór i wolny termin. Studio potwierdzi rezerwację.</p></header>
    {!items.length && <div className="studio-panel">Obecnie nie ma dostępnych wzorów Flash. <Link href="/app/portal/calendar" className="text-ink-gold">Zobacz wolne terminy</Link></div>}
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{items.map(item => <article key={item.id} className="studio-panel overflow-hidden"><div className="relative aspect-square">{imageSource(item.imageUrl) && <Image src={imageSource(item.imageUrl)!} alt={item.title} fill sizes="(max-width: 640px) 100vw, 33vw" className="object-contain" />}</div><div className="space-y-3 pt-4"><h2 className="text-xl font-semibold">{item.title}</h2><p className="text-sm text-ink-grey">{item.description}</p><p>{item.flashSize} · {item.flashPrice?.toLocaleString("pl-PL")} zł · ok. {item.flashDurationMinutes} min</p><p className="text-xs text-ink-grey">{item.flashUnique ? "Unikat — jeden klient" : "Wzór powtarzalny"}{item.flashDepositAmount ? ` · zadatek ${item.flashDepositAmount} zł` : ""}</p><Link className="studio-primary-link" href={`/app/portal/calendar?flash=${encodeURIComponent(item.id)}`}>Wybierz termin</Link></div></article>)}</div>
  </div>;
}
