import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/adminApi";
import { isSameOrigin } from "@/lib/requestSecurity";

export async function GET() {
  const access = await requireAdminApi("inventory.manage"); if (!access.ok) return access.response;
  return NextResponse.json({ items: await prisma.inventoryItem.findMany({ orderBy: [{ active: "desc" }, { category: "asc" }, { name: "asc" }] }) });
}

export async function POST(request: Request) {
  const access = await requireAdminApi("inventory.manage"); if (!access.ok) return access.response;
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await request.json().catch(() => null);
  const name = String(body?.name ?? "").trim(); const sku = String(body?.sku ?? "").trim(); const category = String(body?.category ?? "materiały").trim(); const unit = String(body?.unit ?? "szt.").trim();
  const quantity = Number(body?.quantity ?? 0); const minimumStock = Number(body?.minimumStock ?? 0); const unitCost = Number(body?.unitCost ?? 0);
  if (!name || name.length > 120 || !Number.isInteger(quantity) || quantity < 0 || !Number.isInteger(minimumStock) || minimumStock < 0 || !Number.isFinite(unitCost) || unitCost < 0) return NextResponse.json({ error: "Sprawdź nazwę, ilość, stan minimalny i cenę." }, { status: 400 });
  try {
    const item = await prisma.$transaction(async (tx) => {
      const created = await tx.inventoryItem.create({ data: { name, sku: sku || null, category: category.slice(0, 60), unit: unit.slice(0, 20), quantity, minimumStock, unitCostCents: Math.round(unitCost * 100) } });
      if (quantity) await tx.inventoryMovement.create({ data: { itemId: created.id, adminUserId: access.admin.id, delta: quantity, reason: "stan_początkowy" } });
      return created;
    });
    return NextResponse.json({ item }, { status: 201 });
  } catch (error) { return NextResponse.json({ error: String(error).includes("Unique constraint") ? "Ten kod SKU jest już używany." : "Nie udało się dodać pozycji." }, { status: 400 }); }
}
