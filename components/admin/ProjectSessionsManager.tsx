"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/admin/ToastProvider";
import { formatCoolinkDateTime, localDateTimeToIso, toCoolinkDateTimeInput } from "@/lib/dateTime";
import AppModal from "@/components/ui/AppModal";
import { newestSessionsFirst, OPEN_VISIT_SETTLEMENT } from "@/lib/appointmentPresentation";
import { appointmentStatusLabel } from "@/lib/workflowStatus";

type Session = { id: string; startsAt: Date; endsAt: Date; status: string; notes: string | null; price: number | null };
const labels: Record<string, string> = Object.fromEntries(["requested", "proposed", "confirmed", "completed", "no_show", "cancelled"].map((status) => [status, appointmentStatusLabel(status)]));

export default function ProjectSessionsManager({ sessions, title, clientId, settleableIds = [] }: { sessions: Session[]; title?: string; clientId?: string; settleableIds?: string[] }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [editing, setEditing] = useState<Session | null>(null);
  const [busy, setBusy] = useState(false);
  const openSettlement = (id: string) => { if (!clientId || !settleableIds.includes(id)) return; setEditing(null); window.dispatchEvent(new CustomEvent(OPEN_VISIT_SETTLEMENT, { detail: { clientId, appointmentId: id } })); };

  async function save() {
    if (!editing) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/admin/appointments/${editing.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editing) });
      const result = await response.json();
      if (!response.ok) throw Error(result.error);
      showToast("Sesja została zapisana.");
      setEditing(null);
      router.refresh();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Nie udało się zapisać sesji.", "error");
    } finally { setBusy(false); }
  }

  async function cancel() {
    if (!editing || !confirm("Anulować wizytę? Klient dostanie powiadomienie, a termin zostanie w historii.")) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/admin/appointments/${editing.id}`, { method: "DELETE" });
      const result = await response.json();
      if (!response.ok) throw Error(result.error);
      showToast("Wizyta została anulowana.");
      setEditing(null);
      router.refresh();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Nie udało się anulować wizyty.", "error");
    } finally { setBusy(false); }
  }

  return <section className="border-t border-ink-white/10 pt-4">
    <p className="text-[11px] tracking-widest text-ink-gold">{title ?? "SESJE PROJEKTU"}</p>
    <p className="mt-1 text-xs text-ink-grey">Najnowsze sesje na górze. Kliknij, aby edytować; płatność i rabat zapisz przez Rozlicz.</p>
    <div className="mt-3 space-y-2">{sessions.length ? newestSessionsFirst(sessions).map((session) => <div key={session.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-ink-white/10 px-3 py-2"><button type="button" onClick={() => setEditing(session)} className="flex min-h-9 min-w-0 flex-1 flex-wrap items-center justify-between gap-2 text-left text-sm hover:text-ink-gold"><span>{formatCoolinkDateTime(session.startsAt)} · {Math.round((session.endsAt.getTime() - session.startsAt.getTime()) / 60_000)} min{session.price !== null ? ` · ${session.price} zł` : ""}</span><span className="text-xs text-ink-gold">{labels[session.status] ?? session.status}</span></button>{clientId && settleableIds.includes(session.id) && <button type="button" onClick={() => openSettlement(session.id)} className="min-h-9 rounded-md border border-ink-gold/40 px-2 text-xs text-ink-gold hover:bg-ink-gold/10">Rozlicz</button>}</div>) : <p className="text-sm text-ink-grey">Brak zaplanowanych sesji.</p>}</div>
    {editing && <AppModal title="Edytuj wizytę" subtitle="Termin i status. Płatność, rabat i pieczątki zatwierdzisz osobno w rozliczeniu." onClose={() => { if (!busy) setEditing(null); }}><div className="mt-5 grid gap-4 sm:grid-cols-2"><label className="text-xs text-ink-grey">OD<input type="datetime-local" step="1800" value={toCoolinkDateTimeInput(editing.startsAt)} onChange={(event) => setEditing({ ...editing, startsAt: new Date(localDateTimeToIso(event.target.value) || editing.startsAt.toISOString()) })} className="mt-2 w-full border border-ink-white/20 bg-transparent p-2 text-ink-white" /></label><label className="text-xs text-ink-grey">DO<input type="datetime-local" step="1800" value={toCoolinkDateTimeInput(editing.endsAt)} onChange={(event) => setEditing({ ...editing, endsAt: new Date(localDateTimeToIso(event.target.value) || editing.endsAt.toISOString()) })} className="mt-2 w-full border border-ink-white/20 bg-transparent p-2 text-ink-white" /></label><label className="text-xs text-ink-grey">STATUS<select value={editing.status} onChange={(event) => setEditing({ ...editing, status: event.target.value })} className="mt-2 w-full border border-ink-white/20 bg-ink-black p-2 text-ink-white">{Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="text-xs text-ink-grey">CENA (PLN)<input inputMode="numeric" value={editing.price ?? ""} onChange={(event) => setEditing({ ...editing, price: event.target.value === "" ? null : Number(event.target.value) })} className="mt-2 w-full border border-ink-white/20 bg-transparent p-2 text-ink-white" /></label></div><label className="mt-4 block text-xs text-ink-grey">NOTATKA<textarea value={editing.notes ?? ""} onChange={(event) => setEditing({ ...editing, notes: event.target.value })} rows={4} className="mt-2 w-full border border-ink-white/20 bg-transparent p-2 text-ink-white" /></label><div className="mt-5 flex flex-wrap gap-3"><button disabled={busy} onClick={save} className="border border-ink-gold px-4 py-2 text-xs text-ink-gold disabled:opacity-50">{busy ? "ZAPISYWANIE…" : "ZAPISZ"}</button><button disabled={busy || editing.status === "cancelled"} onClick={cancel} className="border border-red-400/60 px-4 py-2 text-xs text-red-200 disabled:opacity-50">ANULUJ WIZYTĘ</button><button disabled={busy} onClick={() => setEditing(null)} className="text-xs text-ink-grey">Wróć</button>{clientId && settleableIds.includes(editing.id) && <button disabled={busy} onClick={() => { if (window.confirm("Przejść do rozliczenia? Niezapisane zmiany tej wizyty zostaną pominięte.")) openSettlement(editing.id); }} className="min-h-9 text-xs text-ink-gold">Przejdź do rozliczenia</button>}</div></AppModal>}
  </section>;
}
