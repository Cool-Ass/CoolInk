export const COOLINK_TIME_ZONE = "Europe/Warsaw";

export function formatCoolinkDateTime(value: Date) {
  return value.toLocaleString("pl-PL", { dateStyle: "medium", timeStyle: "short", timeZone: COOLINK_TIME_ZONE });
}
