import type { Prisma } from "@prisma/client";
import { normalizeVoucherCode } from "@/lib/voucherRules";
export class VoucherError extends Error {}
/** Caller holds the calendar lock shared by booking, finance and assignment. */
export async function assertVoucherVisitChange(tx: Prisma.TransactionClient, appointmentId: string, startsAt: Date, status: string, serviceType: string | null, price?: number | null) {
  const voucher = await tx.voucher.findUnique({ where: { appointmentId }, include: { appointment: { select: { startsAt: true, price: true, serviceType: true } } } });
  if (!voucher) return;
  if (voucher.redeemedAt && (status !== "completed" || startsAt.getTime() !== voucher.appointment?.startsAt.getTime() || serviceType !== voucher.appointment?.serviceType || (price !== undefined && price !== voucher.appointment?.price))) throw new VoucherError("Wykorzystany voucher chroni historię tej wizyty. Najpierw wyjaśnij korektę rozliczenia.");
  if (!["cancelled", "no_show"].includes(status) && (startsAt > voucher.validUntil || (serviceType && serviceType !== "tattoo"))) throw new VoucherError("Termin lub usługa nie spełniają warunków vouchera.");
}
export async function availableVoucher(tx: Prisma.TransactionClient, input: unknown, clientId: string, startsAt: Date, appointmentId?: string) {
  let code: string;
  try { code = normalizeVoucherCode(input); } catch { throw new VoucherError("Sprawdź kod vouchera."); }
  const voucher = await tx.voucher.findUnique({ where: { code }, include: { appointment: { select: { id: true, status: true } } } });
  if (!voucher || voucher.cancelledAt || voucher.redeemedAt || startsAt > voucher.validUntil || !Number.isFinite(startsAt.getTime()) || (voucher.clientId && voucher.clientId !== clientId) || (voucher.appointment && voucher.appointment.id !== appointmentId && !["cancelled", "no_show"].includes(voucher.appointment.status))) throw new VoucherError("Voucher jest niedostępny, wykorzystany albo nieważny dla wybranego terminu.");
  return voucher;
}
