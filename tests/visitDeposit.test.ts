import { describe, expect, it } from "vitest";
import { validateVisitDeposit } from "../lib/visitDeposit";
import { DEFAULT_DEPOSIT_INSTRUCTIONS, validateDepositInstructions } from "../lib/depositInstructions";
import { blikDepositDetails } from "../lib/blikDeposit";
import { projectStatusAfterAppointmentChange } from "../lib/projectLifecycle";
describe("visit deposit validation", () => {
  it.each(["awaiting", "paid", "refunded", "forfeited"])("accepts a bounded positive amount for %s", status => {
    expect(validateVisitDeposit({ status, amount: 300, paymentMethod: " BLIK " })).toEqual({ depositStatus: status, depositAmount: 300, depositPaymentMethod: "BLIK" });
  });
  it.each([undefined, "300", -1, 0.5, NaN, Infinity, 10000001])("rejects invalid amount %s", amount => {
    expect(() => validateVisitDeposit({ status: "awaiting", amount, paymentMethod: "" })).toThrow();
  });
  it.each([0, null])("requires a positive amount when payment is requested (%s)", amount => {
    expect(() => validateVisitDeposit({ status: "awaiting", amount, paymentMethod: "" })).toThrow();
  });
  it("accepts no deposit and rejects unknown statuses or unbounded methods", () => {
    expect(validateVisitDeposit({ status: "not_required", amount: null, paymentMethod: "" }).depositAmount).toBeNull();
    expect(() => validateVisitDeposit({ status: "fake", amount: 300, paymentMethod: "" })).toThrow();
    expect(() => validateVisitDeposit({ status: "paid", amount: 300, paymentMethod: "x".repeat(81) })).toThrow();
  });
  it("derives project state from active visits, not a paid sibling or legacy project deposit", () => {
    expect(projectStatusAfterAppointmentChange([{ status: "confirmed", depositStatus: "awaiting" }, { status: "completed", depositStatus: "paid" }], "paid", "confirmed")).toBe("awaiting_deposit");
    expect(projectStatusAfterAppointmentChange([{ status: "confirmed", depositStatus: "paid" }], "awaiting", "awaiting_deposit")).toBe("confirmed");
  });
});
describe("editable payment instructions", () => {
  it("normalizes phone and uses it in client details", () => {
    const instructions = validateDepositInstructions({ ...DEFAULT_DEPOSIT_INSTRUCTIONS, phone: "123 456 789" });
    const visit = { id: "v", status: "confirmed", depositStatus: "awaiting", depositAmount: 300, projectKind: "tattoo", projectStatus: "confirmed" };
    expect(blikDepositDetails(visit, instructions)?.phoneLabel).toBe("123 456 789");
  });
  it.each(["", "+48530178346", "000000000", "53017834x"])("rejects invalid recipient %s", phone => {
    expect(() => validateDepositInstructions({ ...DEFAULT_DEPOSIT_INSTRUCTIONS, phone })).toThrow();
  });
  it("requires cash description only while cash is enabled", () => {
    expect(() => validateDepositInstructions({ ...DEFAULT_DEPOSIT_INSTRUCTIONS, cashDescription: "" })).toThrow();
    expect(validateDepositInstructions({ ...DEFAULT_DEPOSIT_INSTRUCTIONS, cashDescription: "", cashEnabled: false }).cashEnabled).toBe(false);
  });
  it("bounds text and rejects malformed settings", () => {
    expect(() => validateDepositInstructions(null)).toThrow();
    expect(() => validateDepositInstructions({ ...DEFAULT_DEPOSIT_INSTRUCTIONS, heading: "x".repeat(121) })).toThrow();
  });
});
