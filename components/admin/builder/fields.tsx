"use client";

import { useState, type ReactNode } from "react";
import { AlignCenter, AlignJustify, AlignLeft, AlignRight, ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Ban, Check, ChevronDown, Circle, Columns3, Eye, EyeOff, Grid3X3, Layers3, Link2, List, Maximize2, Minimize2, MoveHorizontal, MoveVertical, PanelBottom, PanelTop, RotateCw, Rows3, Sparkles, Square, StretchHorizontal, Unlink, ZoomIn, type LucideIcon } from "lucide-react";
import type { SpacingBox } from "@/lib/modules";

const labelClass = "flex flex-col gap-1.5 text-[10px] tracking-[0.08em] text-ink-grey";
const inputClass = "h-9 border border-ink-white/15 bg-[#17191c] px-2.5 text-[12px] normal-case tracking-normal text-ink-white outline-none transition-colors focus:border-ink-gold";

export function TextField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return <label className={labelClass}>{label}<input type="text" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className={inputClass} /></label>;
}

function isoToLocalInput(value: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

export function DateTimeField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className={labelClass}>{label}<input type="datetime-local" value={isoToLocalInput(value)} onChange={(event) => { const date = new Date(event.target.value); onChange(event.target.value && !Number.isNaN(date.getTime()) ? date.toISOString() : ""); }} className={inputClass} /></label>;
}

export function TextareaField({ label, value, onChange, rows = 4, placeholder }: { label: string; value: string; onChange: (v: string) => void; rows?: number; placeholder?: string }) {
  return <label className={labelClass}>{label}<textarea value={value} onChange={(event) => onChange(event.target.value)} rows={rows} placeholder={placeholder} className="resize-y border border-ink-white/15 bg-[#17191c] px-2.5 py-2 text-[12px] leading-relaxed normal-case tracking-normal text-ink-white outline-none transition-colors focus:border-ink-gold" /></label>;
}

function selectIcon(value: string): LucideIcon | null {
  const icons: Record<string, LucideIcon> = {
    none: Ban, auto: Sparkles, left: AlignLeft, center: AlignCenter, centered: AlignCenter, right: AlignRight, justify: AlignJustify,
    top: ArrowUp, bottom: ArrowDown, start: ArrowLeft, end: ArrowRight, "top left": ArrowUp, "top right": ArrowUp, "bottom left": ArrowDown, "bottom right": ArrowDown,
    full: Maximize2, wide: StretchHorizontal, normal: Square, narrow: Minimize2, sm: Minimize2, md: Square, lg: Maximize2, xl: Maximize2,
    one: Square, two: Columns3, three: Columns3, four: Grid3X3, five: Grid3X3, six: Grid3X3, seven: Grid3X3, eight: Grid3X3,
    row: Rows3, "row-reverse": Rows3, column: Columns3, "column-reverse": Columns3, grid: Grid3X3, masonry: Layers3, list: List, cards: Grid3X3, steps: List,
    visible: Eye, hidden: EyeOff, clip: Minimize2, cover: Maximize2, contain: Minimize2, stretch: StretchHorizontal,
    horizontal: MoveHorizontal, vertical: MoveVertical, both: Maximize2, static: Square, relative: MoveHorizontal, sticky: PanelTop, absolute: Layers3,
    fade: Eye, "fade-up": ArrowUp, "fade-down": ArrowDown, "fade-left": ArrowLeft, "fade-right": ArrowRight, zoom: ZoomIn, rotate: RotateCw, "blur-in": Eye,
    primary: Square, outline: Square, plain: List, line: StretchHorizontal, gold: StretchHorizontal, space: MoveVertical,
    first: PanelTop, last: PanelBottom, check: Check, dot: Circle, arrow: ArrowRight, landscape: StretchHorizontal, portrait: MoveVertical, square: Square,
  };
  return icons[value] ?? null;
}

export function SelectField<T extends string>({ label, value, onChange, options }: { label: string; value: T; onChange: (v: T) => void; options: { value: T; label: string }[] }) {
  const selected = options.find((option) => option.value === value)?.label ?? value;
  return <div className={labelClass}><span className="flex items-center justify-between gap-2"><span>{label}</span><span className="truncate normal-case tracking-normal text-white/60">{selected}</span></span><div role="group" aria-label={label} className="grid grid-cols-4 gap-1">{options.map((option) => { const Icon = selectIcon(option.value); const active = option.value === value; return <button key={option.value} type="button" aria-pressed={active} aria-label={option.label} title={option.label} onClick={() => onChange(option.value)} className={`flex min-h-9 min-w-0 items-center justify-center gap-1 border px-1.5 text-[9px] transition ${active ? "border-ink-gold bg-ink-gold/10 text-ink-gold" : "border-white/10 bg-[#17191c] text-white/50 hover:border-white/25 hover:text-white"}`}>{Icon ? <Icon className="h-4 w-4 shrink-0" /> : <span className="truncate">{option.label}</span>}</button>; })}</div></div>;
}

export function NumberField({ label, value, onChange, min, max, step = 1 }: { label: string; value: number; onChange: (value: number) => void; min?: number; max?: number; step?: number }) {
  return <label className={labelClass}>{label}<input type="number" value={value} min={min} max={max} step={step} onChange={(event) => onChange(Number(event.target.value) || 0)} className={inputClass} /></label>;
}

export function RangeField({ label, value, onChange, min, max, step = 1, suffix = "" }: { label: string; value: number; onChange: (value: number) => void; min: number; max: number; step?: number; suffix?: string }) {
  return <label className={labelClass}><span className="flex items-center justify-between"><span>{label}</span><span className="text-white/75">{value}{suffix}</span></span><input type="range" value={value} min={min} max={max} step={step} onChange={(event) => onChange(Number(event.target.value))} className="h-2 w-full cursor-pointer accent-[#c99a4a]" /></label>;
}

export function ToggleField({ label, description, checked, onChange }: { label: string; description?: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return <label className="flex cursor-pointer items-start justify-between gap-3 border border-ink-white/10 bg-[#17191c] px-3 py-2.5"><span><span className="block text-[10px] tracking-[0.06em] text-ink-white">{label}</span>{description && <span className="mt-0.5 block text-[9px] leading-relaxed text-ink-grey">{description}</span>}</span><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-[#c99a4a]" /></label>;
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
