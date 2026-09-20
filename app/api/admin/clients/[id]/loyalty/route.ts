import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import { hasAdminPermission } from "@/lib/adminPermissions";
import { prisma } from "@/lib/prisma";
import { isSameOrigin, rateLimit, tooManyRequests } from "@/lib/requestSecurity";
import { lockBookingCalendar } from "@/lib/bookingRules";
import { loyaltyBalance } from "@/lib/loyalty";
import { loyaltySettlement } from "@/lib/loyaltyRules";

import { getLoyaltyRules } from "@/lib/loyaltySettings";
import { projectStatusAfterAppointmentChange } from "@/lib/projectLifecycle";

class LoyaltyError extends Error {}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const admin = await getCurrentAdmin();
  if (!admin || !hasAdminPermission(admin.role, "finance.manage")) return NextResponse.json({ error: "Brak uprawnień do rozliczeń." }, { status: 403 });
  const limit = await rateLimit(request, "loyalty", 30, 60_000, admin.id);
  if (!limit.allowed) return tooManyRequests(limit);
  const { id: clientId } = await params;
  const body = await request.json().catch(() => null);
  if (!body || !["settle", "complete", "paper", "void"].includes(body.action)) return NextResponse.json({ error: "Nieprawidłowa operacja." }, { status: 400 });
  try {
    await prisma.$transaction(async (tx) => {
      // Same lock order as appointment edits; serialize redemptions across projects.
      await lockBookingCalendar(tx);
      const clients = await tx.$queryRaw<Array<{ id: string }>>`SELECT "id" FROM "Client" WHERE "id" = ${clientId} FOR UPDATE`;
      if (!clients.length) throw new LoyaltyError("Nie znaleziono klienta.");
      const balance = await loyaltyBalance(clientId, tx);
      const rules = await getLoyaltyRules(tx);
      if (["settle", "paper"].includes(body.action) && (!body.rules || Object.entries(rules).some(([key, value]) => body.rules[key] !== value))) throw new LoyaltyError("Zasady programu zmieniły się. Odśwież stronę i sprawdź nową kwotę przed rozliczeniem.");
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
        if (!Number.isInteger(body.stamps) || body.stamps < 1 || body.stamps > rules.stampsRequired || !note) throw new LoyaltyError(`Podaj od 1 do ${rules.stampsRequired} pieczątek i opis przenoszonej karty.`);
        if (await tx.loyaltyEntry.findUnique({ where: { key: `paper:${clientId}` } })) throw new LoyaltyError("Papierowa karta tego klienta została już przeniesiona.");
        await tx.loyaltyEntry.create({ data: { clientId, key: `paper:${clientId}`, kind: "paper", stamps: body.stamps, note, adminId: admin.id } });
        await tx.clientNotification.create({ data: { clientId, type: "LOYALTY_PAPER", title: "Twoja karta jest już online", body: `Przeniesiono ${body.stamps} pieczątek. ${balance + body.stamps >= rules.stampsRequired ? `Masz dostępny rabat −${rules.discountPercent}%, do ${rules.maxDiscountCents / 100} zł.` : "Sprawdź postęp w panelu."}`, href: "/app/portal" } });
        return;
      }
      if (body.action === "settle" && (body.paid !== true || typeof body.redeem !== "boolean")) throw new LoyaltyError("Potwierdź opłacenie wizyty i wybierz sposób rozliczenia.");
      const appointmentId = String(body.appointmentId ?? "");
      const visit = await tx.appointment.findFirst({ where: { id: appointmentId, project: { clientId } }, include: { project: { select: { kind: true, title: true, status: true, depositStatus: true } } } });
      if (!visit || !["completed", "confirmed"].includes(visit.status) || visit.startsAt > new Date()) throw new LoyaltyError("Wybierz rozpoczętą, potwierdzoną lub zrealizowaną wizytę klienta.");
      if (visit.project.kind === "consultation" || (visit.serviceType && visit.serviceType !== "tattoo")) throw new LoyaltyError("Program dotyczy wyłącznie wizyt z tatuażem.");
      const prior = await tx.loyaltyEntry.findUnique({ where: { key: `visit:${appointmentId}` } });
      if (prior) {
        if (body.action === "complete") throw new LoyaltyError("Ta wizyta została już rozliczona.");
        if (!prior.voidedAt && prior.grossCents === body.grossCents && (prior.stamps < 0) === body.redeem) return;
        throw new LoyaltyError("Ta wizyta została już rozliczona. Nie można naliczyć pieczątki ponownie.");
      }
      const completeVisit = async () => {
        if (visit.status !== "completed") await tx.appointment.update({ where: { id: appointmentId }, data: { status: "completed" } });
        if (body.nextStep === "next" || body.nextStep === "finish") {
          const appointments = await tx.appointment.findMany({ where: { projectId: visit.projectId }, select: { status: true } });
          const fallback = body.nextStep === "next" ? "awaiting_next_session" : "completed";
          const status = projectStatusAfterAppointmentChange(appointments, visit.project.depositStatus, fallback);
          await tx.tattooProject.update({ where: { id: visit.projectId }, data: { status, nextAction: body.nextStep === "next" ? "Ustal termin kolejnej sesji" : null, nextActionDueAt: null } });
        }
      };
      if (body.action === "complete") {
        if (visit.status === "completed") return;
        await completeVisit();
        await tx.projectActivity.create({ data: { projectId: visit.projectId, type: "appointment_completed", message: "Zakończono wizytę. Płatność pozostaje do rozliczenia.", visibility: "both" } });
        return;
      }
      let settlement;
      try { settlement = loyaltySettlement(body.grossCents, body.redeem, balance, rules); } catch (error) { throw new LoyaltyError((error as Error).message); }
      await completeVisit();
      await tx.loyaltyEntry.create({ data: { clientId, appointmentId, key: `visit:${appointmentId}`, kind: "visit", ...settlement, note: visit.project.title, adminId: admin.id } });
      await tx.projectActivity.create({ data: { projectId: visit.projectId, type: "appointment_settled", message: `Rozliczono wizytę: ${(settlement.paidCents / 100).toFixed(2)} zł. Rabat: ${(settlement.discountCents / 100).toFixed(2)} zł.`, visibility: "both" } });
      const rewardEarned = Math.floor((balance + settlement.stamps) / rules.stampsRequired) > Math.floor(balance / rules.stampsRequired);
      await tx.clientNotification.create({ data: { clientId, projectId: visit.projectId, appointmentId, type: "LOYALTY_SETTLED", title: rewardEarned ? `Masz rabat −${rules.discountPercent}% na tatuaż!` : body.redeem ? "Rabat lojalnościowy wykorzystany" : settlement.stamps ? "Nowa pieczątka na Twojej karcie" : "Wizyta rozliczona", body: rewardEarned ? `Wykorzystaj nagrodę na wybranej kolejnej wizycie. Maksymalna zniżka: ${rules.maxDiscountCents / 100} zł.` : "Sprawdź rozliczenie i stan karty w swoim panelu.", href: "/app/portal" } });
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof LoyaltyError) return NextResponse.json({ error: error.message }, { status: 409 });
    return NextResponse.json({ error: "Nie udało się zapisać rozliczenia. Odśwież kartę i spróbuj ponownie." }, { status: 500 });
  }
}
