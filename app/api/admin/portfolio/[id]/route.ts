import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/adminApi";
import { isSameOrigin } from "@/lib/requestSecurity";
import { lockBookingCalendar } from "@/lib/bookingRules";
import { validateFlashConfiguration } from "@/lib/flashBooking";
interface Params { params: Promise<{ id: string }> }
export async function PATCH(request: Request, { params }: Params) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const access = await requireAdminApi("content.manage"); if (!access.ok) return access.response;
  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ error: "Nieprawidłowe dane." }, { status: 400 });
  try {
    const item = await prisma.$transaction(async tx => {
      await lockBookingCalendar(tx);
      const current = await tx.portfolioItem.findUnique({ where: { id } });
      if (!current) throw Error("NOT_FOUND");
      let flash;
      try { flash = validateFlashConfiguration(body, current); }
      catch (error) { throw Error("INVALID_FLASH:" + (error instanceof Error ? error.message : "Sprawdź dane Flash.")); }
      if (current.flashUnique && !flash.flashUnique && await tx.tattooProject.count({ where: { flashPortfolioId: id } })) throw Error("CLAIMED");
      const updated = await tx.portfolioItem.update({ where: { id }, data: { ...flash,
        title: typeof body.title === "string" ? body.title.slice(0, 160) : current.title,
        description: typeof body.description === "string" ? body.description.slice(0, 5000) : current.description,
        imageUrl: typeof body.imageUrl === "string" ? body.imageUrl : current.imageUrl,
        category: typeof body.category === "string" ? body.category : current.category,
        tags: typeof body.tags === "string" ? body.tags : current.tags,
        published: typeof body.published === "boolean" ? body.published : current.published,
        order: Number.isSafeInteger(body.order) ? body.order : current.order,
      } });
      if (flash.flashEnabled || current.flashEnabled) await tx.adminAuditLog.create({ data: { adminUserId: access.admin.id, action: "flash.updated", targetType: "PortfolioItem", targetId: id, summary: "Zmieniono warunki lub dostępność wzoru Flash.", metadata: JSON.stringify(flash) } });
      return updated;
    }, { maxWait: 10000, timeout: 15000 });
    return NextResponse.json({ item });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code.startsWith("INVALID_FLASH:")) return NextResponse.json({ error: code.slice(14) }, { status: 400 });
    return NextResponse.json({ error: code === "CLAIMED" ? "Zarezerwowany wzór unikatowy nie może stać się powtarzalny." : code === "NOT_FOUND" ? "Nie znaleziono wzoru." : "Nie udało się zapisać. Spróbuj ponownie." }, { status: code === "CLAIMED" ? 409 : code === "NOT_FOUND" ? 404 : 503 });
  }
}
export async function DELETE(request: Request, { params }: Params) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const access = await requireAdminApi("content.manage"); if (!access.ok) return access.response;
  const { id } = await params;
  try {
    await prisma.$transaction(async tx => {
      await lockBookingCalendar(tx);
      if (!await tx.portfolioItem.findUnique({ where: { id }, select: { id: true } })) throw Error("NOT_FOUND");
      if (await tx.tattooProject.count({ where: { flashPortfolioId: id } })) throw Error("CLAIMED");
      await tx.portfolioItem.delete({ where: { id } });
    }, { maxWait: 10000, timeout: 15000 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    return NextResponse.json({ error: code === "NOT_FOUND" ? "Nie znaleziono wzoru." : code === "CLAIMED" ? "Wzór ma historię rezerwacji. Wyłącz publikację zamiast usuwać." : "Nie udało się usunąć. Spróbuj ponownie." }, { status: code === "NOT_FOUND" ? 404 : code === "CLAIMED" ? 409 : 503 });
  }
}
