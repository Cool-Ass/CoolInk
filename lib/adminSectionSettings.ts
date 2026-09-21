import { prisma } from "@/lib/prisma";
import { emptySectionLayout, parseSectionLayout } from "@/lib/adminSectionLayout";
export async function getAdminSectionLayout(adminId: string, scope: string) {
  const row = await prisma.siteSetting.findUnique({ where: { key: `admin_layout:${adminId}:${scope}` } });
  try { return row ? parseSectionLayout(JSON.parse(row.value)) : emptySectionLayout; } catch { return emptySectionLayout; }
}
