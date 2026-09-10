export const ICON_NAMES = [
  "accessibility", "activity", "alarmClock", "aperture", "arrowDown", "arrowLeft", "arrowRight", "arrowUp",
  "award", "badgeCheck", "bell", "bookmark", "box", "calendar", "camera", "check", "chevronDown", "chevronLeft",
  "chevronRight", "chevronUp", "circle", "clock", "cloud", "code", "compass", "crown", "diamond", "download", "eye",
  "flame", "flower", "gift", "globe", "hammer", "heart", "image", "info", "instagram", "layers", "lightbulb", "link",
  "lock", "mail", "mapPin", "menu", "messageCircle", "minus", "moon", "move", "music", "palette", "phone", "play",
  "plus", "quote", "rocket", "scissors", "search", "send", "shieldCheck", "shoppingBag", "sparkles", "star", "sun",
  "target", "thumbsUp", "ticket", "timer", "trophy", "upload", "user", "users", "wand", "zap",
] as const;
export type IconName = (typeof ICON_NAMES)[number];
export function isValidIconName(value: unknown): value is IconName {
  return typeof value === "string" && (ICON_NAMES as readonly string[]).includes(value);
}
