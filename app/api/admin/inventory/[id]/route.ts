import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/adminApi";
import { isSameOrigin } from "@/lib/requestSecurity";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireAdminApi("inventory.manage"); if (!access.ok) return access.response;
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params; const body = await request.json().catch(() => null); const delta = Number(body?.delta ?? 0);
  if (!Number.isInteger(delta) || delta === 0 || Math.abs(delta) > 100000) return NextResponse.json({ error: "Podaj niezerową, pełną zmianę ilości." }, { status: 400 });
  const reason = String(body?.reason ?? "korekta").trim().slice(0, 60); const note = String(body?.note ?? "").trim().slice(0, 300);
  try {
    const item = await prisma.$transaction(async (tx) => {
      const current = await tx.inventoryItem.findUnique({ where: { id } });
      if (!current) throw new Error("NOT_FOUND");
      if (current.quantity + delta < 0) throw new Error("NEGATIVE_STOCK");
      const updated = await tx.inventoryItem.update({ where: { id }, data: { quantity: { increment: delta } } });
      await tx.inventoryMovement.create({ data: { itemId: id, adminUserId: access.admin.id, delta, reason: reason || "korekta", note: note || null } });
      return updated;
    });
    return NextResponse.json({ item });
  } catch (error) { const code = error instanceof Error ? error.message : ""; return NextResponse.json({ error: code === "NEGATIVE_STOCK" ? "Stan magazynowy nie może być ujemny." : code === "NOT_FOUND" ? "Nie znaleziono pozycji." : "Nie udało się zapisać zmiany." }, { status: code === "NOT_FOUND" ? 404 : 400 }); }
}
