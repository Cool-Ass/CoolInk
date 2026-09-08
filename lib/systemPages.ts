import { prisma } from "@/lib/prisma";
import { parseModules, serializeModules } from "@/lib/pageModules";
import { defaultModuleData, generateModuleId, withDefaults, type ColumnWidget, type ColumnWidgetType, type Module, type ModuleStyle, type ModuleType } from "@/lib/modules";
import type { SiteContent } from "@/lib/content";
import type { NavLink } from "@/lib/nav";

export const SYSTEM_PAGE_SLUGS = {
  header: "system-header",
  footer: "system-footer",
  maintenance: "system-maintenance",
} as const;

export type SystemPageKind = keyof typeof SYSTEM_PAGE_SLUGS;

const META: Record<SystemPageKind, { title: string; legacyType: ModuleType }> = {
  header: { title: "Nagłówek strony", legacyType: "siteHeader" },
  footer: { title: "Stopka strony", legacyType: "siteFooter" },
  maintenance: { title: "Ekran trybu budowy", legacyType: "maintenance" },
};

export function isSystemPageSlug(slug: string) {
  return Object.values(SYSTEM_PAGE_SLUGS).includes(slug as (typeof SYSTEM_PAGE_SLUGS)[SystemPageKind]);
}

function widget(type: ColumnWidgetType, data: Record<string, unknown>, style?: ModuleStyle): ColumnWidget {
  return { id: generateModuleId("w"), type, data: { ...defaultModuleData(type), ...data }, style };
}

function section(columns: ColumnWidget[][], options?: { background?: "transparent" | "charcoal" | "gold"; padding?: "sm" | "md" | "lg"; gap?: number; widths?: number[]; style?: ModuleStyle }): Module {
  const count = Math.max(1, Math.min(4, columns.length));
  return {
    id: generateModuleId(),
    type: "columns",
    data: {
      ...defaultModuleData("columns"),
      layout: (["one", "two", "three", "four"] as const)[count - 1],
      columns,
      background: options?.background ?? "transparent",
      padding: options?.padding ?? "sm",
      gap: options?.gap ?? 20,
      verticalAlign: "center",
      columnWidths: options?.widths ?? Array(count).fill(100 / count),
    },
    style: options?.style,
  };
}

