"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown, Link2, Unlink } from "lucide-react";
import type { SpacingBox } from "@/lib/modules";

const labelClass = "flex flex-col gap-1.5 text-[10px] tracking-[0.08em] text-ink-grey";
const inputClass = "h-9 border border-ink-white/15 bg-[#17191c] px-2.5 text-[12px] normal-case tracking-normal text-ink-white outline-none transition-colors focus:border-ink-gold";

export function TextField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return <label className={labelClass}>{label}<input type="text" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className={inputClass} /></label>;
}

export function TextareaField({ label, value, onChange, rows = 4, placeholder }: { label: string; value: string; onChange: (v: string) => void; rows?: number; placeholder?: string }) {
  return <label className={labelClass}>{label}<textarea value={value} onChange={(event) => onChange(event.target.value)} rows={rows} placeholder={placeholder} className="resize-y border border-ink-white/15 bg-[#17191c] px-2.5 py-2 text-[12px] leading-relaxed normal-case tracking-normal text-ink-white outline-none transition-colors focus:border-ink-gold" /></label>;
}

export function SelectField<T extends string>({ label, value, onChange, options }: { label: string; value: T; onChange: (v: T) => void; options: { value: T; label: string }[] }) {
  return <label className={labelClass}>{label}<select value={value} onChange={(event) => onChange(event.target.value as T)} className={inputClass}>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>;
}

export function NumberField({ label, value, onChange, min, max, step = 1 }: { label: string; value: number; onChange: (value: number) => void; min?: number; max?: number; step?: number }) {
  return <label className={labelClass}>{label}<input type="number" value={value} min={min} max={max} step={step} onChange={(event) => onChange(Number(event.target.value) || 0)} className={inputClass} /></label>;
}

export function FieldGroup({ title, children, defaultOpen = false }: { title: string; children: ReactNode; defaultOpen?: boolean }) {
  return <details open={defaultOpen || undefined} className="group border-t border-ink-white/10"><summary className="flex cursor-pointer list-none items-center justify-between py-3 text-[11px] font-semibold tracking-[0.04em] text-ink-white marker:hidden">{title}<ChevronDown className="h-3.5 w-3.5 text-ink-grey transition-transform group-open:rotate-180" /></summary><div className="flex flex-col gap-3 pb-4">{children}</div></details>;
}

export function PanelSection({ title, children, defaultOpen = false }: { title: string; children: ReactNode; defaultOpen?: boolean }) {
  return <FieldGroup title={title} defaultOpen={defaultOpen}>{children}</FieldGroup>;
}

export function BoxSpacingField({ label, value, onChange }: { label: string; value?: SpacingBox; onChange: (value: SpacingBox) => void }) {
  const [linked, setLinked] = useState(false);
  const current = value ?? { top: 0, right: 0, bottom: 0, left: 0 };
  const sides = ["top", "right", "bottom", "left"] as const;
  const labels = ["Góra", "Prawo", "Dół", "Lewo"];
  function change(side: (typeof sides)[number], next: number) {
    if (linked) return onChange({ top: next, right: next, bottom: next, left: next });
    onChange({ ...current, [side]: next });
  }
  return <fieldset><div className="mb-1.5 flex items-center justify-between"><legend className="text-[10px] tracking-[0.08em] text-ink-grey">{label}</legend><span className="text-[9px] text-ink-grey/70">PX</span></div><div className="grid grid-cols-[repeat(4,minmax(0,1fr))_32px]">{sides.map((side, index) => <label key={side} className="min-w-0 text-center"><input type="number" value={current[side]} min={-300} max={600} onChange={(event) => change(side, Number(event.target.value) || 0)} className="h-8 w-full min-w-0 border border-r-0 border-ink-white/15 bg-[#17191c] px-1 text-center text-[11px] text-white outline-none focus:border-ink-gold" /><span className="mt-1 block text-[8px] text-ink-grey/65">{labels[index]}</span></label>)}<button type="button" aria-pressed={linked} aria-label={linked ? "Rozłącz wartości" : "Połącz wartości"} onClick={() => setLinked((state) => !state)} className="flex h-8 items-center justify-center border border-ink-white/15 bg-[#25282c] text-ink-grey hover:text-ink-gold">{linked ? <Link2 className="h-3.5 w-3.5" /> : <Unlink className="h-3.5 w-3.5" />}</button></div></fieldset>;
}
