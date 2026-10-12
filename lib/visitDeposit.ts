import { DEPOSIT_STATUS } from "@/lib/projectWorkflow";
export function validateVisitDeposit(body: unknown) {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("Nieprawidłowe dane zadatku.");
  const input = body as Record<string, unknown>;
  if (typeof input.status !== "string" || !(DEPOSIT_STATUS as readonly string[]).includes(input.status)) throw new Error("Wybierz status zadatku.");
  const amount = input.amount;
  if (amount !== null && (typeof amount !== "number" || !Number.isSafeInteger(amount) || amount < 0 || amount > 10_000_000)) throw new Error("Kwota musi być pełną, nieujemną liczbą PLN.");
  if (input.status !== "not_required" && (amount === null || (amount as number) <= 0)) throw new Error("Podaj dodatnią kwotę zadatku.");
  if (typeof input.paymentMethod !== "string" || input.paymentMethod.length > 80) throw new Error("Metoda płatności może mieć do 80 znaków.");
  return { depositStatus: input.status, depositAmount: amount as number | null, depositPaymentMethod: input.paymentMethod.trim() || null };
}
