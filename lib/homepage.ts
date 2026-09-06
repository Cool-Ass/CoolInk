import { prisma } from "./prisma";
import { createModule, defaultHomepageModules, type Module } from "./modules";
import { parseModules, serializeModules } from "./pageModules";

const HOMEPAGE_BUILDER_VERSION_KEY = "site.homepageBuilderVersion";
const HOMEPAGE_BUILDER_VERSION = "2";

export function addBookingModuleIfMissing(modules: Module[]) {
  if (modules.some((module) => module.type === "booking")) return modules;
  return [...modules, createModule("booking")];
}

/**
 * Older installations can render the default homepage without a Page row.
 * The builder needs a durable row, so entering the authenticated pages area
 * upgrades that fallback into an editable homepage without changing what the
 * public sees.
 */
export async function ensureEditableHomepage() {
  const [existing, version] = await Promise.all([
    prisma.page.findFirst({ where: { isHomepage: true } }),
    prisma.siteSetting.findUnique({ where: { key: HOMEPAGE_BUILDER_VERSION_KEY } }),
  ]);

  if (existing && version?.value === HOMEPAGE_BUILDER_VERSION) return existing;

  if (existing) {
    const modules = addBookingModuleIfMissing(parseModules(existing.modules));
    const publishedModules = existing.publishedModules
      ? addBookingModuleIfMissing(parseModules(existing.publishedModules))
      : null;
    const [page] = await prisma.$transaction([
      prisma.page.update({
        where: { id: existing.id },
        data: {
          modules: serializeModules(modules),
          publishedModules: publishedModules ? serializeModules(publishedModules) : null,
        },
      }),
      prisma.siteSetting.upsert({
        where: { key: HOMEPAGE_BUILDER_VERSION_KEY },
        update: { value: HOMEPAGE_BUILDER_VERSION },
        create: { key: HOMEPAGE_BUILDER_VERSION_KEY, value: HOMEPAGE_BUILDER_VERSION },
      }),
    ]);
    return page;
  }

  const modules = JSON.stringify(defaultHomepageModules());
  const [page] = await prisma.$transaction([
    prisma.page.upsert({
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
    }),
    prisma.siteSetting.upsert({
      where: { key: HOMEPAGE_BUILDER_VERSION_KEY },
      update: { value: HOMEPAGE_BUILDER_VERSION },
      create: { key: HOMEPAGE_BUILDER_VERSION_KEY, value: HOMEPAGE_BUILDER_VERSION },
    }),
  ]);
  return page;
}