function builderSystemModules(kind: SystemPageKind, content: SiteContent, navLinks: NavLink[], legacy?: Module): Module[] {
  const navItems = navLinks.map(({ id, label, href }) => ({ id, label, href }));
  if (kind === "header") {
    const source = withDefaults("siteHeader", legacy?.data ?? {
      logoUrl: content.brand.logoUrl, logoAlt: content.brand.logoAlt, brandName: content.brand.name,
      bookLabel: content.header.bookingLabel, bookHref: content.header.bookingHref,
      clientAreaLabel: content.header.clientAreaLabel, clientAreaHref: content.header.clientAreaHref, navItems,
    });
    return [section([
      [widget("image", { image: source.logoUrl, alt: source.logoAlt, caption: "", aspect: "wide", fit: "contain", maxWidth: 126, alignment: "left" })],
      [widget("navigation", { items: [...source.navItems, { id: "header-book", label: source.bookLabel, href: source.bookHref }], alignment: "center", mobileLabel: "MENU", style: "plain" }, { fontSize: 11, letterSpacing: 1.2 })],
      [widget("button", { label: source.clientAreaLabel, href: source.clientAreaHref, alignment: "right", style: "outline", width: "auto" }, { fontSize: 11 })],
    ], { background: "charcoal", padding: "sm", gap: 10, widths: [18, 62, 20], style: { contentWidth: "full", surface: "glass", zIndex: 80, anchorId: "site-header" } })];
  }

  if (kind === "footer") {
    const source = withDefaults("siteFooter", legacy?.data ?? {
      logoUrl: content.brand.logoUrl, logoAlt: content.brand.logoAlt, brandName: content.brand.name,
      text: content.footer.text, privacyLabel: content.footer.privacyLabel, privacyHref: content.footer.privacyHref, navItems,
    });
    return [section([
      [widget("image", { image: source.logoUrl, alt: source.logoAlt, caption: "", aspect: "wide", fit: "contain", maxWidth: 150, alignment: "left" }), widget("text", { text: source.text, alignment: "left" }, { fontSize: 12 })],
      [widget("navigation", { items: source.navItems, alignment: "center", mobileLabel: "LINKI", style: "plain" }, { fontSize: 10 })],
      [widget("button", { label: source.privacyLabel, href: source.privacyHref, alignment: "right", style: "outline", width: "auto" }, { fontSize: 10 })],
    ], { background: "charcoal", padding: "md", gap: 24, widths: [34, 42, 24], style: { contentWidth: "full", borderColor: "rgba(255,255,255,.1)", borderWidth: 1, anchorId: "site-footer" } })];
  }

  const source = withDefaults("maintenance", legacy?.data ?? content.maintenance);
  return [section([[
    widget("text", { text: `${source.brandLabel}  /  ${source.statusLabel}`, alignment: "center" }, { color: content.theme.accent, fontSize: 12, letterSpacing: 3, textTransform: "uppercase" }),
    widget("heading", { text: `${source.headingLine1}\n${source.headingLine2}`, level: "h1", alignment: "center" }, { color: content.theme.text, fontSize: 112, lineHeight: .84, textTransform: "uppercase" }),
    widget("divider", { style: "gold", icon: "" }, { contentWidth: "narrow" }),
    widget("text", { text: source.message, alignment: "center" }, { color: content.theme.muted, fontSize: 18, lineHeight: 1.6 }),
    widget("button", { label: "KONTO KLIENTA", href: "/app", alignment: "center", style: "outline", width: "auto" }, { fontSize: 11, letterSpacing: 1.4 }),
    widget("text", { text: source.mark, alignment: "center" }, { color: content.theme.accent, fontFamily: "display", fontSize: 28 }),
  ]], { background: "transparent", padding: "lg", gap: 0, style: { minHeight: 760, contentWidth: "full", backgroundColor: content.theme.background, backgroundImage: "/images/texture-bg.jpg", overlayColor: content.theme.background, overlayOpacity: 82, anchorId: "maintenance" } })];
}

function migrateLegacy(kind: SystemPageKind, modules: Module[], content: SiteContent, navLinks: NavLink[]) {
  let changed = false;
  const migrated = modules.flatMap((module) => {
    if (module.type !== META[kind].legacyType) return [module];
    changed = true;
    return builderSystemModules(kind, content, navLinks, module);
  });
  return { changed, modules: migrated };
}

export async function ensureSystemPages(content: SiteContent, navLinks: NavLink[]) {
  return Promise.all((Object.keys(SYSTEM_PAGE_SLUGS) as SystemPageKind[]).map(async (kind) => {
    const slug = SYSTEM_PAGE_SLUGS[kind];
    const existing = await prisma.page.findUnique({ where: { slug } });
    if (!existing) {
      const modules = serializeModules(builderSystemModules(kind, content, navLinks));
      return prisma.page.create({ data: { title: META[kind].title, slug, modules, publishedModules: modules, status: "published", isHomepage: false, showInNav: false, navOrder: 10_000 } });
    }

    const draft = migrateLegacy(kind, parseModules(existing.modules), content, navLinks);
    const published = existing.publishedModules ? migrateLegacy(kind, parseModules(existing.publishedModules), content, navLinks) : null;
    if (!draft.changed && !published?.changed) return existing;
    return prisma.page.update({ where: { id: existing.id }, data: {
      modules: draft.changed ? serializeModules(draft.modules) : existing.modules,
      publishedModules: published?.changed ? serializeModules(published.modules) : existing.publishedModules,
    } });
  }));
}

export async function getPublishedSystemModules(kind: SystemPageKind, content: SiteContent, navLinks: NavLink[]) {
  const pages = await ensureSystemPages(content, navLinks);
  const page = pages.find((item) => item.slug === SYSTEM_PAGE_SLUGS[kind]);
  if (!page) return builderSystemModules(kind, content, navLinks);
  if (page.status === "published" && page.publishedModules) return parseModules(page.publishedModules);
  const draft = parseModules(page.modules);
  return draft.length ? draft : builderSystemModules(kind, content, navLinks);
}
