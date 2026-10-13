import { DEFAULT_DEPOSIT_INSTRUCTIONS, type DepositInstructions } from "@/lib/depositInstructions";
export const BLIK_DEPOSIT_PHONE = DEFAULT_DEPOSIT_INSTRUCTIONS.phone;
export const BLIK_DEPOSIT_PHONE_LABEL = "530 178 346";
export type DepositVisit = { id: string; status: string; depositStatus: string; depositAmount: number | null; projectKind: string; projectStatus: string };
export function blikDepositDetails(visit: DepositVisit, instructions: DepositInstructions = DEFAULT_DEPOSIT_INSTRUCTIONS) {
  if (visit.projectKind !== "tattoo" || ["completed", "cancelled"].includes(visit.projectStatus) || !["requested", "proposed", "confirmed"].includes(visit.status) || visit.depositStatus !== "awaiting" || visit.depositAmount === null || !Number.isSafeInteger(visit.depositAmount) || visit.depositAmount <= 0) return null;
  return { phone: instructions.phone, phoneLabel: instructions.phone.replace(/(\d{3})(\d{3})(\d{3})/, "$1 $2 $3"), amount: visit.depositAmount, reference: `Zadatek ${visit.id}` };
}
