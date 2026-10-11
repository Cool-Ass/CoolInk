"use client";
import { useEffect, useState } from "react";
import LoyaltyCard from "@/components/client/LoyaltyCard";
import ProjectChat from "@/components/projects/ProjectChat";
import type { getLoyaltyCard } from "@/lib/loyalty";
import { depositStatusLabel } from "@/lib/workflowStatus";
import { formatCoolinkDateTime } from "@/lib/dateTime";

type Data = { projectId: string; clientId: string; deposit: { status: string; amount: number | null }; card: Awaited<ReturnType<typeof getLoyaltyCard>> | null; settleable: boolean; visit: { id: string; title: string; date: string; price: number | null; status: string; loyaltyRequested: boolean }; documents: { id: string; title: string; category: string; accepted: boolean }[]; messages: { id: string; author: string; body: string; createdAt: string; readAt: string | null; attachment: { id: string; caption: string | null; url: string } | null }[] };
export default function VisitWorkspace({ appointmentId, tab, onBusyChange }: { appointmentId: string; tab: "settlement" | "documents" | "messages"; onBusyChange: (busy: boolean) => void }) {
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
  if (tab === "documents") return <section className="space-y-3"><h3 className="text-sm font-semibold">Dokumenty klienta</h3><p className="text-xs text-ink-grey">Akceptacja dotyczy bieżącej wersji dokumentu, nie pojedynczej wizyty.</p>{data.documents.map(doc => <div key={doc.id} className="flex justify-between gap-3 border-b border-ink-white/10 py-3 text-sm"><span>{doc.title}</span><span className={doc.accepted ? "text-emerald-200" : "text-ink-grey"}>{doc.accepted ? "Zaakceptowany" : doc.category === "consent" ? "Do akceptacji" : "Do przeczytania"}</span></div>)}{!data.documents.length && <p className="text-sm text-ink-grey">Brak opublikowanych dokumentów.</p>}</section>;
  return <div className="space-y-4"><p className="rounded-lg bg-ink-white/5 p-3 text-sm">Zadatek: {depositStatusLabel(data.deposit.status)}{data.deposit.amount !== null && ` · ${data.deposit.amount} zł`}</p>{data.card && data.settleable ? <LoyaltyCard key={revision} embedded onBusyChange={onBusyChange} card={data.card} clientId={data.clientId} initialVisitId={appointmentId} visits={[{ ...data.visit, date: formatCoolinkDateTime(data.visit.date) }]} onSaved={() => { setData(null); setRevision(v => v + 1); }} /> : <p className="text-sm text-ink-grey">{!data.card ? "Twoja rola nie ma dostępu do rozliczeń." : "Rozliczenie dostępne dla rozpoczętej wizyty tatuażu bez zapisanego rozliczenia. Nie zmieniaj statusu, aby ponawiać rozliczoną wizytę."}</p>}<a href={`/admin/clients/${data.clientId}?view=appointments`} className="inline-block text-xs text-ink-gold">Historia wizyt i karty →</a></div>;
}
