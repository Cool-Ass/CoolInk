"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppButton from "@/components/ui/AppButton";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { WAITLIST_STATUS_LABEL, WAITLIST_TIME_LABEL, type WaitlistStatus } from "@/lib/waitlist";

type Project = { id: string; title: string };
type Entry = { id: string; projectId: string; status: string; durationMinutes: number; preferredWeekdays: string; timePreference: string; earliestDate: string | null; latestDate: string | null; notes: string | null; offerExpiresAt: string | null };
const DAYS = [{ value: 1, label: "Pn" }, { value: 2, label: "Wt" }, { value: 3, label: "Śr" }, { value: 4, label: "Cz" }, { value: 5, label: "Pt" }, { value: 6, label: "Sb" }, { value: 0, label: "Nd" }];

export default function ClientWaitlistCard({ projects, entries }: { projects: Project[]; entries: Entry[] }) {
  const router = useRouter();
  const [projectId, setProjectId] = useState(entries.find((item) => ["active", "offered", "paused"].includes(item.status))?.projectId ?? projects[0]?.id ?? "");
  const selected = entries.find((item) => item.projectId === projectId);
  const [form, setForm] = useState(() => ({ durationMinutes: selected?.durationMinutes ?? 120, preferredWeekdays: (selected?.preferredWeekdays || "1,2,3,4,5").split(",").map(Number), timePreference: selected?.timePreference ?? "any", earliestDate: selected?.earliestDate ?? "", latestDate: selected?.latestDate ?? "", notes: selected?.notes ?? "" }));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [closing, setClosing] = useState(false);
  const status = selected?.status as WaitlistStatus | undefined;
  const activeEntries = useMemo(() => entries.filter((item) => ["active", "offered", "paused"].includes(item.status)), [entries]);

  function chooseProject(id: string) {
    setProjectId(id);
    const entry = entries.find((item) => item.projectId === id);
    setForm({ durationMinutes: entry?.durationMinutes ?? 120, preferredWeekdays: (entry?.preferredWeekdays || "1,2,3,4,5").split(",").map(Number), timePreference: entry?.timePreference ?? "any", earliestDate: entry?.earliestDate ?? "", latestDate: entry?.latestDate ?? "", notes: entry?.notes ?? "" });
    setMessage("");
  }

  async function save() {
    setSaving(true); setMessage("");
    try {
      const response = await fetch("/api/client/waitlist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId, ...form }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Nie udało się zapisać preferencji.");
      setMessage("Lista rezerwowa jest aktywna. Powiadomię Cię, gdy pojawi się pasujący termin.");
      router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Nie udało się zapisać preferencji."); }
    finally { setSaving(false); }
  }

  async function close() {
    if (!selected) return;
    setSaving(true); setClosing(false); setMessage("");
    try {
      const response = await fetch("/api/client/waitlist", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: selected.id }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Nie udało się zamknąć wpisu.");
      setMessage("Usunięto projekt z listy rezerwowej."); router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Nie udało się zamknąć wpisu."); }
    finally { setSaving(false); }
  }

  if (!projects.length) return <section id="lista-rezerwowa" className="mt-6 border border-ink-white/15 bg-ink-charcoal/30 p-5"><p className="text-xs tracking-[.14em] text-ink-gold">LISTA REZERWOWA</p><h2 className="mt-2 font-display text-2xl">Poluj na wcześniejszy termin</h2><p className="mt-3 text-sm text-ink-grey">Najpierw utwórz projekt tatuażu. Potem zapiszesz go na listę zwolnionych terminów.</p><Link href="/app/new-project" className="mt-4 inline-block border border-ink-gold px-4 py-2.5 text-xs text-ink-gold">UTWÓRZ PROJEKT</Link></section>;

  return <section id="lista-rezerwowa" className="mt-6 scroll-mt-6 border border-ink-white/15 bg-ink-charcoal/30 p-5 sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs tracking-[.14em] text-ink-gold">LISTA REZERWOWA</p><h2 className="mt-2 font-display text-2xl">Daj znać, kiedy możesz przyjść</h2><p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-grey">Gdy zwolni się pasujący termin, dostaniesz propozycję w aplikacji. Termin jest Twój dopiero po akceptacji.</p></div>{activeEntries.length > 0 && <span className="border border-ink-gold/40 px-3 py-2 text-xs text-ink-gold">AKTYWNE: {activeEntries.length}</span>}</div>
    <div className="mt-5 grid gap-4 lg:grid-cols-2">
      <label className="text-xs text-ink-grey">PROJEKT<select value={projectId} onChange={(event) => chooseProject(event.target.value)} className="mt-2 w-full border border-ink-white/20 bg-ink-black p-3 text-sm text-ink-white">{projects.map((project) => <option key={project.id} value={project.id}>{project.title}</option>)}</select></label>
      <label className="text-xs text-ink-grey">POTRZEBNY CZAS<select value={form.durationMinutes} onChange={(event) => setForm({ ...form, durationMinutes: Number(event.target.value) })} className="mt-2 w-full border border-ink-white/20 bg-ink-black p-3 text-sm text-ink-white">{[30, 60, 90, 120, 180, 240, 300, 360, 480, 600, 720].map((minutes) => <option key={minutes} value={minutes}>{minutes < 60 ? `${minutes} min` : `${minutes / 60} godz.`}</option>)}</select></label>
      <label className="text-xs text-ink-grey">NAJWCZEŚNIEJ<input type="date" value={form.earliestDate} onChange={(event) => setForm({ ...form, earliestDate: event.target.value })} className="mt-2 w-full border border-ink-white/20 bg-ink-black p-3 text-sm text-ink-white" /></label>
      <label className="text-xs text-ink-grey">NAJPÓŹNIEJ (OPCJONALNIE)<input type="date" value={form.latestDate} onChange={(event) => setForm({ ...form, latestDate: event.target.value })} className="mt-2 w-full border border-ink-white/20 bg-ink-black p-3 text-sm text-ink-white" /></label>
      <fieldset className="lg:col-span-2"><legend className="text-xs text-ink-grey">PASUJĄCE DNI</legend><div className="mt-2 flex flex-wrap gap-2">{DAYS.map((day) => { const checked = form.preferredWeekdays.includes(day.value); return <label key={day.value} className={`flex min-h-11 min-w-11 cursor-pointer items-center justify-center border px-3 text-sm ${checked ? "border-ink-gold bg-ink-gold/10 text-ink-gold" : "border-ink-white/15 text-ink-grey"}`}><input type="checkbox" className="sr-only" checked={checked} onChange={() => setForm({ ...form, preferredWeekdays: checked ? form.preferredWeekdays.filter((value) => value !== day.value) : [...form.preferredWeekdays, day.value] })} />{day.label}</label>; })}</div></fieldset>
      <label className="text-xs text-ink-grey">PORA DNIA<select value={form.timePreference} onChange={(event) => setForm({ ...form, timePreference: event.target.value })} className="mt-2 w-full border border-ink-white/20 bg-ink-black p-3 text-sm text-ink-white">{Object.entries(WAITLIST_TIME_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label className="text-xs text-ink-grey">DODATKOWA INFORMACJA<input value={form.notes} maxLength={1000} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="Np. mogę przyjechać z godzinnym wyprzedzeniem" className="mt-2 w-full border border-ink-white/20 bg-transparent p-3 text-sm text-ink-white" /></label>
    </div>
    {status && <div className={`mt-5 border p-4 text-sm ${status === "offered" ? "border-emerald-400/40 bg-emerald-400/5 text-emerald-100" : "border-ink-white/15 text-ink-grey"}`}><strong className="text-ink-white">{WAITLIST_STATUS_LABEL[status]}</strong>{status === "offered" && <><p className="mt-2">Masz nową propozycję. {selected?.offerExpiresAt && `Odpowiedz do ${new Date(selected.offerExpiresAt).toLocaleString("pl-PL", { dateStyle: "short", timeStyle: "short" })}.`}</p><Link href="/app/portal/projects" className="mt-3 inline-block text-ink-gold">PRZEJDŹ DO PROJEKTU →</Link></>}</div>}
    {message && <p role="status" className="mt-4 text-sm text-ink-gold">{message}</p>}
    <div className="mt-5 flex flex-wrap gap-3"><AppButton disabled={saving || !projectId || form.preferredWeekdays.length === 0 || status === "offered"} onClick={save}>{saving ? "ZAPISYWANIE…" : selected && status !== "closed" ? "ZAPISZ PREFERENCJE" : "DOŁĄCZ DO LISTY"}</AppButton>{selected && ["active", "offered", "paused"].includes(selected.status) && <AppButton variant="ghost" disabled={saving} onClick={() => setClosing(true)}>REZYGNUJ Z LISTY</AppButton>}</div>
    {closing && <ConfirmModal message="Zrezygnować z listy rezerwowej dla tego projektu? Ewentualna oczekująca propozycja terminu zostanie anulowana." onCancel={() => setClosing(false)} onConfirm={close} pending={saving} pendingLabel="ZAPIS…" />}
  </section>;
}
