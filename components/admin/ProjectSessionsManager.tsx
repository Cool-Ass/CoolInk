"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/admin/ToastProvider";
import { formatCoolinkDateTime, toCoolinkDateTimeInput } from "@/lib/dateTime";
import { appointmentStatusLabel } from "@/lib/workflowStatus";

type Session = { id: string; startsAt: Date; endsAt: Date; status: string; notes: string | null; price: number | null };
const labels: Record<string, string> = Object.fromEntries(["requested", "proposed", "confirmed", "completed", "no_show", "cancelled"].map((status) => [status, appointmentStatusLabel(status)]));

export default function ProjectSessionsManager({ sessions }: { sessions: Session[] }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [editing, setEditing] = useState<Session | null>(null);
  const [busy, setBusy] = useState(false);

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

  return <section className="border-t border-ink-white/10 pt-5">
    <p className="text-[11px] tracking-widest text-ink-gold">SESJE PROJEKTU</p>
    <p className="mt-1 text-xs text-ink-grey">Kliknij sesję, aby zmienić termin, czas, cenę lub status.</p>
    <div className="mt-3 space-y-2">{sessions.length ? sessions.map((session) => <button type="button" key={session.id} onClick={() => setEditing(session)} className="flex w-full justify-between gap-3 border border-ink-white/10 px-3 py-3 text-left text-sm hover:border-ink-gold/60"><span>{formatCoolinkDateTime(session.startsAt)} · {Math.round((session.endsAt.getTime() - session.startsAt.getTime()) / 60_000)} min{session.price !== null ? ` · ${session.price} zł` : ""}</span><span className="text-ink-gold">{labels[session.status] ?? session.status}</span></button>) : <p className="text-sm text-ink-grey">Brak zaplanowanych sesji.</p>}</div>
    {editing && <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-black/80 p-4"><div className="w-full max-w-xl border border-ink-white/20 bg-ink-charcoal p-6"><div className="flex justify-between"><div><p className="text-[11px] tracking-widest text-ink-gold">EDYCJA SESJI</p><h3 className="mt-1 font-display text-2xl">Wizyta klienta</h3></div><button onClick={() => setEditing(null)}>✕</button></div><div className="mt-5 grid gap-4 sm:grid-cols-2"><label className="text-xs text-ink-grey">OD<input type="datetime-local" step="1800" value={toCoolinkDateTimeInput(editing.startsAt)} onChange={(event) => setEditing({ ...editing, startsAt: new Date(event.target.value) })} className="mt-2 w-full border border-ink-white/20 bg-transparent p-2 text-ink-white" /></label><label className="text-xs text-ink-grey">DO<input type="datetime-local" step="1800" value={toCoolinkDateTimeInput(editing.endsAt)} onChange={(event) => setEditing({ ...editing, endsAt: new Date(event.target.value) })} className="mt-2 w-full border border-ink-white/20 bg-transparent p-2 text-ink-white" /></label><label className="text-xs text-ink-grey">STATUS<select value={editing.status} onChange={(event) => setEditing({ ...editing, status: event.target.value })} className="mt-2 w-full border border-ink-white/20 bg-ink-black p-2 text-ink-white">{Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="text-xs text-ink-grey">CENA (PLN)<input inputMode="numeric" value={editing.price ?? ""} onChange={(event) => setEditing({ ...editing, price: event.target.value === "" ? null : Number(event.target.value) })} className="mt-2 w-full border border-ink-white/20 bg-transparent p-2 text-ink-white" /></label></div><label className="mt-4 block text-xs text-ink-grey">NOTATKA<textarea value={editing.notes ?? ""} onChange={(event) => setEditing({ ...editing, notes: event.target.value })} rows={4} className="mt-2 w-full border border-ink-white/20 bg-transparent p-2 text-ink-white" /></label><div className="mt-5 flex flex-wrap gap-3"><button disabled={busy} onClick={save} className="border border-ink-gold px-4 py-2 text-xs text-ink-gold disabled:opacity-50">{busy ? "ZAPISYWANIE…" : "ZAPISZ"}</button><button disabled={busy || editing.status === "cancelled"} onClick={cancel} className="border border-red-400/60 px-4 py-2 text-xs text-red-200 disabled:opacity-50">ANULUJ WIZYTĘ</button><button onClick={() => setEditing(null)} className="text-xs text-ink-grey">Wróć</button></div></div></div>}
  </section>;
}
