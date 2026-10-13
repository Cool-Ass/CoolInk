export type FlashConfiguration = {
  flashEnabled: boolean; flashUnique: boolean; flashSize: string | null;
  flashPrice: number | null; flashDurationMinutes: number; flashDepositAmount: number | null;
};
export type FlashSelection = FlashConfiguration & { id: string; title: string; description: string | null; imageUrl: string; updatedAt: string };
export function validateFlashConfiguration(body: Record<string, unknown>, previous?: FlashConfiguration): FlashConfiguration {
  const value = { flashEnabled: false, flashUnique: true, flashSize: null, flashPrice: null, flashDurationMinutes: 120, flashDepositAmount: null, ...previous, ...Object.fromEntries(Object.entries(body).filter(([key]) => key.startsWith("flash"))) };
  if (typeof value.flashEnabled !== "boolean" || typeof value.flashUnique !== "boolean") throw Error("Sprawdź dostępność i unikatowość wzoru.");
  const money = (raw: unknown) => {
    if (raw === null || raw === "" || raw === undefined) return null;
    if (!["string", "number"].includes(typeof raw)) throw Error("Nieprawidłowa kwota.");
    const amount = Number(raw);
    if (!Number.isSafeInteger(amount) || amount < 1 || amount > 10000000) throw Error("Podaj kwotę w pełnych złotych od 1 do 10 000 000.");
    return amount;
  };
  const duration = Number(value.flashDurationMinutes);
  if (!Number.isInteger(duration) || duration < 30 || duration > 720 || duration % 30) throw Error("Czas sesji: 30–720 minut, co 30 minut.");
  if (value.flashSize !== null && typeof value.flashSize !== "string") throw Error("Nieprawidłowy rozmiar.");
  const size = value.flashSize?.trim() || null;
  if ((size?.length ?? 0) > 120) throw Error("Opis rozmiaru jest za długi.");
  const price = money(value.flashPrice), deposit = money(value.flashDepositAmount);
  if (price && deposit && deposit > price) throw Error("Zadatek nie może przekraczać ceny wzoru.");
  if (value.flashEnabled && (!size || !price)) throw Error("Dostępny Flash wymaga rozmiaru i ceny.");
  return { flashEnabled: value.flashEnabled, flashUnique: value.flashUnique, flashSize: size, flashPrice: price, flashDurationMinutes: duration, flashDepositAmount: deposit };
}
// A project label must never release an existing or completed tattoo claim.
// Only a cancelled empty brief, or a brief with entirely cancelled/no-show
// visits, can release a unique design.
export const flashClaimWhere = { OR: [{ status: { not: "cancelled" }, appointments: { none: {} } }, { appointments: { some: { status: { notIn: ["cancelled", "no_show"] } } } }] };
