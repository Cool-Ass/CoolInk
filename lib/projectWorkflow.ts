import { projectStatusLabel } from "@/lib/workflowStatus";

export const PROJECT_STATUSES = [
  "inquiry",
  "reviewing",
  "awaiting_client",
  "date_proposed",
  "awaiting_confirmation",
  "awaiting_deposit",
  "confirmed",
  "designing",
  "in_progress",
  "awaiting_next_session",
  "completed",
  "cancelled",
  // Existing values remain accepted so current records keep working.
  "accepted",
  "scheduled",
] as const;

export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const ADMIN_STATUS_LABEL: Record<ProjectStatus, string> = {
  inquiry: "Nowe zgłoszenie",
  reviewing: "Do przejrzenia",
  awaiting_client: "Oczekiwanie na klienta",
  date_proposed: "Termin zaproponowany",
  awaiting_confirmation: projectStatusLabel("awaiting_confirmation"),
  awaiting_deposit: "Oczekiwanie na zadatek",
  confirmed: "Wizyta potwierdzona",
  designing: "Projekt w przygotowaniu",
  in_progress: "W trakcie realizacji",
  awaiting_next_session: "Oczekiwanie na kolejną sesję",
  completed: "Zakończony",
  cancelled: "Anulowany",
  accepted: "Zaakceptowany (starszy status)",
  scheduled: "Wizyta zaplanowana (starszy status)",
};

export const CLIENT_STATUS: Record<ProjectStatus, { label: string; next: string }> = {
  inquiry: { label: "Zgłoszenie otrzymane", next: "Przejrzę Twój pomysł i wrócę z kolejnym krokiem." },
  reviewing: { label: "Analizuję Twój projekt", next: "Sprawdzam szczegóły projektu i dostępność terminów." },
  awaiting_client: { label: "Potrzebuję dodatkowych informacji", next: "Uzupełnij informacje, o które poproszę." },
  date_proposed: { label: "Termin zaproponowany", next: "Sprawdź proponowaną wizytę i zaakceptuj ją albo poproś o inny termin." },
  awaiting_confirmation: { label: projectStatusLabel("awaiting_confirmation"), next: "Studio sprawdzi szczegóły i potwierdzi termin." },
  awaiting_deposit: { label: "Termin zaakceptowany — czekam na zadatek", next: "Po oznaczeniu zadatku jako wpłaconego potwierdzę wizytę." },
  confirmed: { label: "Wizyta potwierdzona", next: "Przygotuj się do wizyty zgodnie z dokumentami na koncie." },
  designing: { label: "Projekt w przygotowaniu", next: "Pracuję nad szczegółami Twojego tatuażu." },
  in_progress: { label: "Projekt w realizacji", next: "Twoje sesje są prowadzone zgodnie z planem." },
  awaiting_next_session: { label: "Czekamy na kolejną sesję", next: "Sprawdź najbliższą zaplanowaną wizytę." },
  completed: { label: "Projekt zakończony", next: "Dziękuję za zaufanie i pamiętaj o pielęgnacji." },
  cancelled: { label: "Projekt anulowany", next: "Jeśli chcesz wrócić do pomysłu, możesz wysłać nowe zgłoszenie." },
  accepted: { label: "Projekt zaakceptowany", next: "Ustalimy teraz dogodny termin wizyty." },
  scheduled: { label: "Wizyta zaplanowana", next: "Sprawdź szczegóły terminu poniżej." },
};

export const DEPOSIT_STATUS = ["not_required", "awaiting", "paid", "refunded", "forfeited"] as const;
export type DepositStatus = (typeof DEPOSIT_STATUS)[number];

export function isProjectStatus(value: unknown): value is ProjectStatus {
  return typeof value === "string" && (PROJECT_STATUSES as readonly string[]).includes(value);
}

export function activityMessage(type: string, detail?: string) {
  const base: Record<string, string> = {
    project_created: "Klient wysłał zgłoszenie.",
    project_reviewed: "Administrator rozpoczął analizę zgłoszenia.",
    status_changed: "Zmieniono status projektu.",
    appointment_proposed: "Zaproponowano termin wizyty.",
    appointment_requested: "Klient zaproponował termin wizyty.",
    appointment_confirmed: "Wizyta została potwierdzona.",
    appointment_updated: "Zaktualizowano wizytę.",
    appointment_cancelled: "Anulowano wizytę.",
    deposit_updated: "Zaktualizowano status zadatku.",
  };
  return detail ? `${base[type] ?? "Zaktualizowano projekt."} ${detail}` : (base[type] ?? "Zaktualizowano projekt.");
}
