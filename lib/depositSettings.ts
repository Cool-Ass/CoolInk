import { prisma } from "@/lib/prisma";
import { DEFAULT_DEPOSIT_INSTRUCTIONS, DEPOSIT_INSTRUCTIONS_KEY, validateDepositInstructions } from "@/lib/depositInstructions";
export async function getDepositInstructions() {
  const row = await prisma.siteSetting.findUnique({ where: { key: DEPOSIT_INSTRUCTIONS_KEY } });
  return row ? validateDepositInstructions(JSON.parse(row.value)) : DEFAULT_DEPOSIT_INSTRUCTIONS;
}
