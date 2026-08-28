"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/admin/ToastProvider";
import ConfirmButton from "@/components/admin/ConfirmButton";
import ColorPicker from "@/components/admin/builder/ColorPicker";
import IconPicker from "@/components/admin/builder/IconPicker";
import RichTextEditor from "@/components/admin/RichTextEditor";

export type CalendarEditorKind = "dayOff" | "freeTerm" | "promotion" | "event" | "workingHours";
export type CalendarEditorItem = { id?: string; kind: CalendarEditorKind; title?: string | null; reason?: string | null; description?: string | null; startsAt: string; endsAt: string; color?: string; icon?: string | null; badge?: string | null; label?: string | null; promoCode?: string | null; ctaLabel?: string | null; ctaUrl?: string | null; active?: boolean; isPublic?: boolean; allDay?: boolean; dates?: string[]; hours?: { startsAt?: string; endsAt?: string; enabled?: boolean; breakStart?: string; breakEnd?: string } };

function datetime(value: string) { const date = new Date(value); const part = (number: number) => String(number).padStart(2, "0"); return `${date.getFullYear()}-${part(date.getMonth() + 1)}-${part(date.getDate())}T${part(date.getHours())}:${part(date.getMinutes())}`; }

export default function CalendarItemEditor({ item, onClose }: { item: CalendarEditorItem; onClose: () => void }) {
  const router = useRouter(); const { showToast } = useToast(); const [value, setValue] = useState(item); const [saving, setSaving] = useState(false);
  const title = value.kind === "dayOff" ? "Dzień wolny" : value.kind === "freeTerm" ? "Wolny termin" : value.kind === "promotion" ? "Promocja" : value.kind === "event" ? "Wydarzenie" : "Godziny pracy";
  const set = (next: Partial<CalendarEditorItem>) => setValue((current) => ({ ...current, ...next }));

  async function submit() {
    setSaving(true);
    try {
      const method = value.id ? "PATCH" : "POST";
      const response = await fetch("/api/admin/calendar-items", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(value) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error);
      showToast(`${title} ${value.id ? "zaktualizowano" : "dodano"}.`); router.refresh(); onClose();
    } catch (error) { showToast(error instanceof Error ? error.message : "Nie udało się zapisać.", "error"); } finally { setSaving(false); }
  }
  async function remove() {
    if (!value.id) return;
    const response = await fetch(`/api/admin/calendar-items?kind=${encodeURIComponent(value.kind)}&id=${encodeURIComponent(value.id)}`, { method: "DELETE" });
    const data = await response.json(); if (!response.ok) throw new Error(data.error);
    showToast(`${title} usunięto.`); router.refresh(); onClose();
  }

  return <div className="fixed inset-0 z-[90] flex justify-end bg-ink-black/75" onClick={!saving ? onClose : undefined}>
    <aside className="h-full w-full max-w-xl overflow-y-auto border-l border-ink-white/15 bg-ink-charcoal p-5 shadow-2xl sm:p-7" onClick={(event) => event.stopPropagation()} aria-label={title}>
      <div className="flex items-start justify-between gap-5"><div><p className="text-[10px] tracking-[0.15em] text-ink-gold">CALENDAR HUB</p><h2 className="mt-2 font-display text-3xl text-ink-white">{title}</h2>{value.dates && <p className="mt-2 text-xs text-ink-grey">Zaznaczono {value.dates.length} {value.dates.length === 1 ? "dzień" : "dni"}.</p>}</div><button type="button" onClick={onClose} aria-label="Zamknij" className="text-xl text-ink-grey hover:text-ink-white">×</button></div>
      <div className="mt-7 space-y-4">
        {value.kind === "dayOff" && <label className="block text-[11px] tracking-[0.1em] text-ink-grey">OPIS<input value={value.reason ?? ""} onChange={(event) => set({ reason: event.target.value })} placeholder="Np. urlop, szkolenie" className="mt-2 w-full border border-ink-white/15 bg-ink-black px-3 py-2.5 text-sm text-ink-white" /></label>}
        {(value.kind === "freeTerm" || value.kind === "promotion" || value.kind === "event") && <><label className="block text-[11px] tracking-[0.1em] text-ink-grey">{value.kind === "promotion" ? "NAZWA PROMOCJI" : value.kind === "event" ? "TYTUŁ WYDARZENIA" : "NAZWA (OPCJONALNIE)"}<input value={value.title ?? ""} onChange={(event) => set({ title: event.target.value })} className="mt-2 w-full border border-ink-white/15 bg-ink-black px-3 py-2.5 text-sm text-ink-white" /></label>{value.kind === "event" && <label className="block text-[11px] tracking-[0.1em] text-ink-grey">ETYKIETA<input value={value.label ?? ""} onChange={(event) => set({ label: event.target.value })} placeholder="EVENT, WALK-IN, CONVENT…" className="mt-2 w-full border border-ink-white/15 bg-ink-black px-3 py-2.5 text-sm text-ink-white" /></label>}{value.kind === "promotion" && <label className="block text-[11px] tracking-[0.1em] text-ink-grey">BADGE<input value={value.badge ?? ""} onChange={(event) => set({ badge: event.target.value })} placeholder="PROMO" className="mt-2 w-full border border-ink-white/15 bg-ink-black px-3 py-2.5 text-sm text-ink-white" /></label>}<RichTextEditor label="OPIS" value={value.description ?? ""} onChange={(description) => set({ description })} /><div className="grid gap-4 sm:grid-cols-2"><ColorPicker label="KOLOR" value={value.color ?? (value.kind === "promotion" ? "#C99A4A" : value.kind === "freeTerm" ? "#10B981" : "#6B7280")} onChange={(color) => set({ color })} /><IconPicker value={value.icon ?? ""} onChange={(icon) => set({ icon })} /></div></>}
        {value.kind === "workingHours" && <div className="grid gap-4 sm:grid-cols-2"><label className="text-[11px] tracking-[0.1em] text-ink-grey">OD<input type="time" value={value.hours?.startsAt ?? "10:00"} onChange={(event) => set({ hours: { ...value.hours, startsAt: event.target.value } })} className="mt-2 w-full border border-ink-white/15 bg-ink-black px-3 py-2.5 text-sm text-ink-white" /></label><label className="text-[11px] tracking-[0.1em] text-ink-grey">DO<input type="time" value={value.hours?.endsAt ?? "19:00"} onChange={(event) => set({ hours: { ...value.hours, endsAt: event.target.value } })} className="mt-2 w-full border border-ink-white/15 bg-ink-black px-3 py-2.5 text-sm text-ink-white" /></label></div>}
        {value.kind !== "workingHours" && <div className="grid gap-4 sm:grid-cols-2"><label className="text-[11px] tracking-[0.1em] text-ink-grey">OD<input type="datetime-local" value={datetime(value.startsAt)} onChange={(event) => set({ startsAt: new Date(event.target.value).toISOString() })} className="mt-2 w-full border border-ink-white/15 bg-ink-black px-3 py-2.5 text-sm text-ink-white" /></label><label className="text-[11px] tracking-[0.1em] text-ink-grey">DO<input type="datetime-local" value={datetime(value.endsAt)} onChange={(event) => set({ endsAt: new Date(event.target.value).toISOString() })} className="mt-2 w-full border border-ink-white/15 bg-ink-black px-3 py-2.5 text-sm text-ink-white" /></label></div>}
        {value.kind === "promotion" && <div className="grid gap-4 sm:grid-cols-2"><label className="text-[11px] tracking-[0.1em] text-ink-grey">KOD PROMO<input value={value.promoCode ?? ""} onChange={(event) => set({ promoCode: event.target.value })} className="mt-2 w-full border border-ink-white/15 bg-ink-black px-3 py-2.5 text-sm text-ink-white" /></label><label className="text-[11px] tracking-[0.1em] text-ink-grey">CTA<input value={value.ctaLabel ?? ""} onChange={(event) => set({ ctaLabel: event.target.value })} className="mt-2 w-full border border-ink-white/15 bg-ink-black px-3 py-2.5 text-sm text-ink-white" /></label></div>}
        {(value.kind === "freeTerm" || value.kind === "promotion" || value.kind === "event") && <div className="flex flex-wrap gap-5"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={Boolean(value.isPublic)} onChange={(event) => set({ isPublic: event.target.checked })} />Widoczne publicznie</label>{value.kind === "promotion" && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={value.active !== false} onChange={(event) => set({ active: event.target.checked })} />Aktywne</label>}{value.kind === "event" && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={Boolean(value.allDay)} onChange={(event) => set({ allDay: event.target.checked })} />Cały dzień</label>}</div>}
      </div>
      <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-ink-white/10 pt-5"><button type="button" disabled={saving} onClick={submit} className="border border-ink-gold bg-ink-gold px-4 py-2.5 text-xs tracking-[0.08em] text-ink-black disabled:opacity-50">{saving ? "ZAPIS…" : "ZAPISZ"}</button>{value.id && <ConfirmButton label="USUŃ" confirmText={`Usunąć: ${title}?`} onConfirm={remove} className="border border-red-400/60 px-4 py-2.5 text-xs tracking-[0.08em] text-red-300" />}<button type="button" onClick={onClose} className="px-3 py-2 text-xs text-ink-grey hover:text-ink-white">Anuluj</button></div>
    </aside>
  </div>;
}
