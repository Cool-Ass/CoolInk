export function parseBookingDraft(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Nieprawidłowy szkic.");
  const source = value as Record<string, unknown>;
  const text = (key: string, max: number) => {
    if (typeof source[key] !== "string" || (source[key] as string).length > max) throw new Error("Nieprawidłowy szkic.");
    return source[key] as string;
  };
  if (!Array.isArray(source.styles) || source.styles.length > 8 || source.styles.some((s) => typeof s !== "string" || s.length > 120)) throw new Error("Nieprawidłowy styl.");
  return { title: text("title", 160), description: text("description", 5000), placement: text("placement", 120), size: text("size", 120), notes: text("notes", 1000), consultationMode: text("consultationMode", 20), leadSource: text("leadSource", 120), styles: source.styles as string[] };
}
