"use client";
import type { FlashConfiguration } from "@/lib/flashBooking";
export default function FlashSettingsFields({ value, onChange }: { value: FlashConfiguration; onChange: (next: FlashConfiguration) => void }) {
  const input = "mt-1 w-full rounded border border-ink-white/20 bg-transparent p-2 text-ink-white";
  return <fieldset className="space-y-3 rounded-xl border border-ink-gold/25 p-4"><legend className="px-2 text-sm text-ink-gold">Rezerwacje Flash</legend>
    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={value.flashEnabled} onChange={e => onChange({ ...value, flashEnabled: e.target.checked })} />Udostępnij wzór do rezerwacji</label>
    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={value.flashUnique} onChange={e => onChange({ ...value, flashUnique: e.target.checked })} />Wzór unikatowy — jedna rezerwacja</label>
    <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm">Rozmiar Flash<input aria-label="Rozmiar Flash" value={value.flashSize || ""} maxLength={120} required={value.flashEnabled} onChange={e => onChange({ ...value, flashSize: e.target.value })} className={input} placeholder="np. 10 × 15 cm" /></label>
      {([{ key: "flashPrice", label: "Cena Flash (zł)", min: 1, step: 1 }, { key: "flashDurationMinutes", label: "Czas Flash (min)", min: 30, step: 30 }, { key: "flashDepositAmount", label: "Zadatek Flash (zł, opcjonalnie)", min: 1, step: 1 }] as const).map(field => <label key={field.key} className="text-sm">{field.label}<input aria-label={field.label} type="number" min={field.min} step={field.step} max={field.key === "flashDurationMinutes" ? 720 : 10000000} required={value.flashEnabled && field.key !== "flashDepositAmount"} value={value[field.key] ?? ""} onChange={e => onChange({ ...value, [field.key]: e.target.value === "" ? null : Number(e.target.value) })} className={input} /></label>)}
    </div><p className="text-xs text-ink-grey">Wzór korzysta z obecnego kalendarza i zadatków wizyt. Studio potwierdza termin oraz wpłatę. Anulowanie wszystkich sesji zwalnia unikatowy wzór; ukończony pozostaje zajęty.</p>
  </fieldset>;
}
