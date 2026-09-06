import { prisma } from "./prisma";
import type { Page, NavItem } from "@prisma/client";
import { safeHref } from "./safeHref";
import { DEFAULT_CONTENT, getSiteContent, type SiteContent } from "./content";

export interface NavLink {
  id: string;
  label: string;
  href: string;
  /** true for the in-page hash anchors that only make sense on the homepage */
  isAnchor?: boolean;
}

// The site's built-in homepage sections. Prefixed with "/" so the links
// still work correctly when the visitor is on a CMS subpage like /o-nas.
function coreNavLinks(content: SiteContent["navigation"]): NavLink[] {
  return [
    { id: "home", label: content.homeLabel, href: "/#home", isAnchor: true },
    { id: "artists", label: content.aboutLabel, href: "/#artists", isAnchor: true },
    { id: "portfolio", label: content.portfolioLabel, href: "/#portfolio", isAnchor: true },
    { id: "studio", label: content.studioLabel, href: "/#studio", isAnchor: true },
    { id: "contact", label: content.contactLabel, href: "/#contact", isAnchor: true },
  ].filter((item) => item.label.trim());
}

export const CORE_NAV_LINKS: NavLink[] = coreNavLinks(DEFAULT_CONTENT.navigation);

/**
 * Builds the public nav: the five built-in homepage sections, plus any
 * published CMS page with "show in navigation" on, plus any custom links
 * added under /admin/navigation — all sorted for display.
 */
export async function getPublicNavLinks(navigation?: SiteContent["navigation"]): Promise<NavLink[]> {
  const core = coreNavLinks(navigation ?? (await getSiteContent()).navigation);
  const [pages, custom] = await Promise.all([
    prisma.page.findMany({
      where: { status: "published", showInNav: true, isHomepage: false },
      orderBy: { navOrder: "asc" },
      select: { id: true, title: true, slug: true, navOrder: true },
    }),
    prisma.navItem.findMany({ orderBy: { order: "asc" } }),
  ]);

  const pageLinks: NavLink[] = pages.map((p: Pick<Page, "id" | "title" | "slug" | "navOrder">) => ({
    id: `page-${p.id}`,
    label: p.title.toUpperCase(),
    href: `/${p.slug}`,
  }));

  const customLinks: NavLink[] = custom.map((n: NavItem) => ({
    id: `nav-${n.id}`,
    label: n.label.toUpperCase(),
    href: safeHref(n.href, ""),
  })).filter((item) => Boolean(item.href));

  return [...core, ...pageLinks, ...customLinks];
}
