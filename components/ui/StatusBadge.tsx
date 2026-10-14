import { appointmentStatusLabel, projectStatusLabel } from "@/lib/workflowStatus";
import type { ReactNode } from "react";

const styles: Record<string, string> = { requested: "border-amber-400/45 bg-amber-400/10 text-amber-200", awaiting_confirmation: "border-amber-400/45 bg-amber-400/10 text-amber-200", proposed: "border-sky-400/45 bg-sky-400/10 text-sky-200", date_proposed: "border-sky-400/45 bg-sky-400/10 text-sky-200", confirmed: "border-emerald-400/45 bg-emerald-400/10 text-emerald-200", completed: "border-ink-gold/50 bg-ink-gold/10 text-ink-gold", cancelled: "border-red-400/35 bg-red-400/5 text-red-200", no_show: "border-red-400/45 bg-red-400/10 text-red-200" };

export default function StatusBadge({ status, children }: { status: string; children?: ReactNode }) {
  const appointmentStatuses = new Set(["requested", "proposed", "confirmed", "completed", "cancelled", "no_show"]);
  return <span className={`studio-status inline-flex max-w-full items-center rounded-md border px-2.5 py-1 text-xs leading-snug ${styles[status] ?? "border-ink-white/20 bg-ink-white/5 text-ink-grey"}`}>{children ?? (appointmentStatuses.has(status) ? appointmentStatusLabel(status) : projectStatusLabel(status))}</span>;
}
