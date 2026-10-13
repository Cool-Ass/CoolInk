import Link from "next/link";
import { requireAdminPage } from "@/lib/adminPage";
import { prisma } from "@/lib/prisma";
import { formatCoolinkDate } from "@/lib/dateTime";
import VouchersPanel from "@/components/admin/VouchersPanel";
export const dynamic = "force-dynamic";
export default async function VouchersPage() {
  await requireAdminPage("finance.manage");
  const vouchers = await prisma.voucher.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
  return <div className="studio-page"><header className="flex flex-wrap justify-between gap-3"><h1 className="studio-page-title">Vouchery</h1><Link className="studio-secondary-link" href="/admin/settings?category=payments">Płatności i nagrody</Link></header><VouchersPanel /><section className="studio-panel"><h2 className="text-lg font-semibold">Wystawione vouchery</h2><div className="divide-y divide-ink-white/10">{vouchers.map(voucher => <article className="flex flex-wrap items-center justify-between gap-3 py-4" key={voucher.id}><div><p>{voucher.recipientName} · {(voucher.amountCents / 100).toLocaleString("pl-PL")} zł</p><p className="mt-1 text-xs text-ink-grey">Ważny do {formatCoolinkDate(voucher.validUntil)} · {voucher.redeemedAt ? "Wykorzystany" : voucher.cancelledAt ? "Unieważniony" : voucher.appointmentId ? "Przypisany do wizyty" : voucher.validUntil < new Date() ? "Nieważny" : "Gotowy"}</p></div><Link href={`/voucher/${voucher.code}`} className="studio-secondary-link">Podgląd / QR</Link></article>)}</div></section></div>;
}
