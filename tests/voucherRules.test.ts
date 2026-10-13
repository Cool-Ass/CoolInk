import { describe, expect, it } from "vitest";
import { normalizeVoucherCode, voucherInput, visitSettlement } from "../lib/voucherRules";
import { DEFAULT_LOYALTY_RULES as rules } from "../lib/loyaltyRules";
const code = "CI-" + "A".repeat(32);
describe("single-use voucher business rules approved by the owner", () => {
  it("normalizes a private high-entropy code without accepting URLs or short guesses", () => { expect(normalizeVoucherCode(" " + code.toLowerCase() + " ")).toBe(code); for (const input of ["CI-123", "https://example.test/"+code, null, code+"?x"]) expect(() => normalizeVoucherCode(input)).toThrow(); });
  it("parses PLN to integer cents and ends validity in studio timezone", () => { const data = voucherInput({ amount: "100,25", recipientName: " Jan   Test ", validUntil: "2030-06-01" }, new Date("2030-01-01")); expect(data.amountCents).toBe(10025); expect(data.recipientName).toBe("Jan Test"); expect(data.validUntil.toISOString()).toBe("2030-06-01T21:59:59.999Z"); });
  it.each(["0", "-5", "NaN", "12.123", "1e4", "1000000.01"])("rejects invalid amount %s", amount => { expect(() => voucherInput({ amount, recipientName: "Jan Test", validUntil: "2030-01-01" }, new Date("2029-01-01"))).toThrow(); });
  it("rejects past or nonexistent dates", () => { for (const validUntil of ["2020-01-01", "2030-02-31", "2030-13-01", "bad"]) expect(() => voucherInput({ amount: "100", recipientName: "Jan Test", validUntil }, new Date("2029-01-01"))).toThrow(); });
  it("automatically subtracts a voucher without inventing extra cash receipts", () => { expect(visitSettlement(140000, false, 0, rules, 50000)).toMatchObject({ paidCents: 90000, voucherCents: 50000, discountCents: 0, stamps: 1 }); });
  it("caps application at the visit price; unused face value is not credited to another visit", () => { expect(visitSettlement(40000, false, 0, rules, 100000)).toMatchObject({ paidCents: 0, voucherCents: 40000, discountCents: 0 }); });
  it("never stacks a voucher with a stamp reward", () => { expect(() => visitSettlement(140000, true, 5, rules, 50000)).toThrow("Wybierz voucher"); });
  it("preserves normal loyalty and cash settlement", () => { expect(visitSettlement(140000, true, 5, rules)).toMatchObject({ paidCents: 70000, discountCents: 70000, voucherCents: 0, stamps: -5 }); });
});
