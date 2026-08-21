import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import PortfolioForm from "@/components/admin/PortfolioForm";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditPortfolioItemPage({ params }: Props) {
  const { id } = await params;
  const item = await prisma.portfolioItem.findUnique({ where: { id } });
  if (!item) notFound();

  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="mb-2 text-[13px] font-medium tracking-[0.3em] text-ink-gold">
          PORTFOLIO / GALERIA
        </p>
        <h1 className="font-display text-3xl text-ink-white">Edytuj element</h1>
      </div>
      <PortfolioForm
        initial={{
          id: item.id,
          title: item.title,
          description: item.description ?? "",
          imageUrl: item.imageUrl,
          category: item.category ?? "",
          tags: item.tags ?? "",
          published: item.published,
        }}
      />
    </div>
  );
}
