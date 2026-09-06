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
    name: "CoolInk Tattoo Studio",
    logoUrl: "/images/logo-white.jpg",
    logoAlt: "CoolInk Tattoo Studio — logo",
    instagramUrl: "https://instagram.com/coolink.tattoo.studio",
    facebookUrl: "https://facebook.com/coolink.tattoo.studio",
  },
  navigation: {
    homeLabel: "STRONA GŁÓWNA",
    aboutLabel: "O MNIE",
    portfolioLabel: "PORTFOLIO",
    studioLabel: "STUDIO",
    contactLabel: "KONTAKT",
  },
  header: {
    clientAreaLabel: "KONTO KLIENTA",
    clientAreaHref: "/app",
    bookingLabel: "UMÓW WIZYTĘ",
    bookingHref: "/#kalendarz",
  },
  theme: {
    background: "#0a0908",
    surface: "#131211",
    accent: "#c99a4a",
    accentBright: "#e0b869",
    text: "#f3f1ec",
    muted: "#9a9691",
  },
  contact: {
    address: "al. Konstytucji 3 Maja 10, 65-001 Zielona Góra",
    phone: "+48 530 178 346",
    email: "kontakt@coolinktattoo.pl",
    hours: "Wt–Sob: 11:00 – 18:00",
  },
  footer: {
    text: "CoolInk Tattoo Studio. Wszelkie prawa zastrzeżone.",
    privacyLabel: "POLITYKA PRYWATNOŚCI",
    privacyHref: "/polityka-prywatnosci",
  },
  maintenance: {
    brandLabel: "COOLINK TATTOO STUDIO",
    statusLabel: "TRYB BUDOWY",
    headingLine1: "ZAPRASZAM",
    headingLine2: "WKRÓTCE",
    message: "Dopracowuję przestrzeń. Wróć za chwilę — będzie warto.",
    mark: "P",
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
