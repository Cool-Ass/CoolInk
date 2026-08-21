export function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // strip accents/diacritics
    .replace(/ł/g, "l")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Reserved paths a CMS page must not shadow. */
export const RESERVED_SLUGS = new Set([
  "admin",
  "api",
  "home",
  "artists",
  "portfolio",
  "studio",
  "contact",
  "uploads",
  "images",
  "strona-glowna",
]);
