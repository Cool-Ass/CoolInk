export type SectionLayout = { order: string[]; collapsed: string[]; hidden: string[] };
export const emptySectionLayout: SectionLayout = { order: [], collapsed: [], hidden: [] };
export function parseSectionLayout(input: unknown): SectionLayout {
  if (!input || typeof input !== "object") throw new Error("Nieprawidłowy układ.");
  const value = input as Record<string, unknown>;
  const list = (key: string) => {
    const items = value[key];
    if (!Array.isArray(items) || items.length > 50 || items.some((id) => typeof id !== "string" || !/^[a-z0-9_-]{1,60}$/.test(id))) throw new Error("Nieprawidłowe sekcje.");
    return [...new Set(items)] as string[];
  };
  return { order: list("order"), collapsed: list("collapsed"), hidden: list("hidden") };
}
export function orderedSections(ids: string[], order: string[]) {
  return [...new Set([...order.filter((id) => ids.includes(id)), ...ids])];
}
export function moveSection(ids: string[], source: string, target: string) {
  if (source === target || !ids.includes(source) || !ids.includes(target)) return ids;
  const next = ids.filter((id) => id !== source);
  next.splice(ids.indexOf(target), 0, source);
  return next;
}
