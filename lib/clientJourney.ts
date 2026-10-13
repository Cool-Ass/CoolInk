export const JOURNEY_STEPS = ["Rezerwacja", "Wizyta", "Dokumenty", "Sesja", "Rozliczenie", "Pielęgnacja"] as const;
export function bookingSteps(hasPendingConsents: boolean): (1 | 3 | 4)[] {
  return hasPendingConsents ? [1, 3, 4] : [1, 4];
}
export function clientJourneyStage(status: string, missingSignatures = 0, settled = false) {
  if (status === "completed") return settled ? 5 : 4;
  if (status === "confirmed") return missingSignatures ? 2 : 3;
  return 1;
}
