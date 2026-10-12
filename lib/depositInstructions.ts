export type DepositInstructions = { heading: string; phone: string; blikDescription: string; extra: string; cashEnabled: boolean; cashDescription: string };
export const DEPOSIT_INSTRUCTIONS_KEY = "deposit_instructions";
export const DEFAULT_DEPOSIT_INSTRUCTIONS: DepositInstructions = {
  heading: "Istnieją dwie opcje wpłaty zadatku",
  phone: "530178346",
  blikDescription: "W aplikacji swojego banku wybierz przelew BLIK na telefon. Przed zatwierdzeniem sprawdź numer odbiorcy i kwotę.",
  extra: "Jeśli bank pozwala, wpisz podany tytuł przelewu.",
  cashEnabled: true,
  cashDescription: "Możesz wpłacić zadatek gotówką w studiu. Skontaktuj się z nami, aby ustalić termin wpłaty.",
};
export function validateDepositInstructions(raw: unknown): DepositInstructions {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("Sprawdź ustawienia zadatków.");
  const input = raw as Record<string, unknown>;
  const text = (key: string, max: number, required = false) => {
    const value = input[key];
    if (typeof value !== "string" || value.length > max || (required && !value.trim())) throw new Error("Uzupełnij nagłówek i instrukcję, przestrzegając limitów długości.");
    return value.trim();
  };
  const phone = text("phone", 30, true).replace(/\s/g, "");
  if (!/^[1-9]\d{8}$/.test(phone)) throw new Error("Podaj polski numer telefonu: 9 cyfr bez prefiksu kraju.");
  if (typeof input.cashEnabled !== "boolean") throw new Error("Wybierz dostępność gotówki.");
  return { heading: text("heading", 120, true), phone, blikDescription: text("blikDescription", 1500, true), extra: text("extra", 1500), cashEnabled: input.cashEnabled, cashDescription: text("cashDescription", 1500, input.cashEnabled) };
}
