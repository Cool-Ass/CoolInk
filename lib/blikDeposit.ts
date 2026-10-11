// Recipient supplied by the studio owner for client-facing deposit instructions.
export const BLIK_DEPOSIT_PHONE = "530178346";
export const BLIK_DEPOSIT_PHONE_LABEL = "530 178 346";

type DepositProject = { id: string; kind: string; status: string; depositStatus: string; depositAmount: number | null };

export function blikDepositDetails(project: DepositProject) {
  if (project.kind !== "tattoo" || ["completed", "cancelled"].includes(project.status) || project.depositStatus !== "awaiting" || project.depositAmount === null || !Number.isSafeInteger(project.depositAmount) || project.depositAmount <= 0) return null;
  return { phone: BLIK_DEPOSIT_PHONE, phoneLabel: BLIK_DEPOSIT_PHONE_LABEL, amount: project.depositAmount, reference: `Zadatek ${project.id}` };
}
