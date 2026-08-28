"use client";

import { Check, ChevronRight, Circle, Heart, Instagram, MapPin, Menu, MessageCircle, Phone, Play, Sparkles, Star, type LucideIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { ICON_NAMES } from "@/lib/icons";

const ICONS: Record<string, LucideIcon> = { check: Check, chevronRight: ChevronRight, circle: Circle, heart: Heart, instagram: Instagram, mapPin: MapPin, menu: Menu, messageCircle: MessageCircle, phone: Phone, play: Play, sparkles: Sparkles, star: Star };

export function IconPreview({ name, className = "h-4 w-4" }: { name?: string; className?: string }) {
  const Icon = name ? ICONS[name] : undefined;
  return Icon ? <Icon aria-hidden className={className} /> : null;
}

export default function IconPicker({ value, onChange, label = "IKONA" }: { value?: string; onChange: (value: string) => void; label?: string }) {
  const [query, setQuery] = useState("");
  const icons = useMemo(() => ICON_NAMES.map((name) => [name, ICONS[name]] as const).filter(([name]) => name.toLowerCase().includes(query.trim().toLowerCase())), [query]);
  return <div className="flex flex-col gap-2"><span className="text-[11px] tracking-[0.1em] text-ink-grey">{label}</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Szukaj ikony…" className="border border-ink-white/20 bg-transparent px-3 py-2 text-[13px] outline-none focus:border-ink-gold" /><div className="grid grid-cols-6 gap-2 rounded border border-ink-white/10 p-2">{icons.map(([name, Icon]) => <button key={name} type="button" title={name} aria-label={`Wybierz ikonę ${name}`} onClick={() => onChange(value === name ? "" : name)} className={`flex aspect-square items-center justify-center border transition-all hover:-translate-y-0.5 hover:border-ink-gold hover:text-ink-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-ink-gold ${value === name ? "border-ink-gold bg-ink-gold/10 text-ink-gold" : "border-ink-white/15 text-ink-grey"}`}><Icon className="h-4 w-4" /></button>)}</div><button type="button" onClick={() => onChange("")} className="self-start text-[11px] text-ink-grey hover:text-ink-white">Wyczyść ikonę</button></div>;
}
