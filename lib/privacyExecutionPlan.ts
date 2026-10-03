import { readPrivacyReview } from "@/lib/privacyReview";
export const PRIVACY_LOCKED_STATUSES = ["executing", "execution_failed", "completed", "completed_retained", "retention_review", "awaiting_retention_execution", "retention_retained"];
export function privacyExecutionPlan(note: string | null, counts: { financial: number; consents: number; futureAppointments: number; googleLinks: number }, now = Date.now()) {
  const review = readPrivacyReview(note);
  if (!review || review.decision !== "approve" || !review.identityConfirmed) throw new Error("Najpierw zatwierdź ocenę tożsamości i zakresu.");
  if (review.retainedScopes.length && (!review.retainUntil || Date.parse(review.retainUntil + "T23:59:59Z") <= now)) throw new Error("Odśwież termin i podstawę retencji przed wykonaniem.");
  const retained = new Set(review.retainedScopes);
  if (retained.has("auth") && !retained.has("profile")) throw new Error("Zachowane konto Auth zawiera identyfikację — wymaga retencji profilu.");
  if ((retained.has("financial") || retained.has("consents")) && !retained.has("profile")) throw new Error("Zachowane rozliczenia i zgody wymagają niezbędnej identyfikacji.");
  if (counts.financial && !retained.has("financial")) throw new Error("Historia rozliczeń wymaga osobnej retencji. Nie zostanie automatycznie usunięta.");
  if (counts.consents && !retained.has("consents")) throw new Error("Podpisane zgody wymagają osobnej retencji. Nie zostaną automatycznie usunięte.");
  if ((counts.financial || counts.consents) && !retained.has("profile")) throw new Error("Zachowaj niezbędną identyfikację osoby dla przechowywanych rozliczeń i zgód.");
  if (retained.has("chat") && !retained.has("inspirations")) throw new Error("Zachowanie rozmów wymaga zachowania ich załączników.");
  if (counts.futureAppointments) throw new Error("Najpierw zakończ lub anuluj przyszłe wizyty i propozycje.");
  if (counts.googleLinks) throw new Error("Najpierw usuń lub zanonimizuj powiązane wpisy Google i potwierdź synchronizację. Kopie zewnętrzne nie mogą zostać pominięte.");
  return review;
}
