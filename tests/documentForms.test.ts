import { describe, expect, it } from "vitest";
import { parseDocumentFields, validateDocumentAnswers, type DocumentField } from "../lib/documentForms";
const fields: DocumentField[] = [{ id: "choice", label: "Wybierz", type: "single", required: true, options: ["Tak", "Nie"] }, { id: "note", label: "Uwagi", type: "text", required: false, options: [] }];
describe("versioned document forms", () => {
  it("normalizes valid fields and only retains known answers", () => {
    expect(parseDocumentFields(JSON.stringify(fields))).toEqual(fields);
    expect(validateDocumentAnswers(fields, { choice: "Tak", note: " tekst ", injected: "x" })).toEqual({ choice: "Tak", note: "tekst" });
  });
  it("rejects missing required answers and unknown options", () => {
    expect(() => validateDocumentAnswers(fields, {})).toThrow();
    expect(() => validateDocumentAnswers(fields, { choice: "Inne" })).toThrow();
    expect(() => validateDocumentAnswers(fields, { choice: "Tak", note: "a".repeat(4001) })).toThrow();
  });
  it("validates multiple choices without duplicate or arbitrary answers", () => {
    const multiple = [{ ...fields[0], type: "multiple" as const }];
    expect(validateDocumentAnswers(multiple, { choice: ["Tak", "Nie"] })).toEqual({ choice: ["Tak", "Nie"] });
    for (const choice of [[], ["Tak", "Tak"], ["Other"], "Tak"]) expect(() => validateDocumentAnswers(multiple, { choice })).toThrow();
  });
  it("rejects duplicate IDs, empty options and oversized schemas", () => {
    expect(() => parseDocumentFields([fields[0], fields[0]])).toThrow();
    expect(() => parseDocumentFields([{ ...fields[0], options: ["", "Nie"] }])).toThrow();
    expect(() => parseDocumentFields(Array(31).fill(fields[0]))).toThrow();
  });
});
