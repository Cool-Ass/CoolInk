import Image from "next/image";
import { prisma } from "@/lib/prisma";
import AddPortfolioItem from "@/components/admin/AddPortfolioItem";
import PortfolioRowActions from "@/components/admin/PortfolioRowActions";
import Link from "next/link";
import { imageSource } from "@/lib/imageSource";
import { requireAdminPage } from "@/lib/adminPage";

export const dynamic = "force-dynamic";

export default async function PortfolioListPage() {
  await requireAdminPage("content.manage");
  const items = await prisma.portfolioItem.findMany({ orderBy: { order: "asc" } });

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="mb-1 text-[11px] font-medium tracking-[0.22em] text-ink-gold">
            PORTFOLIO / GALERIA
          </p>
          <div className="flex flex-wrap items-end gap-3">
            <h1 className="font-display text-3xl text-ink-white">Zarządzaj portfolio</h1>
            <span className="mb-1 text-xs text-ink-grey">{items.length} {items.length === 1 ? "element" : "elementów"}</span>
          </div>
        </div>
        <AddPortfolioItem />
      </div>

      {items.length === 0 ? (
        <p className="border border-dashed border-ink-white/15 px-6 py-10 text-center text-[14px] text-ink-grey">
          Brak elementów portfolio. Dodaj pierwsze zdjęcie tatuażu powyżej.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {items.map((item, i) => {
            const source = imageSource(item.imageUrl);
            return <article key={item.id} className="group overflow-hidden border border-ink-white/10 bg-ink-charcoal/30 transition-colors hover:border-ink-gold/45">
              <Link href={`/admin/portfolio/${item.id}`} aria-label={`Edytuj: ${item.title}`} className="relative block aspect-[4/3] w-full overflow-hidden bg-ink-black">
                {source ? <Image
                  src={source}
                  alt={item.title}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  sizes="(min-width: 1536px) 18vw, (min-width: 1280px) 23vw, (min-width: 640px) 31vw, 48vw"
                /> : <span className="flex h-full items-center justify-center text-xs text-ink-grey">Brak podglądu</span>}
                {!item.published && (
                  <span className="absolute left-2 top-2 border border-ink-grey/60 bg-ink-black/85 px-2 py-0.5 text-[9px] tracking-[0.1em] text-ink-grey backdrop-blur">
                    ROBOCZY
                  </span>
                )}
                <span className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 bg-gradient-to-t from-black/90 via-black/60 to-transparent px-3 pb-2.5 pt-10">
                  <span className="min-w-0">
                    <span className="block truncate text-xs text-ink-white">{item.title}</span>
                    {item.category && <span className="mt-0.5 block truncate text-[9px] tracking-[0.08em] text-ink-gold">{item.category}</span>}
                  </span>
                  <span className="shrink-0 text-[10px] text-ink-white/70">#{String(i + 1).padStart(2, "0")}</span>
                </span>
              </Link>
              <div className="p-2.5">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <Link
                    href={`/admin/portfolio/${item.id}`}
                    className="text-[10px] tracking-[0.08em] text-ink-white transition-colors hover:text-ink-gold"
                  >
                    EDYTUJ
                  </Link>
                  <span className="truncate text-[9px] text-ink-grey">{item.published ? "WIDOCZNY" : "SZKIC"}</span>
                </div>
                <PortfolioRowActions
                  id={item.id}
                  published={item.published}
                  isFirst={i === 0}
                  isLast={i === items.length - 1}
                />
              </div>
            </article>;
          })}
        </div>
      )}
    </div>
  );
}
