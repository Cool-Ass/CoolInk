export type DocumentField = { id: string; label: string; type: "text" | "single" | "multiple"; required: boolean; options: string[] };
export type DocumentAnswers = Record<string, string | string[]>;
export function parseDocumentFields(value: unknown): DocumentField[] {
  const fields: unknown = typeof value === "string" ? JSON.parse(value) : value ?? [];
  if (!Array.isArray(fields) || fields.length > 30) throw new Error("Formularz może zawierać do 30 pytań.");
  const ids = new Set<string>();
  return fields.map((field) => {
    if (!field || typeof field !== "object") throw new Error("Nieprawidłowe pytanie.");
    const { id, label, type, required, options } = field;
    if (typeof id !== "string" || !/^[a-zA-Z0-9_-]{1,80}$/.test(id) || ids.has(id) || typeof label !== "string" || !label.trim() || label.length > 500 || !["text", "single", "multiple"].includes(type) || typeof required !== "boolean") throw new Error("Uzupełnij treść każdego pytania.");
    ids.add(id);
    if (!Array.isArray(options) || options.length > 20 || options.some((option) => typeof option !== "string" || !option.trim() || option.length > 200) || new Set(options).size !== options.length || (type !== "text" && options.length < 2)) throw new Error("Podaj od 2 do 20 różnych odpowiedzi do wyboru.");
    return { id, label: label.trim(), type, required, options } as DocumentField;
  });
}
export function validateDocumentAnswers(fields: DocumentField[], input: unknown): DocumentAnswers {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Uzupełnij odpowiedzi formularza.");
  const values = input as Record<string, unknown>;
  const result: DocumentAnswers = {};
  for (const field of fields) {
    const value = values[field.id] ?? (field.type === "multiple" ? [] : "");
    if (field.type === "multiple") {
      if (!Array.isArray(value) || value.length > field.options.length || value.some((item) => typeof item !== "string" || !field.options.includes(item)) || new Set(value).size !== value.length || (field.required && !value.length)) throw new Error(`Sprawdź odpowiedź: ${field.label}`);
      result[field.id] = value;
    } else {
      if (typeof value !== "string" || value.length > 4000 || (field.required && !value.trim()) || (field.type === "single" && value !== "" && !field.options.includes(value))) throw new Error(`Sprawdź odpowiedź: ${field.label}`);
      result[field.id] = value.trim();
    }
  }
  return result;
}
