"use client";

export type ResponsiveValue = { desktop: number; tablet: number; mobile: number };

export default function ResponsiveControls({ label, value, min = 1, max = 6, onChange }: { label: string; value: ResponsiveValue; min?: number; max?: number; onChange: (value: ResponsiveValue) => void }) {
  const update = (key: keyof ResponsiveValue, next: number) => onChange({ ...value, [key]: next });
  return <fieldset className="flex flex-col gap-2"><legend className="text-[11px] tracking-[0.1em] text-ink-grey">{label}</legend><div className="grid grid-cols-3 gap-2">{(["desktop", "tablet", "mobile"] as const).map((key) => <label key={key} className="flex flex-col gap-1 text-[10px] uppercase text-ink-grey">{key}<input type="number" min={min} max={max} value={value[key]} onChange={(event) => update(key, Math.max(min, Math.min(max, Number(event.target.value) || min)))} className="w-full border border-ink-white/20 bg-transparent px-2 py-2 text-sm text-ink-white outline-none focus:border-ink-gold" /></label>)}</div></fieldset>;
}
