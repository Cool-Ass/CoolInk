import { localDateTimeToIso, toCoolinkDateTimeInput } from "@/lib/dateTime";
import { loyaltySettlement, type LoyaltyRules, validateLoyaltyRules } from "@/lib/loyaltyRules";
export const VOUCHER_TERMS = "Voucher jednorazowy. Niewykorzystana kwota przepada. Nie łączy się z rabatem za pieczątki.";
export function normalizeVoucherCode(value: unknown) {
  const code = typeof value === "string" ? value.trim().toUpperCase() : "";
  if (!/^CI-[A-F0-9]{32}$/.test(code)) throw Error("Sprawdź kod vouchera.");
  return code;
}
export function voucherInput(value: unknown, now = new Date()) {
  const data = value as Record<string, unknown> | null;
  const amount = String(data?.amount ?? "");
  const recipientName = String(data?.recipientName ?? "").trim().replace(/\s+/g, " ");
  const day = String(data?.validUntil ?? "");
  if (!/^\d+(?:[.,]\d{1,2})?$/.test(amount) || recipientName.length < 3 || recipientName.length > 160 || !/^\d{4}-\d{2}-\d{2}$/.test(day)) throw Error("Podaj kwotę, imię i nazwisko oraz datę ważności.");
  const amountCents = Math.round(Number(amount.replace(",", ".")) * 100);
  const validUntil = new Date(new Date(localDateTimeToIso(day + "T23:59")).getTime() + 59999);
  if (!Number.isSafeInteger(amountCents) || amountCents < 1 || amountCents > 100000000 || !Number.isFinite(validUntil.getTime()) || toCoolinkDateTimeInput(validUntil).slice(0, 10) !== day || validUntil < now) throw Error("Sprawdź kwotę i przyszłą datę ważności.");
  return { amountCents, recipientName, validUntil };
}
export function reservedLoyaltyRules(value: string | null | undefined) {
  return value ? validateLoyaltyRules(JSON.parse(value)) : null;
}
export function reservedStampCost(reservations: { loyaltyReservation?: string | null }[], current: LoyaltyRules) {
  return reservations.reduce((sum, visit) => sum + (reservedLoyaltyRules(visit.loyaltyReservation) ?? current).stampsRequired, 0);
}
export function visitSettlement(grossCents: number, redeem: boolean, balance: number, rules: LoyaltyRules, voucherAmountCents = 0) {
  if (!Number.isSafeInteger(voucherAmountCents) || voucherAmountCents < 0 || voucherAmountCents > 100000000) throw Error("Nieprawidłowa kwota vouchera.");
  if (redeem && voucherAmountCents) throw Error("Wybierz voucher albo rabat za pieczątki.");
  const base = loyaltySettlement(grossCents, redeem, balance, rules);
  const voucherCents = Math.min(base.paidCents, voucherAmountCents);
  return { ...base, voucherCents, paidCents: base.paidCents - voucherCents };
}
