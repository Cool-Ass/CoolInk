"use client";
import { useEffect, useState } from "react";
import type { LoyaltyRules } from "@/lib/loyaltyRules";
import VisitVoucher from "@/components/admin/VisitVoucher";
import LoyaltyCard from "@/components/client/LoyaltyCard";
import ProjectChat from "@/components/projects/ProjectChat";
import type { getLoyaltyCard } from "@/lib/loyalty";
import VisitDepositEditor from "@/components/admin/VisitDepositEditor";
import { useRouter } from "next/navigation";
import { formatCoolinkDateTime } from "@/lib/dateTime";

type Data = { projectId: string; clientId: string; canManageFinance: boolean; deposit: { status: string; amount: number | null; paymentMethod: string | null }; legacyDeposit: { status: string; amount: number | null; paymentMethod: string | null } | null; card: Awaited<ReturnType<typeof getLoyaltyCard>> | null; settleable: boolean; visit: { id: string; title: string; date: string; updatedAt: string; price: number | null; status: string; loyaltyRequested: boolean; loyaltyRules?: LoyaltyRules | null; voucherRequested?: boolean; voucherAmountCents?: number; depositPaidCents?: number }; voucherPhotos: string[]; documents: { id: string; title: string; category: string; accepted: boolean }[]; messages: { id: string; author: string; body: string; createdAt: string; readAt: string | null; attachment: { id: string; caption: string | null; url: string } | null }[] };
export default function VisitWorkspace({ appointmentId, tab, onBusyChange }: { appointmentId: string; tab: "settlement" | "documents" | "messages"; onBusyChange: (busy: boolean) => void }) {
  const router = useRouter();
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/admin/appointments/${appointmentId}/workspace`, { signal: controller.signal }).then(async response => { const result = await response.json(); if (!response.ok) throw new Error(result.error || "Nie udało się wczytać wizyty."); setData(result); setError(""); }).catch(e => { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "Błąd połączenia."); });
    return () => controller.abort();
  }, [appointmentId, revision]);
  if (error) return <div role="alert"><p>{error}</p><button className="studio-primary-link mt-3" onClick={() => setRevision(v => v + 1)}>Ponów</button></div>;
  if (!data) return <p role="status" className="text-sm text-ink-grey">Wczytywanie wizyty…</p>;
  if (tab === "messages") return <ProjectChat projectId={data.projectId} role="admin" initial={data.messages} title={data.visit.title} subtitle={formatCoolinkDateTime(data.visit.date)} />;
  if (tab === "documents") return <section className="space-y-3"><h3 className="text-lg font-semibold">Dokumenty wizyty</h3><a className="studio-primary-link" href={`/admin/appointments/${appointmentId}/documents`}>Podpisy sesji i kod QR</a>{data.documents.some(doc => doc.category !== "consent") && <details className="studio-panel"><summary className="cursor-pointer text-sm">Informacje i regulaminy klienta</summary>{data.documents.filter(doc => doc.category !== "consent").map(doc => <p key={doc.id} className="border-b border-ink-white/10 py-2 text-sm">{doc.title}</p>)}</details>}</section>;
  return <div className="space-y-4">{data.canManageFinance && data.visit.voucherRequested && !data.visit.voucherAmountCents && <VisitVoucher appointmentId={appointmentId} photos={data.voucherPhotos} onSaved={() => { setData(null); setRevision(v => v + 1); }} />}{data.canManageFinance && Boolean(data.visit.voucherAmountCents) && data.voucherPhotos.length > 0 && <div className="flex flex-wrap gap-2">{data.voucherPhotos.map(url => <a key={url} className="studio-secondary-link" href={url} target="_blank" rel="noreferrer">Zdjęcie vouchera</a>)}</div>}<>{data.canManageFinance && <VisitDepositEditor key={`${appointmentId}:${data.visit.updatedAt}`} appointmentId={appointmentId} updatedAt={data.visit.updatedAt} date={formatCoolinkDateTime(data.visit.date)} initial={data.deposit} legacy={data.legacyDeposit} onBusyChange={onBusyChange} onSaved={() => { setData(null); setRevision(v => v + 1); router.refresh(); }} />}</>{data.card && data.settleable ? <LoyaltyCard key={revision} embedded onBusyChange={onBusyChange} card={data.card} clientId={data.clientId} initialVisitId={appointmentId} visits={[{ ...data.visit, date: formatCoolinkDateTime(data.visit.date) }]} onSaved={() => { setData(null); setRevision(v => v + 1); }} /> : <p className="text-sm text-ink-grey">{!data.card ? "Twoja rola nie ma dostępu do rozliczeń." : "Rozliczenie dostępne dla rozpoczętej wizyty tatuażu bez zapisanego rozliczenia. Nie zmieniaj statusu, aby ponawiać rozliczoną wizytę."}</p>}<a href={`/admin/clients/${data.clientId}?view=appointments`} className="inline-block text-xs text-ink-gold">Historia wizyt i karty →</a></div>;
}
