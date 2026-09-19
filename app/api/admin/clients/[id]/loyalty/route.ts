import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import { hasAdminPermission } from "@/lib/adminPermissions";
import { prisma } from "@/lib/prisma";
import { isSameOrigin, rateLimit, tooManyRequests } from "@/lib/requestSecurity";
import { lockBookingCalendar } from "@/lib/bookingRules";
import { loyaltyBalance } from "@/lib/loyalty";
import { loyaltySettlement } from "@/lib/loyaltyRules";

class LoyaltyError extends Error {}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const admin = await getCurrentAdmin();
  if (!admin || !hasAdminPermission(admin.role, "finance.manage")) return NextResponse.json({ error: "Brak uprawnień do rozliczeń." }, { status: 403 });
  const limit = await rateLimit(request, "loyalty", 30, 60_000, admin.id);
  if (!limit.allowed) return tooManyRequests(limit);
  const { id: clientId } = await params;
  const body = await request.json().catch(() => null);
  if (!body || !["settle", "paper", "void"].includes(body.action)) return NextResponse.json({ error: "Nieprawidłowa operacja." }, { status: 400 });
  try {
    await prisma.$transaction(async (tx) => {
      // Same lock order as appointment edits; serialize redemptions across projects.
      await lockBookingCalendar(tx);
      const clients = await tx.$queryRaw<Array<{ id: string }>>`SELECT "id" FROM "Client" WHERE "id" = ${clientId} FOR UPDATE`;
      if (!clients.length) throw new LoyaltyError("Nie znaleziono klienta.");
      const balance = await loyaltyBalance(clientId, tx);
      const note = typeof body.note === "string" ? body.note.trim().slice(0, 500) : "";
      if (body.action === "void") {
        if (!note) throw new LoyaltyError("Podaj powód wycofania rozliczenia.");
        const entry = await tx.loyaltyEntry.findFirst({ where: { id: String(body.entryId ?? ""), clientId } });
        if (!entry) throw new LoyaltyError("Nie znaleziono wpisu.");
        if (entry.voidedAt) return;
        if (balance - entry.stamps < 0) throw new LoyaltyError("Pieczątki zostały wykorzystane. Najpierw wycofaj powiązany rabat.");
        await tx.loyaltyEntry.update({ where: { id: entry.id }, data: { voidedAt: new Date(), voidedBy: admin.id, voidReason: note } });
        await tx.clientNotification.create({ data: { clientId, type: "LOYALTY_CORRECTION", title: "Korekta karty lojalnościowej", body: "Studio wycofało rozliczenie. Sprawdź aktualny stan karty.", href: "/app/portal" } });
        return;
      }
      if (body.action === "paper") {
        if (!Number.isInteger(body.stamps) || body.stamps < 1 || body.stamps > 5 || !note) throw new LoyaltyError("Podaj od 1 do 5 pieczątek i opis przenoszonej karty.");
        if (await tx.loyaltyEntry.findUnique({ where: { key: `paper:${clientId}` } })) throw new LoyaltyError("Papierowa karta tego klienta została już przeniesiona.");
        await tx.loyaltyEntry.create({ data: { clientId, key: `paper:${clientId}`, kind: "paper", stamps: body.stamps, note, adminId: admin.id } });
        await tx.clientNotification.create({ data: { clientId, type: "LOYALTY_PAPER", title: "Twoja karta jest już online", body: `Przeniesiono ${body.stamps} pieczątek. ${balance + body.stamps >= 5 ? "Masz dostępny rabat −50%, do 700 zł." : "Sprawdź postęp w panelu."}`, href: "/app/portal" } });
        return;
      }
      if (body.paid !== true || typeof body.redeem !== "boolean") throw new LoyaltyError("Potwierdź opłacenie wizyty i wybierz sposób rozliczenia.");
      const appointmentId = String(body.appointmentId ?? "");
      const visit = await tx.appointment.findFirst({ where: { id: appointmentId, project: { clientId } }, include: { project: { select: { kind: true, title: true } } } });
      if (!visit || visit.status !== "completed" || visit.startsAt > new Date()) throw new LoyaltyError("Wybierz zrealizowaną wizytę należącą do klienta.");
      if (visit.project.kind === "consultation" || (visit.serviceType && visit.serviceType !== "tattoo")) throw new LoyaltyError("Program dotyczy wyłącznie wizyt z tatuażem.");
      const prior = await tx.loyaltyEntry.findUnique({ where: { key: `visit:${appointmentId}` } });
      if (prior) {
        if (!prior.voidedAt && prior.grossCents === body.grossCents && (prior.stamps === -5) === body.redeem) return;
        throw new LoyaltyError("Ta wizyta została już rozliczona. Nie można naliczyć pieczątki ponownie.");
      }
      let settlement;
      try { settlement = loyaltySettlement(body.grossCents, body.redeem, balance); } catch (error) { throw new LoyaltyError((error as Error).message); }
      await tx.loyaltyEntry.create({ data: { clientId, appointmentId, key: `visit:${appointmentId}`, kind: "visit", ...settlement, note: visit.project.title, adminId: admin.id } });
      await tx.projectActivity.create({ data: { projectId: visit.projectId, type: "appointment_settled", message: `Rozliczono wizytę: ${(settlement.paidCents / 100).toFixed(2)} zł. Rabat: ${(settlement.discountCents / 100).toFixed(2)} zł.`, visibility: "both" } });
      const rewardEarned = Math.floor((balance + settlement.stamps) / 5) > Math.floor(balance / 5);
      await tx.clientNotification.create({ data: { clientId, projectId: visit.projectId, appointmentId, type: "LOYALTY_SETTLED", title: rewardEarned ? "Masz rabat −50% na tatuaż!" : body.redeem ? "Rabat lojalnościowy wykorzystany" : settlement.stamps ? "Nowa pieczątka na Twojej karcie" : "Wizyta rozliczona", body: rewardEarned ? "Wykorzystaj nagrodę na wybranej kolejnej wizycie. Maksymalna zniżka: 700 zł." : "Sprawdź rozliczenie i stan karty w swoim panelu.", href: "/app/portal" } });
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof LoyaltyError) return NextResponse.json({ error: error.message }, { status: 409 });
    return NextResponse.json({ error: "Nie udało się zapisać rozliczenia. Odśwież kartę i spróbuj ponownie." }, { status: 500 });
  }
}
