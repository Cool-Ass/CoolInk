import { describe, expect, it } from "vitest";
import { DEFAULT_MESSAGE_TEMPLATES, parseMessageTemplates } from "@/lib/messageTemplates";

describe("message templates", () => {
  it("uses safe defaults for malformed data", () => {
    expect(parseMessageTemplates("not-json")).toEqual(DEFAULT_MESSAGE_TEMPLATES);
  });

  it("drops empty templates and caps field lengths", () => {
    const result = parseMessageTemplates(JSON.stringify([{ id: "one", label: " Odpowiedź ", body: " Treść " }, { label: "", body: "x" }]));
    expect(result).toEqual([{ id: "one", label: "Odpowiedź", body: "Treść" }]);
  });
});
