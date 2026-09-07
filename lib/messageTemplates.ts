import { prisma } from "@/lib/prisma";

export type MessageTemplate = { id: string; label: string; body: string };

export const DEFAULT_MESSAGE_TEMPLATES: MessageTemplate[] = [
  { id: "received", label: "Potwierdzenie zgłoszenia", body: "Dziękuję za zgłoszenie. Sprawdzę szczegóły i wrócę do Ciebie z kolejnym krokiem." },
  { id: "details", label: "Prośba o szczegóły", body: "Podeślij proszę jeszcze przybliżony rozmiar, miejsce na ciele oraz 2–3 inspiracje. Dzięki temu lepiej ocenię projekt." },
  { id: "appointment", label: "Potwierdzenie wizyty", body: "Termin jest potwierdzony. Wszystkie szczegóły znajdziesz w swoim koncie klienta. Jeśli coś się zmieni, napisz tutaj." },
  { id: "preparation", label: "Przygotowanie do wizyty", body: "Przed wizytą wyśpij się, zjedz pełny posiłek, nawodnij się i nie spożywaj alkoholu. Załóż wygodne ubranie z łatwym dostępem do tatuowanego miejsca." },
  { id: "aftercare", label: "Pielęgnacja", body: "Instrukcję pielęgnacji znajdziesz w dokumentach na swoim koncie. W razie niepokojących objawów wyślij zdjęcie i napisz tutaj." },
];

export function parseMessageTemplates(value: string | null | undefined): MessageTemplate[] {
  if (!value) return DEFAULT_MESSAGE_TEMPLATES;
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return DEFAULT_MESSAGE_TEMPLATES;
    const normalized = parsed.slice(0, 20).map((item, index) => ({
      id: String(item?.id || `template-${index}`).slice(0, 80),
      label: String(item?.label || "").trim().slice(0, 80),
      body: String(item?.body || "").trim().slice(0, 2_000),
    })).filter((item) => item.label && item.body);
    return normalized;
  } catch {
    return DEFAULT_MESSAGE_TEMPLATES;
  }
}

export async function getMessageTemplates() {
  const setting = await prisma.siteSetting.findUnique({ where: { key: "message_templates" }, select: { value: true } });
  return parseMessageTemplates(setting?.value);
}
