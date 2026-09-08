import { prisma } from "@/lib/prisma";
import { parseModules, serializeModules } from "@/lib/pageModules";
import { defaultModuleData, type Module, type ModuleType } from "@/lib/modules";
import type { SiteContent } from "@/lib/content";
import type { NavLink } from "@/lib/nav";

export const SYSTEM_PAGE_SLUGS = {
  header: "system-header",
  footer: "system-footer",
  maintenance: "system-maintenance",
} as const;

export type SystemPageKind = keyof typeof SYSTEM_PAGE_SLUGS;

const META: Record<SystemPageKind, { title: string; type: ModuleType }> = {
  header: { title: "Nagłówek strony", type: "siteHeader" },
  footer: { title: "Stopka strony", type: "siteFooter" },
  maintenance: { title: "Ekran trybu budowy", type: "maintenance" },
};

export function isSystemPageSlug(slug: string) {
  return Object.values(SYSTEM_PAGE_SLUGS).includes(slug as (typeof SYSTEM_PAGE_SLUGS)[SystemPageKind]);
}

function systemModule(kind: SystemPageKind, content: SiteContent, navLinks: NavLink[]): Module {
  const base = defaultModuleData(META[kind].type);
  const navItems = navLinks.map(({ id, label, href }) => ({ id, label, href }));
  const data = kind === "header" ? {
    ...base,
    logoUrl: content.brand.logoUrl,
    logoAlt: content.brand.logoAlt,
    brandName: content.brand.name,
    bookLabel: content.header.bookingLabel,
    bookHref: content.header.bookingHref,
    clientAreaLabel: content.header.clientAreaLabel,
    clientAreaHref: content.header.clientAreaHref,
    navItems,
  } : kind === "footer" ? {
    ...base,
    logoUrl: content.brand.logoUrl,
    logoAlt: content.brand.logoAlt,
    brandName: content.brand.name,
    text: content.footer.text,
    privacyLabel: content.footer.privacyLabel,
    privacyHref: content.footer.privacyHref,
    navItems,
  } : { ...base, ...content.maintenance };
  return { id: `system_${kind}`, type: META[kind].type, data };
}

export async function ensureSystemPages(content: SiteContent, navLinks: NavLink[]) {
  return Promise.all((Object.keys(SYSTEM_PAGE_SLUGS) as SystemPageKind[]).map(async (kind) => {
    const slug = SYSTEM_PAGE_SLUGS[kind];
    const existing = await prisma.page.findUnique({ where: { slug } });
    if (existing) return existing;
    const modules = serializeModules([systemModule(kind, content, navLinks)]);
    return prisma.page.create({ data: { title: META[kind].title, slug, modules, publishedModules: modules, status: "published", isHomepage: false, showInNav: false, navOrder: 10_000 } });
  }));
}

export async function getPublishedSystemModules(kind: SystemPageKind, content: SiteContent, navLinks: NavLink[]) {
  const page = await prisma.page.findUnique({ where: { slug: SYSTEM_PAGE_SLUGS[kind] } });
  if (!page) return [systemModule(kind, content, navLinks)];
  return page.status === "published" && page.publishedModules ? parseModules(page.publishedModules) : parseModules(page.modules).length ? parseModules(page.modules) : [systemModule(kind, content, navLinks)];
}
