export const ICON_NAMES = ["check", "chevronRight", "circle", "heart", "instagram", "mapPin", "menu", "messageCircle", "phone", "play", "sparkles", "star"] as const;
export type IconName = (typeof ICON_NAMES)[number];
export function isValidIconName(value: unknown): value is IconName { return typeof value === "string" && (ICON_NAMES as readonly string[]).includes(value); }
