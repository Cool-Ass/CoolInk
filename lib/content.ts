import { prisma } from "./prisma";

/**
 * GLOBAL site content only — things reused in more than one place, with a
 * single source of truth (per the CMS spec's "global vs page-specific"
 * split). Page-specific copy (hero heading, about text, etc.) lives in
 * Page.modules instead — see lib/modules.ts for those defaults.
 *
 * Keys are dot-paths stored flat in the SiteSetting table (e.g.
 * "brand.logoUrl"); this file is the single source of truth for which
 * global settings exist and what they fall back to before anyone touches
 * /admin/content.
 */
export const DEFAULT_CONTENT = {
  brand: {
    logoUrl: "/images/logo-white.jpg",
    instagramUrl: "https://instagram.com",
    facebookUrl: "https://facebook.com",
  },
  contact: {
    address: "ul. Artystyczna 12, 00-001 Warszawa",
    phone: "+48 500 100 200",
    email: "kontakt@coolink-tattoo.pl",
    hours: "Wt–Sob: 11:00 – 19:00",
  },
  footer: {
    text: "CoolInk Tattoo Studio. Wszelkie prawa zastrzeżone.",
  },
} as const;

export type SiteContent = typeof DEFAULT_CONTENT;

/** Flattens the nested defaults into dot-path keys, e.g. "brand.logoUrl". */
export function flattenDefaults(): Record<string, string> {
  const flat: Record<string, string> = {};
  for (const [section, fields] of Object.entries(DEFAULT_CONTENT)) {
    for (const [field, value] of Object.entries(fields)) {
      flat[`${section}.${field}`] = value as string;
    }
  }
  return flat;
}

/**
 * Reads every SiteSetting row and layers it over DEFAULT_CONTENT, so the
 * site always renders even if a key hasn't been created in the DB yet.
 */
export async function getSiteContent(): Promise<SiteContent> {
  const rows = await prisma.siteSetting.findMany();
  const overrides = new Map(rows.map((r) => [r.key, r.value]));

  const content = JSON.parse(JSON.stringify(DEFAULT_CONTENT)) as Record<
    string,
    Record<string, string>
  >;

  for (const [section, fields] of Object.entries(content)) {
    for (const field of Object.keys(fields)) {
      const key = `${section}.${field}`;
      if (overrides.has(key)) {
        fields[field] = overrides.get(key)!;
      }
    }
  }

  return content as unknown as SiteContent;
}
