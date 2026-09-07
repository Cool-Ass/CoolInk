"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AppButton from "@/components/ui/AppButton";
import AppModal from "@/components/ui/AppModal";
import { WAITLIST_STATUS_LABEL, WAITLIST_TIME_LABEL, type WaitlistStatus } from "@/lib/waitlist";

type Entry = { id: string; status: string; durationMinutes: number; preferredWeekdays: string; timePreference: string; earliestDate: string | null; latestDate: string | null; notes: string | null; offeredAt: string | null; offerExpiresAt: string | null; client: { id: string; name: string; email: string; phone: string | null }; project: { id: string; title: string }; offeredAppointment: { startsAt: string; endsAt: string; status: string } | null };
const DAY_LABEL: Record<string, string> = { "0": "Nd", "1": "Pn", "2": "Wt", "3": "Śr", "4": "Cz", "5": "Pt", "6": "Sb" };

export default function WaitlistManager({ entries }: { entries: Entry[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState("open");
  const [selected, setSelected] = useState<Entry | null>(null);
  const [offer, setOffer] = useState({ startsAt: "", durationMinutes: 120, note: "" });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const visible = useMemo(() => entries.filter((entry) => filter === "all" || filter === "open" && ["active", "offered", "paused"].includes(entry.status) || entry.status === filter), [entries, filter]);

  async function changeStatus(entry: Entry, status: "active" | "paused" | "closed") {
    setSaving(true); setMessage("");
    try {
      const response = await fetch(`/api/admin/waitlist/${entry.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error);
      router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Nie udało się zmienić statusu."); }
    finally { setSaving(false); }
  }

  async function sendOffer() {
    if (!selected) return;
    setSaving(true); setMessage("");
    try {
      const response = await fetch(`/api/admin/waitlist/${selected.id}/offer`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...offer, startsAt: new Date(offer.startsAt).toISOString() }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error);
      setSelected(null);
      setMessage(result.matchesPreferences ? "Oferta została wysłana i termin czeka 24 godziny na odpowiedź." : "Oferta została wysłana. Uwaga: termin wykracza poza preferencje klienta.");
      router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Nie udało się wysłać oferty."); }
    finally { setSaving(false); }
  }

  return <div>
    <div className="flex flex-wrap gap-2">{[["open", "OTWARTE"], ["active", "OCZEKUJĄCE"], ["offered", "OFERTY"], ["booked", "ZAREZERWOWANE"], ["all", "WSZYSTKIE"]].map(([value, label]) => <button key={value} type="button" onClick={() => setFilter(value)} className={`border px-3 py-2.5 text-xs ${filter === value ? "border-ink-gold bg-ink-gold/10 text-ink-gold" : "border-ink-white/15 text-ink-grey"}`}>{label}</button>)}</div>
    {message && <p role="status" className="mt-4 border border-ink-gold/35 bg-ink-gold/5 p-3 text-sm text-ink-gold">{message}</p>}
    <div className="mt-5 grid gap-4 xl:grid-cols-2">{visible.map((entry) => { const status = entry.status as WaitlistStatus; return <article key={entry.id} className="border border-ink-white/15 bg-ink-charcoal/30 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><Link href={`/admin/clients/${entry.client.id}?view=projects`} className="text-lg text-ink-white hover:text-ink-gold">{entry.client.name}</Link><p className="mt-1 text-sm text-ink-gold">{entry.project.title}</p></div><span className={`border px-2 py-1 text-xs ${status === "active" ? "border-emerald-400/40 text-emerald-200" : status === "offered" ? "border-blue-400/40 text-blue-200" : "border-ink-white/20 text-ink-grey"}`}>{WAITLIST_STATUS_LABEL[status] || status}</span></div>
      <div className="mt-4 grid grid-cols-2 gap-3 text-sm"><div><p className="text-xs text-ink-grey">CZAS</p><p className="mt-1">{entry.durationMinutes < 60 ? `${entry.durationMinutes} min` : `${entry.durationMinutes / 60} godz.`}</p></div><div><p className="text-xs text-ink-grey">PORA</p><p className="mt-1">{WAITLIST_TIME_LABEL[entry.timePreference as keyof typeof WAITLIST_TIME_LABEL] || "Dowolna"}</p></div><div><p className="text-xs text-ink-grey">DNI</p><p className="mt-1">{entry.preferredWeekdays.split(",").map((day) => DAY_LABEL[day]).join(", ")}</p></div><div><p className="text-xs text-ink-grey">ZAKRES</p><p className="mt-1">{entry.earliestDate || "od teraz"}{entry.latestDate ? ` – ${entry.latestDate}` : ""}</p></div></div>
      {entry.notes && <p className="mt-4 border-l-2 border-ink-gold/50 pl-3 text-sm text-ink-grey">{entry.notes}</p>}
      {entry.offeredAppointment && <p className="mt-4 border border-blue-400/30 bg-blue-400/5 p-3 text-sm text-blue-100">Oferta: {new Date(entry.offeredAppointment.startsAt).toLocaleString("pl-PL", { dateStyle: "medium", timeStyle: "short" })}{entry.offerExpiresAt && ` · ważna do ${new Date(entry.offerExpiresAt).toLocaleString("pl-PL", { dateStyle: "short", timeStyle: "short" })}`}</p>}
      <div className="mt-5 flex flex-wrap gap-2">{status === "active" && <AppButton onClick={() => { setSelected(entry); setOffer({ startsAt: "", durationMinutes: entry.durationMinutes, note: "" }); }}>ZAPROPONUJ TERMIN</AppButton>}{status === "active" && <AppButton variant="ghost" disabled={saving} onClick={() => changeStatus(entry, "paused")}>WSTRZYMAJ</AppButton>}{["paused", "closed", "booked"].includes(status) && <AppButton variant="secondary" disabled={saving} onClick={() => changeStatus(entry, "active")}>AKTYWUJ</AppButton>}{["active", "offered", "paused"].includes(status) && <AppButton variant="ghost" disabled={saving} onClick={() => changeStatus(entry, "closed")}>ZAMKNIJ</AppButton>}</div>
    </article>; })}{!visible.length && <p className="border border-dashed border-ink-white/15 p-8 text-center text-sm text-ink-grey xl:col-span-2">Brak wpisów w tym widoku.</p>}</div>
    {selected && <AppModal title="Zaproponuj zwolniony termin" subtitle={`${selected.client.name} · ${selected.project.title}`} onClose={() => setSelected(null)} footer={<div className="flex justify-end gap-2"><AppButton variant="ghost" onClick={() => setSelected(null)}>ANULUJ</AppButton><AppButton disabled={saving || !offer.startsAt} onClick={sendOffer}>{saving ? "WYSYŁANIE…" : "WYŚLIJ OFERTĘ"}</AppButton></div>}><div className="space-y-4"><p className="text-sm leading-relaxed text-ink-grey">Termin musi wcześniej istnieć w kalendarzu jako wolny. Po wysłaniu zostanie zablokowany dla tej osoby na 24 godziny.</p><label className="block text-xs text-ink-grey">DATA I GODZINA<input type="datetime-local" step="1800" value={offer.startsAt} onChange={(event) => setOffer({ ...offer, startsAt: event.target.value })} className="mt-2 w-full border border-ink-white/20 bg-ink-black p-3 text-sm text-ink-white" /></label><label className="block text-xs text-ink-grey">CZAS TRWANIA<select value={offer.durationMinutes} onChange={(event) => setOffer({ ...offer, durationMinutes: Number(event.target.value) })} className="mt-2 w-full border border-ink-white/20 bg-ink-black p-3 text-sm text-ink-white">{[30, 60, 90, 120, 180, 240, 300, 360, 480, 600, 720].map((minutes) => <option key={minutes} value={minutes}>{minutes < 60 ? `${minutes} min` : `${minutes / 60} godz.`}</option>)}</select></label><label className="block text-xs text-ink-grey">WIADOMOŚĆ (OPCJONALNIE)<textarea rows={3} value={offer.note} onChange={(event) => setOffer({ ...offer, note: event.target.value })} className="mt-2 w-full border border-ink-white/20 bg-transparent p-3 text-sm text-ink-white" /></label></div></AppModal>}
  </div>;
}
