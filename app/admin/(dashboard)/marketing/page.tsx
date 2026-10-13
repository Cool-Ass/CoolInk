import { requireAdminPage } from "@/lib/adminPage";
import { prisma } from "@/lib/prisma";
import { marketingSegments } from "@/lib/marketing";
import MarketingPanel from "@/components/admin/MarketingPanel";
export const dynamic = "force-dynamic";
export default async function MarketingPage() {
  await requireAdminPage("content.manage");
  const [campaigns, segments] = await Promise.all([prisma.promotion.findMany({ where: { campaignStatus: { not: null } }, orderBy: { createdAt: "desc" }, take: 50 }), marketingSegments()]);
  return <div className="studio-page space-y-5"><header><p className="studio-eyebrow">ROZWÓJ STUDIA</p><h1 className="studio-page-title">Marketing</h1></header><MarketingPanel initial={campaigns.map(item => ({ id: item.id, title: item.title, startsAt: item.startsAt.toISOString(), endsAt: item.endsAt.toISOString(), updatedAt: item.updatedAt.toISOString(), campaignStatus: item.campaignStatus, campaignAudience: item.campaignAudience, campaignCaption: item.campaignCaption, campaignStory: item.campaignStory, suggestedDiscountPercent: item.suggestedDiscountPercent }))} segments={segments} /></div>;
}
