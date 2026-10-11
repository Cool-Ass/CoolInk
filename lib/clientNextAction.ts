export function clientNextAction(projectStatus: string | undefined, visitStatus: string | undefined, missingConsents: number) {
  if (visitStatus === "proposed") return { label: "Potwierdź propozycję terminu", destination: "visit" as const };
  if (projectStatus === "awaiting_client") return { label: "Uzupełnij informacje dla studia", destination: "project" as const };
  if (visitStatus === "confirmed" && missingConsents > 0) return { label: "Uzupełnij formularze przed wizytą", destination: "documents" as const };
  return null;
}
