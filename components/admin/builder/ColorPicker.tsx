"use client";

export default function ColorPicker({ value = "", onChange, label = "KOLOR" }: { value?: string; onChange: (value: string) => void; label?: string }) {
  const safe = /^#[0-9a-f]{6}$/i.test(value) ? value : "#c99a4a";
  return <label className="flex flex-col gap-2 text-[11px] tracking-[0.1em] text-ink-grey">{label}<span className="flex gap-2"><input aria-label={label} type="color" value={safe} onChange={(e) => onChange(e.target.value)} className="h-10 w-12 cursor-pointer border border-ink-white/20 bg-transparent p-1" /><input value={value} onChange={(e) => onChange(e.target.value)} placeholder="#C99A4A" className="min-w-0 flex-1 border border-ink-white/20 bg-transparent px-3 py-2 text-[13px] uppercase outline-none focus:border-ink-gold" /></span></label>;
}
