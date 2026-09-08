import { prisma } from "@/lib/prisma";
import InventoryManager from "@/components/admin/InventoryManager";
import { requireAdminPage } from "@/lib/adminPage";

export const dynamic = "force-dynamic";
export default async function InventoryPage() {
  await requireAdminPage("inventory.manage");
  const items = await prisma.inventoryItem.findMany({ where: { active: true }, orderBy: [{ category: "asc" }, { name: "asc" }] });
  return <div className="studio-page"><header><p className="studio-eyebrow">STANY I ZUŻYCIE</p><h1 className="studio-page-title">Magazyn</h1><p className="studio-page-description">Kontroluj materiały, koszty i poziomy minimalne. Każda zmiana tworzy trwały wpis historii.</p></header><InventoryManager items={items} /></div>;
}
