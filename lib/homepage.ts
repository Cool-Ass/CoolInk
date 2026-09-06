import { prisma } from "./prisma";
import { defaultHomepageModules } from "./modules";

/**
 * Older installations can render the default homepage without a Page row.
 * The builder needs a durable row, so entering the authenticated pages area
 * upgrades that fallback into an editable homepage without changing what the
 * public sees.
 */
export async function ensureEditableHomepage() {
  const existing = await prisma.page.findFirst({ where: { isHomepage: true } });
  if (existing) return existing;

  const modules = JSON.stringify(defaultHomepageModules());
  return prisma.page.upsert({
    where: { slug: "strona-glowna" },
    update: {
      isHomepage: true,
      showInNav: false,
    },
    create: {
      title: "Strona główna",
      slug: "strona-glowna",
      isHomepage: true,
      showInNav: false,
      status: "published",
      modules,
      publishedModules: modules,
    },
  });
}

