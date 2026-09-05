import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages = await prisma.page.findMany({ where: { status: "published", isHomepage: false }, select: { slug: true, updatedAt: true } });
  return [
    { url: "https://www.coolinktattoo.pl", lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: "https://www.coolinktattoo.pl/polityka-prywatnosci", lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
    ...pages.map((page) => ({ url: `https://www.coolinktattoo.pl/${page.slug}`, lastModified: page.updatedAt, changeFrequency: "monthly" as const, priority: 0.6 })),
  ];
}
