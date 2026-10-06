import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import PortfolioForm from "@/components/admin/PortfolioForm";
import WorkspaceHeader from "@/components/ui/WorkspaceHeader";
import { requireAdminPage } from "@/lib/adminPage";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditPortfolioItemPage({ params }: Props) {
  await requireAdminPage("content.manage");
  const { id } = await params;
  const item = await prisma.portfolioItem.findUnique({ where: { id } });
  if (!item) notFound();

  return (
    <div className="studio-page">
      <WorkspaceHeader eyebrow="STRONA / CMS" title="Edytuj element portfolio" description={item.title} />
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
