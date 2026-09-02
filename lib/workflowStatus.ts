/** Polish, presentation-only labels for operational workflow values. */
const appointmentLabels: Record<string, string> = { requested: "OCZEKUJE NA DECYZJĘ STUDIA", proposed: "OCZEKUJE NA TWOJĄ DECYZJĘ", confirmed: "POTWIERDZONA", completed: "ZAKOŃCZONA", cancelled: "ANULOWANA", no_show: "NIEOBECNOŚĆ" };
const projectLabels: Record<string, string> = { inquiry: "NOWE ZGŁOSZENIE", reviewing: "W TRAKCIE ANALIZY", awaiting_client: "WYMAGA TWOJEJ ODPOWIEDZI", awaiting_confirmation: "OCZEKUJE NA STUDIO", date_proposed: "TERMIN ZAPROPONOWANY", awaiting_deposit: "OCZEKUJE NA ZADATEK", designing: "PROJEKT W PRZYGOTOWANIU", in_progress: "W REALIZACJI", awaiting_next_session: "KOLEJNA SESJA", accepted: "ZAAKCEPTOWANY", scheduled: "ZAPLANOWANY", confirmed: "W REALIZACJI", completed: "ZAKOŃCZONY", cancelled: "ANULOWANY" };
const depositLabels: Record<string, string> = { not_required: "ZADATEK NIEWYMAGANY", awaiting: "OCZEKUJE NA ZADATEK", paid: "ZADATEK OPŁACONY", refunded: "ZADATEK ZWRÓCONY", forfeited: "ZADATEK PRZEPADŁ" };

export function appointmentStatusLabel(status: string | null | undefined) { return appointmentLabels[String(status ?? "")] ?? "STATUS WYMAGA WERYFIKACJI"; }
export function projectStatusLabel(status: string | null | undefined) { return projectLabels[String(status ?? "")] ?? "STATUS WYMAGA WERYFIKACJI"; }
export function depositStatusLabel(status: string | null | undefined) { return depositLabels[String(status ?? "")] ?? "ZADATEK — BRAK DANYCH"; }
export function isHistoricalAppointment(status: string | null | undefined) { return status === "completed" || status === "no_show" || status === "cancelled"; }
