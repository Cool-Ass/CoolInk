"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AppButton from "@/components/ui/AppButton";
import { useToast } from "@/components/admin/ToastProvider";
import type { BookingBufferRules } from "@/lib/bookingRules";

export default function CalendarSettingsEditor({ bufferMinutes, bufferRules, visibleMonths, defaultFreeStart, defaultFreeEnd }: { bufferMinutes: number; bufferRules: BookingBufferRules; visibleMonths: number; defaultFreeStart: string; defaultFreeEnd: string }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [buffer, setBuffer] = useState(bufferMinutes);
  const [months, setMonths] = useState(visibleMonths);
  const [start, setStart] = useState(defaultFreeStart);
  const [end, setEnd] = useState(defaultFreeEnd);
  const [rules, setRules] = useState(bufferRules);
  const [workstations, setWorkstations] = useState(Object.entries(bufferRules.workstations).map(([name, minutes]) => `${name}: ${minutes}`).join("\n"));
  const [saving, setSaving] = useState(false);
  async function save() {
    if (start >= end) return showToast("Godzina zakończenia musi być późniejsza niż rozpoczęcie.", "error");
    setSaving(true);
    try {
      const workstationRules = Object.fromEntries(workstations.split(/\r?\n/).map((line) => { const split = line.lastIndexOf(":"); return split > 0 ? [line.slice(0, split).trim(), Number(line.slice(split + 1).trim())] : ["", NaN]; }).filter(([name, minutes]) => name && Number.isInteger(minutes) && Number(minutes) >= 0));
      const response = await fetch("/api/admin/availability", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bufferMinutes: buffer, bufferRules: { ...rules, workstations: workstationRules }, visibleMonths: months, defaultFreeStart: start, defaultFreeEnd: end }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Nie udało się zapisać ustawień.");
      showToast("Ustawienia kalendarza zapisane."); router.refresh();
    } catch (error) { showToast(error instanceof Error ? error.message : "Nie udało się zapisać ustawień.", "error"); }
    finally { setSaving(false); }
  }
  const ruleField = (label: string, key: "consultation" | "tattooShort" | "tattooLong" | "longSessionFromMinutes") => <label className="flex items-center justify-between gap-3 text-xs text-ink-grey">{label}<span className="flex items-center gap-1"><input type="number" min={key === "longSessionFromMinutes" ? 60 : 0} max={key === "longSessionFromMinutes" ? 720 : 240} step={5} value={rules[key]} onChange={(event) => setRules({ ...rules, [key]: Number(event.target.value) })} className="w-20 border border-ink-white/15 bg-ink-black p-2 text-ink-white" />min</span></label>;
  return <div className="grid gap-5"><div className="grid gap-3 border border-ink-white/10 p-3"><p className="text-xs tracking-wider text-ink-gold">BUFORY DYNAMICZNE</p>{ruleField("KONSULTACJA", "consultation")}{ruleField("KRÓTKI TATUAŻ", "tattooShort")}{ruleField("DŁUGI TATUAŻ", "tattooLong")}{ruleField("DŁUGA SESJA OD", "longSessionFromMinutes")}<label className="text-xs text-ink-grey">STANOWISKA — NAZWA: MINUTY<textarea rows={3} value={workstations} onChange={(event) => setWorkstations(event.target.value)} placeholder="Stanowisko 1: 45" className="mt-2 block w-full border border-ink-white/15 bg-ink-black p-2 text-white" /></label><label className="flex items-center justify-between gap-4 text-xs text-ink-grey">BUFOR AWARYJNY<span className="flex items-center gap-2"><input aria-label="Bufor między wizytami" type="number" min="0" max="240" step="5" value={buffer} onChange={(event) => setBuffer(Number(event.target.value))} className="w-20 border border-ink-white/15 bg-ink-black p-2 text-ink-white" />min</span></label></div><label className="flex items-center justify-between gap-4 text-sm text-ink-grey">KLIENT WIDZI DO PRZODU<span className="flex items-center gap-2"><input aria-label="Miesiące widoczności" type="number" min="1" max="12" value={months} onChange={(event) => setMonths(Number(event.target.value))} className="w-20 border border-ink-white/15 bg-ink-black p-2 text-ink-white" />mies.</span></label><div><p className="text-sm text-ink-grey">DOMYŚLNY WOLNY TERMIN</p><div className="mt-3 grid grid-cols-2 gap-4"><label className="text-xs text-ink-grey">OD<input type="time" value={start} onChange={(event) => setStart(event.target.value)} className="mt-2 block w-full border border-ink-white/15 bg-ink-black p-2 text-ink-white" /></label><label className="text-xs text-ink-grey">DO<input type="time" value={end} onChange={(event) => setEnd(event.target.value)} className="mt-2 block w-full border border-ink-white/15 bg-ink-black p-2 text-ink-white" /></label></div></div><AppButton disabled={saving} onClick={save}>{saving ? "ZAPIS…" : "ZAPISZ"}</AppButton></div>;
}
