export type AftercareSettings = { enabled: boolean; checkInDay: number; photoDay: number; reviewDay: number; reviewUrl: string };
export const defaultAftercare: AftercareSettings = { enabled: false, checkInDay: 2, photoDay: 21, reviewDay: 30, reviewUrl: "" };
export function validateAftercare(raw: unknown): AftercareSettings {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw Error("Sprawdź ustawienia aftercare.");
  const input = raw as Record<string, unknown>;
  const days = [input.checkInDay, input.photoDay, input.reviewDay];
  if (typeof input.enabled !== "boolean" || days.some(value => typeof value !== "number" || !Number.isInteger(value) || value < 1 || value > 365) || !(Number(days[0]) < Number(days[1]) && Number(days[1]) < Number(days[2]))) throw Error("Dni muszą rosnąć: kontrola, zdjęcie, opinia (1–365).");
  if (typeof input.reviewUrl !== "string" || input.reviewUrl.length > 500) throw Error("Sprawdź link do opinii.");
  if (input.reviewUrl) {
    let url: URL; try { url = new URL(input.reviewUrl); } catch { throw Error("Podaj poprawny link Google HTTPS."); }
    if (url.protocol !== "https:" || url.username || url.password || !["google.com", "www.google.com", "search.google.com", "maps.google.com", "maps.app.goo.gl", "g.page"].includes(url.hostname)) throw Error("Dozwolony jest wyłącznie publiczny link opinii Google HTTPS.");
  }
  return { enabled: input.enabled, checkInDay: Number(days[0]), photoDay: Number(days[1]), reviewDay: Number(days[2]), reviewUrl: input.reviewUrl };
}
export function aftercarePlans(settings: AftercareSettings) {
  return [{ day: 0, type: "instructions", title: "Pielęgnacja po sesji", body: "Instrukcje studia znajdziesz w aftercare. Możesz też poprosić o konsultację." },
    { day: settings.checkInDay, type: "checkin", title: "Jak przebiega gojenie?", body: "Jeśli potrzebujesz konsultacji ze studiem, zgłoś ją w swoim koncie." },
    { day: settings.photoDay, type: "photo", title: "Pokaż wygojony tatuaż", body: "Dodaj zdjęcie do prywatnej galerii gojenia. Zobaczysz je tylko Ty i studio." },
    ...(settings.reviewUrl ? [{ day: settings.reviewDay, type: "review", title: "Podziel się opinią o wizycie", body: "Jeśli chcesz, możesz zostawić opinię Google. Link czeka w aftercare." }] : [])];
}
