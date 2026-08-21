import { prisma } from "./prisma";
import { parseModules } from "./pageModules";

function collectUrls(value: unknown, acc: string[] = []): string[] {
  if (typeof value === "string" && (value.startsWith("/") || value.startsWith("https://"))) {
    acc.push(value);
  } else if (Array.isArray(value)) {
    value.forEach((v) => collectUrls(v, acc));
  } else if (value && typeof value === "object") {
    Object.values(value as Record<string, unknown>).forEach((v) => collectUrls(v, acc));
  }
  return acc;
}

/**
 * Best-effort "where is this used" index: scans draft AND published page modules/cover images,
 * portfolio items, and global brand settings for each media URL. Not a
 * database-level foreign key — just a helpful pointer shown in the media
 * library so deleting a file doesn't silently break something.
 */
export async function getMediaUsageMap(): Promise<Map<string, string[]>> {
  const [pages, portfolioItems, settings] = await Promise.all([
    prisma.page.findMany({
      select: {
        title: true,
        modules: true,
        publishedModules: true,
        coverImage: true,
        isHomepage: true,
      },
    }),
    prisma.portfolioItem.findMany({ select: { title: true, imageUrl: true } }),
    prisma.siteSetting.findMany(),
  ]);

  const usage = new Map<string, string[]>();
  function add(url: string | null | undefined, label: string) {
    if (!url) return;
    const list = usage.get(url) ?? [];
    if (!list.includes(label)) list.push(label);
    usage.set(url, list);
  }

  for (const page of pages) {
    const label = page.isHomepage ? "Strona główna" : `Strona: ${page.title}`;
    add(page.coverImage, label);
    for (const url of collectUrls(parseModules(page.modules))) add(url, label);
    for (const url of collectUrls(parseModules(page.publishedModules))) add(url, label);
  }

  for (const item of portfolioItems) {
    add(item.imageUrl, `Portfolio: ${item.title}`);
  }

  for (const setting of settings) {
    if (setting.key === "brand.logoUrl") add(setting.value, "Logo (globalne)");
  }

  return usage;
}
