export const PRIVACY_SCOPES = ["profile", "auth", "inspirations", "chat", "financial", "consents", "appointments"] as const;
export const PRIVACY_SCOPE_LABELS: Record<typeof PRIVACY_SCOPES[number], string> = { profile: "Profil i kontakt", auth: "Konto logowania", inspirations: "Zdjęcia i inspiracje", chat: "Rozmowy", financial: "Rozliczenia", consents: "Zgody i dokumenty", appointments: "Historia wizyt" };
export type PrivacyReview = { version: 1; decision: "review" | "approve" | "retain"; identityConfirmed: boolean; reason: string; response: string; retainedScopes: string[]; retainUntil: string | null; reviewerId: string; reviewedAt: string };
export function validatePrivacyReview(input: unknown, now = new Date()): Omit<PrivacyReview, "version" | "reviewerId" | "reviewedAt"> {
  if (!input || typeof input !== "object") throw new Error("Uzupełnij ocenę wniosku.");
  const data = input as Record<string, unknown>;
  if (!["review", "approve", "retain"].includes(String(data.decision))) throw new Error("Wybierz decyzję.");
  const decision = data.decision as PrivacyReview["decision"];
  const reason = typeof data.reason === "string" ? data.reason.trim() : "";
  const response = typeof data.response === "string" ? data.response.trim() : "";
  if (reason.length < 10 || reason.length > 2000 || response.length > 2000) throw new Error("Uzasadnienie: 10–2000 znaków; odpowiedź: maksymalnie 2000.");
  if (!Array.isArray(data.retainedScopes) || data.retainedScopes.some(scope => !PRIVACY_SCOPES.includes(scope)) || new Set(data.retainedScopes).size !== data.retainedScopes.length) throw new Error("Nieprawidłowy zakres retencji.");
  const retainedScopes = data.retainedScopes as string[];
  const retainUntil = typeof data.retainUntil === "string" && data.retainUntil ? data.retainUntil : null;
  if (retainedScopes.length) {
    if (!retainUntil || !/^\d{4}-\d{2}-\d{2}$/.test(retainUntil) || !Number.isFinite(Date.parse(retainUntil)) || new Date(retainUntil).toISOString().slice(0, 10) !== retainUntil || Date.parse(retainUntil + "T23:59:59Z") <= now.getTime()) throw new Error("Wskaż prawidłową przyszłą datę retencji.");
  } else if (retainUntil) throw new Error("Data retencji wymaga wskazania przechowywanych danych.");
  if (decision !== "review" && (data.identityConfirmed !== true || response.length < 10)) throw new Error("Potwierdź tożsamość i przygotuj odpowiedź dla klienta.");
  if (decision === "retain" && !retainedScopes.length) throw new Error("Decyzja o retencji wymaga zakresu i daty.");
  return { decision, identityConfirmed: data.identityConfirmed === true, reason, response, retainedScopes, retainUntil };
}
export function readPrivacyReview(note: string | null): PrivacyReview | null {
  try { const parsed = JSON.parse(note || "null"); if (parsed?.version !== 1 || typeof parsed.reviewerId !== "string" || typeof parsed.reviewedAt !== "string") return null; return { version: 1, ...validatePrivacyReview(parsed, new Date(0)), reviewerId: parsed.reviewerId, reviewedAt: parsed.reviewedAt }; } catch { return null; }
}
export function publicPrivacyStatus(row: { status: string; note: string | null; requestedAt: Date }) {
  const plan = readPrivacyReview(row.note);
  const labels: Record<string, string> = { pending: "Wniosek odebrany", reviewing: "W trakcie oceny", awaiting_execution: "Oczekuje osobnego zatwierdzenia wykonania", retained: "Decyzja o dalszym przechowywaniu danych", executing: "Wykonanie w toku — profil zablokowany", execution_failed: "Wykonanie wymaga ponowienia — profil zablokowany", completed: "Zatwierdzony zakres wykonany", completed_retained: "Zatwierdzony zakres wykonany — pozostała retencja" };
  const retentionLabels: Record<string, string> = { retention_review: "Ponowna ocena przechowywanych danych", awaiting_retention_execution: "Retencja — oczekuje osobnego wykonania", retention_retained: "Retencja przedłużona po ocenie" };
  return { label: labels[row.status] || retentionLabels[row.status] || "W trakcie obsługi", receivedAt: row.requestedAt.toISOString(), response: plan?.response || null, retainedUntil: plan?.retainUntil || null };
}
