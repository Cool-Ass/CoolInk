import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { normalizeVoucherCode, VOUCHER_TERMS } from "@/lib/voucherRules";
import { formatCoolinkDate } from "@/lib/dateTime";
import { rateLimit } from "@/lib/requestSecurity";
import { PRIVACY_LOCKED_STATUSES } from "@/lib/privacyExecutionPlan";
export const dynamic = "force-dynamic";
export const metadata = { title: "Voucher | CoolInk", robots: { index: false, follow: false } };
export default async function VoucherPage({ params }: { params: Promise<{ code: string }> }) {
  let code; try { code = normalizeVoucherCode((await params).code); } catch { notFound(); }
  const limit = await rateLimit(new Request("https://www.coolinktattoo.pl/voucher", { headers: await headers() }), "voucher-view", 40, 60000); if (!limit.allowed) return <main className="p-8">Zbyt wiele prób. Spróbuj za chwilę.</main>;
  const voucher = await prisma.voucher.findUnique({ where: { code }, include: { appointment: { select: { status: true } }, client: { select: { deletionRequest: { select: { status: true } } } } } });
  if (!voucher || (voucher.client?.deletionRequest && PRIVACY_LOCKED_STATUSES.includes(voucher.client.deletionRequest.status))) notFound();
  const usable = !voucher.cancelledAt && !voucher.redeemedAt && voucher.validUntil >= new Date();
  const reserved = voucher.appointment && !["cancelled", "no_show"].includes(voucher.appointment.status);
  const qr = await QRCode.toDataURL(`https://www.coolinktattoo.pl/voucher/${code}`, { width: 240, margin: 2, errorCorrectionLevel: "M" });
  return <main className="flex min-h-screen items-center justify-center bg-ink-black p-5 text-ink-white"><article className="studio-panel w-full max-w-xl space-y-5 border-ink-gold/40 text-center"><p className="studio-eyebrow">COOLINK TATTOO STUDIO</p><h1 className="text-3xl font-semibold">Voucher</h1><p className="text-5xl font-semibold text-ink-gold">{(voucher.amountCents / 100).toLocaleString("pl-PL")} zł</p><p className="text-xl">{voucher.recipientName}</p><p className="text-sm text-ink-grey">Ważny do {formatCoolinkDate(voucher.validUntil)}</p><p className={usable ? "text-emerald-200" : "text-ink-grey"}>{voucher.redeemedAt ? "Wykorzystany" : reserved ? "Przypisany do wizyty" : usable ? "Gotowy do wykorzystania" : "Voucher nieważny"}</p><img className="mx-auto rounded-lg" src={qr} width={240} height={240} alt="Kod QR vouchera" /><p className="break-all font-mono text-sm select-all">{code}</p><p className="text-xs leading-relaxed text-ink-grey">{VOUCHER_TERMS} Kod jest poufny — nie udostępniaj go publicznie.</p>{usable && !reserved && <Link href={`/app?returnTo=${encodeURIComponent(`/app/portal/calendar?voucher=${code}`)}`} className="studio-primary-link">Wybierz wizytę i wykorzystaj voucher</Link>}</article></main>;
}
