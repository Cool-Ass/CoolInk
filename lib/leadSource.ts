export const LEAD_SOURCES = [
  ["instagram", "Instagram"],
  ["facebook", "Facebook"],
  ["google", "Google / Mapy"],
  ["recommendation", "Polecenie"],
  ["returning", "Jestem stałym klientem"],
  ["event", "Event / wydarzenie"],
  ["other", "Inne"],
] as const;

export type LeadSource = (typeof LEAD_SOURCES)[number][0];
export const LEAD_SOURCE_LABEL = Object.fromEntries(LEAD_SOURCES) as Record<LeadSource, string>;

export function normalizeLeadSource(value: unknown) {
  const source = String(value ?? "").trim().toLowerCase();
  return (LEAD_SOURCES as readonly (readonly string[])[]).some(([key]) => key === source) ? source as LeadSource : null;
}
