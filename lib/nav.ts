import { prisma } from "./prisma";
import type { Page, NavItem } from "@prisma/client";

export interface NavLink {
  id: string;
  label: string;
  href: string;
  /** true for the in-page hash anchors that only make sense on the homepage */
  isAnchor?: boolean;
}

// The site's built-in homepage sections. Prefixed with "/" so the links
// still work correctly when the visitor is on a CMS subpage like /o-nas.
export const CORE_NAV_LINKS: NavLink[] = [
  { id: "home", label: "STRONA GŁÓWNA", href: "/#home", isAnchor: true },
  { id: "artists", label: "O MNIE", href: "/#artists", isAnchor: true },
  { id: "portfolio", label: "PORTFOLIO", href: "/#portfolio", isAnchor: true },
  { id: "studio", label: "STUDIO", href: "/#studio", isAnchor: true },
  { id: "contact", label: "KONTAKT", href: "/#contact", isAnchor: true },
];

/**
 * Builds the public nav: the five built-in homepage sections, plus any
 * published CMS page with "show in navigation" on, plus any custom links
 * added under /admin/navigation — all sorted for display.
 */
export async function getPublicNavLinks(): Promise<NavLink[]> {
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
    href: n.href,
  }));

  return [...CORE_NAV_LINKS, ...pageLinks, ...customLinks];
}
