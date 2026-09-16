"use client";

import { useState, type ReactNode } from "react";
import { AlignCenter, AlignJustify, AlignLeft, AlignRight, ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Ban, Check, ChevronDown, Circle, Columns3, Eye, EyeOff, Grid3X3, Layers3, Link2, List, Maximize2, Minimize2, MoveHorizontal, MoveVertical, PanelBottom, PanelTop, RotateCw, Rows3, Sparkles, Square, StretchHorizontal, Unlink, ZoomIn, type LucideIcon } from "lucide-react";
import type { SpacingBox } from "@/lib/modules";

const labelClass = "flex min-w-0 flex-col gap-1 text-[10px] tracking-[0.04em] text-white/70";
const inputClass = "min-h-9 w-full min-w-0 max-w-full rounded-md border border-white/15 bg-[#17191c] px-2 text-[11px] normal-case tracking-normal text-white outline-none transition-colors hover:border-white/30 focus-visible:border-ink-gold focus-visible:ring-1 focus-visible:ring-ink-gold disabled:cursor-not-allowed disabled:opacity-45";

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
  return <label className={labelClass}>{label}<textarea value={value} onChange={(event) => onChange(event.target.value)} rows={rows} placeholder={placeholder} className="min-h-20 w-full min-w-0 max-w-full resize-y rounded-md border border-white/15 bg-[#17191c] px-2 py-2 text-[11px] leading-relaxed normal-case tracking-normal text-white outline-none transition-colors hover:border-white/30 focus-visible:border-ink-gold focus-visible:ring-1 focus-visible:ring-ink-gold" /></label>;
}

