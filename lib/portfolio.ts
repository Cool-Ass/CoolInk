import { prisma } from "./prisma";

/**
 * Canonical shape the public site renders a portfolio item as (Hero-strip
 * thumbnails, the Portfolio module, the builder's gallery picker). Lives
 * here — next to the Prisma query that produces it — rather than in a UI
 * component, so every consumer imports the same type instead of each
 * re-deriving it from an inline query result.
 */
export interface PortfolioWork {
  id: string;
  src: string;
  alt: string;
}

/**
 * Fetches published portfolio items, ordered for display, already mapped
 * to the shape the frontend expects. Giving this an explicit return type
 * (rather than letting callers infer through an inline
 * `prisma.portfolioItem.findMany(...).map(...)`) keeps the result typed
 * correctly even when awaited inside a `Promise.all([...])` alongside
 * other calls.
 */
export async function getPublishedPortfolioWorks(): Promise<PortfolioWork[]> {
  const items = await prisma.portfolioItem.findMany({
    where: { published: true },
    orderBy: { order: "asc" },
    select: { id: true, imageUrl: true, title: true },
  });

  return items.map((item) => ({
    id: item.id,
    src: item.imageUrl,
    alt: item.title,
  }));
}

/**
 * Same as above but includes unpublished items too, for admin contexts
 * (the page builder's gallery picker, the portfolio module's "all
 * published" preview while editing) where drafts should still be visible
 * to the person editing.
 */
export async function getAllPortfolioWorks(): Promise<PortfolioWork[]> {
  const items = await prisma.portfolioItem.findMany({
    orderBy: { order: "asc" },
    select: { id: true, imageUrl: true, title: true },
  });

  return items.map((item) => ({
    id: item.id,
    src: item.imageUrl,
    alt: item.title,
  }));
}
