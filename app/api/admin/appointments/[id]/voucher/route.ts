import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/adminApi";
import { isSameOrigin, rateLimit, tooManyRequests } from "@/lib/requestSecurity";
import { lockBookingCalendar } from "@/lib/bookingRules";
import { availableVoucher } from "@/lib/vouchers";
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const access = await requireAdminApi("finance.manage"); if (!access.ok) return access.response;
  const limit = await rateLimit(request, "voucher-assign", 30, 60000, access.admin.id); if (!limit.allowed) return tooManyRequests(limit);
  const { id } = await params; const body = await request.json().catch(() => null);
  try { await prisma.$transaction(async tx => {
    await lockBookingCalendar(tx);
    const visit = await tx.appointment.findUnique({ where: { id }, include: { project: { select: { clientId: true, kind: true } }, loyaltyEntry: true, voucher: true } });
    if (!visit || visit.project.kind !== "tattoo" || (visit.serviceType && visit.serviceType !== "tattoo") || visit.loyaltyEntry || !["requested", "proposed", "confirmed", "completed"].includes(visit.status) || visit.loyaltyReserved || visit.voucher) throw Error("Najpierw sprawdź wizytę, voucher i wybraną nagrodę.");
    const voucher = await availableVoucher(tx, body?.code, visit.project.clientId, visit.startsAt, id);
    await tx.voucher.update({ where: { id: voucher.id }, data: { appointmentId: id, clientId: visit.project.clientId } });
    await tx.appointment.update({ where: { id }, data: { voucherRequested: true, loyaltyRequested: false } });
    await tx.adminAuditLog.create({ data: { adminUserId: access.admin.id, action: "voucher.assigned", targetType: "Appointment", targetId: id, summary: "Przypisano zweryfikowany voucher do wizyty." } });
  }, { maxWait: 10000, timeout: 15000 }); return NextResponse.json({ ok: true }); }
  catch { return NextResponse.json({ error: "Voucher lub wizyta są niedostępne. Sprawdź kod, datę i wybraną nagrodę." }, { status: 409 }); }
}
