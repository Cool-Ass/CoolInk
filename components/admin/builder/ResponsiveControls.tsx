"use client";

export type ResponsiveValue = { desktop: number; tablet: number; mobile: number };

export default function ResponsiveControls({ label, value, min = 1, max = 6, onChange }: { label: string; value: ResponsiveValue; min?: number; max?: number; onChange: (value: ResponsiveValue) => void }) {
  const update = (key: keyof ResponsiveValue, next: number) => onChange({ ...value, [key]: next });
  return <fieldset className="flex min-w-0 flex-col gap-2"><legend className="text-[11px] tracking-[0.1em] text-white/65">{label}</legend><div className="grid min-w-0 grid-cols-3 gap-1.5">{(["desktop", "tablet", "mobile"] as const).map((key) => <label key={key} className="flex min-w-0 flex-col gap-1 text-[9px] uppercase text-white/60">{key === "desktop" ? "Komputer" : key === "tablet" ? "Tablet" : "Telefon"}<input type="number" min={min} max={max} value={value[key]} onChange={(event) => update(key, Math.max(min, Math.min(max, Number(event.target.value) || min)))} className="h-11 w-full min-w-0 border border-white/20 bg-[#17191c] px-1.5 text-sm text-white outline-none hover:border-white/35 focus-visible:border-ink-gold focus-visible:ring-1 focus-visible:ring-ink-gold" /></label>)}</div></fieldset>;
}
