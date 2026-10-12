import { describe, expect, it } from "vitest";
import { blikDepositDetails, BLIK_DEPOSIT_PHONE } from "../lib/blikDeposit";

const project = { id: "visit-test", projectKind: "tattoo", projectStatus: "awaiting_deposit", status: "confirmed", depositStatus: "awaiting", depositAmount: 300 };

describe("BLIK phone deposit instructions", () => {
  it("uses the owner-approved recipient, exact PLN amount and stable visit reference", () => {
    expect(blikDepositDetails(project)).toEqual({ phone: "530178346", phoneLabel: "530 178 346", amount: 300, reference: "Zadatek visit-test" });
    expect(BLIK_DEPOSIT_PHONE).toMatch(/^\d{9}$/);
    expect(project.depositStatus).toBe("awaiting");
  });
  it.each([null, 0, -1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])("does not request an invalid/unset amount %s", depositAmount => {
    expect(blikDepositDetails({ ...project, depositAmount })).toBeNull();
  });
  it.each(["paid", "refunded", "forfeited", "not_required", "unknown"])("does not request %s deposits", depositStatus => {
    expect(blikDepositDetails({ ...project, depositStatus })).toBeNull();
  });
  it.each(["completed", "cancelled"])("does not request deposits for %s projects", status => {
    expect(blikDepositDetails({ ...project, projectStatus: status })).toBeNull();
  });
  it.each(["completed", "cancelled", "no_show", "unknown"])("does not request deposits for %s visits", status => {
    expect(blikDepositDetails({ ...project, status })).toBeNull();
  });
  it("does not share deposit state with another session", () => {
    expect(blikDepositDetails({ ...project, id: "visit-two", depositStatus: "paid" })).toBeNull();
    expect(blikDepositDetails(project)?.reference).toBe("Zadatek visit-test");
  });
  it("does not request deposits for consultations or unknown project kinds", () => {
    for (const kind of ["consultation", "unknown"]) expect(blikDepositDetails({ ...project, projectKind: kind })).toBeNull();
  });
});
