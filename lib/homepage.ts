import { prisma } from "./prisma";
import { createModule, defaultHomepageModules, type Module, withDefaults } from "./modules";
import { parseModules, serializeModules } from "./pageModules";

const HOMEPAGE_BUILDER_VERSION_KEY = "site.homepageBuilderVersion";
const HOMEPAGE_BUILDER_VERSION = "4";

export function addBookingModuleIfMissing(modules: Module[]) {
  if (modules.some((module) => module.type === "booking")) return modules;
  return [...modules, createModule("booking")];
}

export function addGoogleReviewsIfMissing(modules: Module[]) {
  const exists = modules.some((module) => module.type === "googleReviews" || (module.type === "columns" && withDefaults("columns", module.data).columns.flat().some((widget) => widget.type === "googleReviews")));
  if (exists) return modules;
  const section = createModule("columns");
  const widget = createModule("googleReviews");
  section.data = {
    ...section.data,
    layout: "one",
    columns: [[{ id: widget.id, type: "googleReviews", data: widget.data }]],
    padding: "sm",
    background: "transparent",
  };
  const contactIndex = modules.findIndex((module) => module.style?.anchorId === "contact");
  const index = contactIndex < 0 ? modules.length : contactIndex;
  return [...modules.slice(0, index), section, ...modules.slice(index)];
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
    // The v3 migration deliberately replaced the legacy templates. From v4
    // onward upgrades are additive so an administrator's builder edits are
    // never overwritten when a new native widget is introduced.
    const additiveUpgrade = version?.value === "3";
    const modules = additiveUpgrade ? addGoogleReviewsIfMissing(parseModules(existing.modules)) : defaultHomepageModules();
    const publishedModules = existing.publishedModules ? (additiveUpgrade ? addGoogleReviewsIfMissing(parseModules(existing.publishedModules)) : defaultHomepageModules()) : null;
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