function selectIcon(value: string): LucideIcon | null {
  const icons: Record<string, LucideIcon> = {
    none: Ban, transparent: Ban, auto: Sparkles, left: AlignLeft, center: AlignCenter, centered: AlignCenter, right: AlignRight, justify: AlignJustify,
    top: ArrowUp, bottom: ArrowDown, start: ArrowLeft, end: ArrowRight, "top left": ArrowUp, "top right": ArrowUp, "bottom left": ArrowDown, "bottom right": ArrowDown,
    full: Maximize2, wide: StretchHorizontal, normal: Square, narrow: Minimize2, sm: Minimize2, md: Square, lg: Maximize2, xl: Maximize2,
    one: Square, two: Columns3, three: Columns3, four: Grid3X3, five: Grid3X3, six: Grid3X3, seven: Grid3X3, eight: Grid3X3,
    row: Columns3, stack: Rows3, "row-reverse": Rows3, column: Columns3, "column-reverse": Columns3, grid: Grid3X3, masonry: Layers3, list: List, cards: Grid3X3, steps: List,
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
  const columnNumbers: Record<string, string> = { one: "1", two: "2", three: "3", four: "4", five: "5", six: "6", seven: "7", eight: "8" };
  if (options.length > 12) {
    return <label className={labelClass}>{label}<select value={value} onChange={(event) => onChange(event.target.value as T)} className={inputClass}>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>;
  }
  return <fieldset className="min-w-0"><legend className="sr-only">{label}</legend><div className="mb-1 flex min-w-0 items-center justify-between gap-2 text-[10px] tracking-[0.04em] text-white/70"><span className="min-w-0 break-words">{label}</span><span className="min-w-0 truncate normal-case tracking-normal text-white/80" title={selected}>{selected}</span></div><div className="grid min-w-0 gap-px rounded-md border border-white/12 bg-white/10 p-px" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(40px, 1fr))" }}>{options.map((option) => { const Icon = selectIcon(option.value); const glyph = ({ "300": "300", "400": "400", "500": "500", "600": "600", "700": "700", underline: "U̲", "line-through": "S̶", overline: "A̅", uppercase: "AA", lowercase: "aa", capitalize: "Aa", italic: "𝑰", charcoal: "●" } as Record<string, string>)[option.value]; const active = option.value === value; return <button key={option.value} type="button" aria-pressed={active} aria-label={option.label} title={option.label} onClick={() => onChange(option.value)} className={`relative flex min-h-9 min-w-0 items-center justify-center gap-1 rounded-[4px] px-1 text-[9px] leading-tight transition-colors active:bg-white/10 ${active ? "bg-ink-gold/18 text-ink-gold" : "bg-[#17191c] text-white/58 hover:bg-white/[0.06] hover:text-white"}`}>{glyph ? <span className="text-[11px]">{glyph}</span> : Icon ? <><Icon aria-hidden className="h-3.5 w-3.5 shrink-0" />{columnNumbers[option.value] && <span className="text-[8px] font-semibold">{columnNumbers[option.value]}</span>}</> : <span className="line-clamp-2 break-words">{option.label}</span>}</button>; })}</div></fieldset>;
}

export function NumberField({ label, value, onChange, min, max, step = 1 }: { label: string; value: number; onChange: (value: number) => void; min?: number; max?: number; step?: number }) {
  return <label className={labelClass}>{label}<input type="number" value={value} min={min} max={max} step={step} onChange={(event) => onChange(Number(event.target.value) || 0)} className={inputClass} /></label>;
}

export function RangeField({ label, value, onChange, min, max, step = 1, suffix = "" }: { label: string; value: number; onChange: (value: number) => void; min: number; max: number; step?: number; suffix?: string }) {
  return <label className={labelClass}><span className="flex items-center justify-between gap-2"><span>{label}</span><span className="shrink-0 text-white/80">{value}{suffix}</span></span><input type="range" value={value} min={min} max={max} step={step} onChange={(event) => onChange(Number(event.target.value))} className="h-8 w-full cursor-pointer accent-[#c99a4a]" /></label>;
}

export function ToggleField({ label, description, checked, onChange }: { label: string; description?: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return <label className="flex min-h-9 min-w-0 cursor-pointer items-start justify-between gap-2 rounded-md border border-white/12 bg-[#17191c] px-2.5 py-2 transition-colors hover:border-white/30 focus-within:border-ink-gold focus-within:ring-1 focus-within:ring-ink-gold"><span className="min-w-0"><span className="block text-[9px] tracking-[0.06em] text-white">{label}</span>{description && <span className="mt-0.5 block text-[8px] leading-relaxed text-white/60">{description}</span>}</span><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-[#c99a4a]" /></label>;
}

export function FieldGroup({ title, children, defaultOpen = false }: { title: string; children: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return <details open={open} onToggle={(event) => setOpen(event.currentTarget.open)} className="group min-w-0 border-t border-white/10"><summary className="flex min-h-9 cursor-pointer list-none items-center justify-between gap-2 text-[10px] font-semibold tracking-[0.04em] text-white marker:hidden transition-colors hover:text-ink-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ink-gold">{title}<ChevronDown aria-hidden className="h-3.5 w-3.5 shrink-0 text-white/55 transition-transform group-open:rotate-180" /></summary><div className="flex min-w-0 flex-col gap-2 pb-3">{children}</div></details>;
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
  return <fieldset className="min-w-0"><div className="mb-1 flex items-center justify-between gap-2"><legend className="text-[10px] tracking-[0.04em] text-white/70">{label}</legend><span className="text-[8px] text-white/50">PX</span></div><div className="grid min-w-0 grid-cols-[repeat(4,minmax(0,1fr))_36px] gap-1">{sides.map((side, index) => <label key={side} className="min-w-0 text-center"><input aria-label={`${label}: ${labels[index]}`} type="number" value={current[side]} min={-300} max={600} onChange={(event) => change(side, Number(event.target.value) || 0)} className="h-9 w-full min-w-0 rounded-md border border-white/15 bg-[#17191c] px-1 text-center text-[10px] text-white outline-none hover:border-white/30 focus-visible:border-ink-gold focus-visible:ring-1 focus-visible:ring-ink-gold" /><span className="mt-1 block truncate text-[9px] text-white/65">{labels[index]}</span></label>)}<button type="button" aria-pressed={linked} aria-label={linked ? "Rozłącz wartości" : "Połącz wartości"} title={linked ? "Rozłącz wartości" : "Połącz wartości"} onClick={() => setLinked((state) => !state)} className={`flex h-9 w-9 items-center justify-center rounded-md border transition-colors ${linked ? "border-ink-gold bg-ink-gold/15 text-ink-gold" : "border-white/15 bg-[#25282c] text-white/60 hover:border-white/30 hover:text-white"}`}>{linked ? <Link2 aria-hidden className="h-3.5 w-3.5" /> : <Unlink aria-hidden className="h-3.5 w-3.5" />}</button></div></fieldset>;
}
