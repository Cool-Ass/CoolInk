import { prisma } from "@/lib/prisma";
import InventoryManager from "@/components/admin/InventoryManager";

export const dynamic = "force-dynamic";
export default async function InventoryPage() {
  const items = await prisma.inventoryItem.findMany({ where: { active: true }, orderBy: [{ category: "asc" }, { name: "asc" }] });
  return <div className="space-y-7"><header><p className="text-[11px] tracking-[.18em] text-ink-gold">STANY I ZUŻYCIE</p><h1 className="mt-2 font-display text-4xl">Magazyn</h1><p className="mt-2 text-sm text-ink-grey">Kontroluj materiały, koszty i poziomy minimalne. Każda zmiana tworzy trwały wpis historii.</p></header><InventoryManager items={items} /></div>;
}
