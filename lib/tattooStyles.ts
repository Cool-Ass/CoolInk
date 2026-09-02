import { prisma } from "@/lib/prisma";

export const DEFAULT_TATTOO_STYLES = ["Realizm", "Black & Grey", "Fine Line", "Lettering", "Neo Traditional", "Inny"];
const KEY = "tattoo_styles";
export type TattooStyle = { id: string; label: string; active: boolean; order: number };

export function parseTattooStyles(value?: string | null): TattooStyle[] {
  try {
    const parsed = JSON.parse(value ?? "") as unknown;
    if (!Array.isArray(parsed)) throw new Error("invalid");
    const styles = parsed.filter((item): item is TattooStyle => Boolean(item) && typeof item === "object" && typeof (item as TattooStyle).id === "string" && typeof (item as TattooStyle).label === "string").map((item, index) => ({ id: item.id, label: item.label.trim().slice(0, 60), active: item.active !== false, order: Number.isInteger(item.order) ? item.order : index })).filter((item) => item.label.length > 0).sort((a, b) => a.order - b.order);
    if (styles.length) return styles;
  } catch { /* use compatible defaults */ }
  return DEFAULT_TATTOO_STYLES.map((label, order) => ({ id: `default-${order}`, label, active: true, order }));
}

export async function getTattooStyles() { const setting = await prisma.siteSetting.findUnique({ where: { key: KEY }, select: { value: true } }); return parseTattooStyles(setting?.value); }
export async function getActiveTattooStyleLabels() { return (await getTattooStyles()).filter((style) => style.active).map((style) => style.label); }
export async function saveTattooStyles(styles: TattooStyle[]) { const normalized = styles.slice(0, 30).map((style, order) => ({ id: style.id.trim().slice(0, 80), label: style.label.trim().slice(0, 60), active: Boolean(style.active), order })).filter((style) => style.id && style.label); await prisma.siteSetting.upsert({ where: { key: KEY }, update: { value: JSON.stringify(normalized) }, create: { key: KEY, value: JSON.stringify(normalized) } }); return normalized; }
