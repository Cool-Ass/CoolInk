"use client";

const CREATIVE_PALETTE = ["#090807", "#111111", "#24211e", "#f5f1e8", "#ffffff", "#c99a4a", "#f0bc62", "#8d5a2b", "#7f1d1d", "#dc2626", "#fb7185", "#7c3aed", "#2563eb", "#06b6d4", "#059669", "#84cc16"];

export default function ColorPicker({ value = "", onChange, label = "KOLOR", palette = true }: { value?: string; onChange: (value: string) => void; label?: string; palette?: boolean }) {
  const safe = /^#[0-9a-f]{6}$/i.test(value) ? value : "#c99a4a";
  return <div className="flex flex-col gap-2 text-[10px] tracking-[0.08em] text-ink-grey"><span>{label}</span><span className="flex gap-2"><input aria-label={`${label} — próbnik`} type="color" value={safe} onChange={(e) => onChange(e.target.value)} className="h-9 w-11 cursor-pointer border border-ink-white/20 bg-transparent p-1" /><input aria-label={`${label} — wartość`} value={value} onChange={(e) => onChange(e.target.value)} placeholder="#C99A4A, rgb() lub transparent" className="min-w-0 flex-1 border border-ink-white/20 bg-[#17191c] px-2.5 py-2 text-[12px] uppercase outline-none focus:border-ink-gold" /></span>{palette && <span className="grid grid-cols-8 gap-1" aria-label="Dodatkowa paleta kolorów">{CREATIVE_PALETTE.map((color) => <button key={color} type="button" title={color} aria-label={`Ustaw kolor ${color}`} onClick={() => onChange(color)} className={`aspect-square min-h-5 border ${value.toLowerCase() === color ? "border-white ring-1 ring-ink-gold" : "border-white/15"}`} style={{ backgroundColor: color }} />)}</span>}</div>;
}
