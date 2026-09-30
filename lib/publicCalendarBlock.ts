import { normalizeCalendarBlockRange } from "@/lib/dateTime";

/** Expose only a status; the administrator's reason can contain private notes. */
export function publicCalendarBlock(item: { startsAt: Date; endsAt: Date; reason: string | null }) {
  const range = normalizeCalendarBlockRange(item);
  const kind = item.reason?.trim().toLocaleUpperCase("pl-PL").startsWith("ZAJĘTY") ? "occupied" as const : "unavailable" as const;
  return { startsAt: range.startsAt.toISOString(), endsAt: range.endsAt.toISOString(), kind };
}

export function publicCalendarBlockLabel(kind: "occupied" | "unavailable" | undefined, unavailableLabel: string) {
  return kind === "occupied" ? "ZAJĘTY" : unavailableLabel;
}
