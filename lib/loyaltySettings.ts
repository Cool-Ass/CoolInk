import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { DEFAULT_LOYALTY_RULES, validateLoyaltyRules } from "@/lib/loyaltyRules";

export const LOYALTY_SETTINGS_KEY = "loyalty_rules";
export async function getLoyaltyRules(db: Prisma.TransactionClient = prisma) {
  const row = await db.siteSetting.findUnique({ where: { key: LOYALTY_SETTINGS_KEY } });
  return row ? validateLoyaltyRules(JSON.parse(row.value)) : DEFAULT_LOYALTY_RULES;
}
