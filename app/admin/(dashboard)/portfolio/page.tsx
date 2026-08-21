import Image from "next/image";
import { prisma } from "@/lib/prisma";
import AddPortfolioItem from "@/components/admin/AddPortfolioItem";
import PortfolioRowActions from "@/components/admin/PortfolioRowActions";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function PortfolioListPage() {
  const items = await prisma.portfolioItem.findMany({ orderBy: { order: "asc" } });

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="mb-2 text-[13px] font-medium tracking-[0.3em] text-ink-gold">
            PORTFOLIO / GALERIA
          </p>
          <h1 className="font-display text-3xl text-ink-white">Zarządzaj portfolio</h1>
        </div>
        <AddPortfolioItem />
      </div>

      {items.length === 0 ? (
        <p className="border border-dashed border-ink-white/15 px-6 py-10 text-center text-[14px] text-ink-grey">
          Brak elementów portfolio. Dodaj pierwsze zdjęcie tatuażu powyżej.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item, i) => (
            <div key={item.id} className="border border-ink-white/10 bg-ink-charcoal/30">
              <div className="relative aspect-[4/5] w-full overflow-hidden bg-ink-black">
                <Image
                  src={item.imageUrl}
                  alt={item.title}
                  fill
                  className="object-cover"
                  sizes="(min-width: 1024px) 25vw, 45vw"
                />
                {!item.published && (
                  <span className="absolute left-2 top-2 border border-ink-grey/60 bg-ink-black/80 px-2 py-0.5 text-[10px] tracking-[0.1em] text-ink-grey">
                    ROBOCZY
                  </span>
                )}
              </div>
              <div className="flex flex-col gap-3 p-4">
                <div>
                  <p className="truncate text-[14px] text-ink-white">{item.title}</p>
                  {item.category && (
                    <p className="mt-0.5 text-[11px] tracking-[0.08em] text-ink-gold">
                      {item.category}
                    </p>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <Link
                    href={`/admin/portfolio/${item.id}`}
                    className="text-[12px] tracking-[0.05em] text-ink-white transition-colors hover:text-ink-gold"
                  >
                    EDYTUJ
                  </Link>
                </div>
                <PortfolioRowActions
                  id={item.id}
                  published={item.published}
                  isFirst={i === 0}
                  isLast={i === items.length - 1}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
