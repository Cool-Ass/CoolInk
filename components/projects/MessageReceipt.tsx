import { Check, CheckCheck } from "lucide-react";
import { messageReceiptStatus } from "@/lib/messageReceipt";
export default function MessageReceipt({ readAt, deliveredAt }: { readAt?: string | null; deliveredAt?: string | null }) {
  const state = messageReceiptStatus({ readAt, deliveredAt });
  const label = state === "read" ? "Odczytano" : state === "delivered" ? "Dostarczono do rozmówcy" : "Wysłano";
  const Icon = state === "sent" ? Check : CheckCheck;
  return <span title={label} aria-label={label} role="img" className={state === "read" ? "inline-flex text-emerald-700" : "inline-flex text-current"}><Icon aria-hidden className="h-3.5 w-3.5" /></span>;
}
