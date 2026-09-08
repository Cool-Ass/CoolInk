import { prisma } from "./prisma";
import { createModule, defaultHomepageModules, type Module } from "./modules";
import { parseModules, serializeModules } from "./pageModules";

const HOMEPAGE_BUILDER_VERSION_KEY = "site.homepageBuilderVersion";
const HOMEPAGE_BUILDER_VERSION = "3";

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
    // v3 deliberately replaces the old monolithic homepage templates with a
    // builder-native composition. The site is in maintenance mode and this
    // one-time migration is the requested visual redesign; later edits are
    // left untouched once the version marker has been written.
    const modules = defaultHomepageModules();
    const publishedModules = existing.publishedModules ? defaultHomepageModules() : null;
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
