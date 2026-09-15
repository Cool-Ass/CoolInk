"use client";

import {
  Accessibility, Activity, AlarmClock, Aperture, ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Award, BadgeCheck, Bell,
  Bookmark, Box, Calendar, Camera, Check, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Circle, Clock3, Cloud,
  Code2, Compass, Crown, Diamond, Download, Eye, Flame, Flower2, Gift, Globe2, Hammer, Heart, ImageIcon, Info,
  Instagram, Layers3, Lightbulb, Link2, Lock, Mail, MapPin, Menu, MessageCircle, Minus, Moon, Move, Music2, Palette,
  Phone, Play, Plus, Quote, Rocket, Scissors, Search, Send, ShieldCheck, ShoppingBag, Sparkles, Star, Sun, Target,
  ThumbsUp, Ticket, Timer, Trophy, Upload, User, Users, WandSparkles, Zap, type LucideIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { ICON_NAMES } from "@/lib/icons";

const ICONS: Record<string, LucideIcon> = {
  accessibility: Accessibility, activity: Activity, alarmClock: AlarmClock, aperture: Aperture, arrowDown: ArrowDown,
  arrowLeft: ArrowLeft, arrowRight: ArrowRight, arrowUp: ArrowUp, award: Award, badgeCheck: BadgeCheck, bell: Bell,
  bookmark: Bookmark, box: Box, calendar: Calendar, camera: Camera, check: Check, chevronDown: ChevronDown,
  chevronLeft: ChevronLeft, chevronRight: ChevronRight, chevronUp: ChevronUp, circle: Circle, clock: Clock3,
  cloud: Cloud, code: Code2, compass: Compass, crown: Crown, diamond: Diamond, download: Download, eye: Eye,
  flame: Flame, flower: Flower2, gift: Gift, globe: Globe2, hammer: Hammer, heart: Heart, image: ImageIcon, info: Info,
  instagram: Instagram, layers: Layers3, lightbulb: Lightbulb, link: Link2, lock: Lock, mail: Mail, mapPin: MapPin,
  menu: Menu, messageCircle: MessageCircle, minus: Minus, moon: Moon, move: Move, music: Music2, palette: Palette,
  phone: Phone, play: Play, plus: Plus, quote: Quote, rocket: Rocket, scissors: Scissors, search: Search, send: Send,
  shieldCheck: ShieldCheck, shoppingBag: ShoppingBag, sparkles: Sparkles, star: Star, sun: Sun, target: Target,
  thumbsUp: ThumbsUp, ticket: Ticket, timer: Timer, trophy: Trophy, upload: Upload, user: User, users: Users,
  wand: WandSparkles, zap: Zap,
};

function canonicalIconName(name?: string) {
  return name ? `${name.charAt(0).toLowerCase()}${name.slice(1)}` : "";
}

export function IconPreview({ name, className = "h-4 w-4" }: { name?: string; className?: string }) {
  const Icon = ICONS[canonicalIconName(name)];
  return Icon ? <Icon aria-hidden className={className} /> : null;
}

export default function IconPicker({ value, onChange, label = "IKONA" }: { value?: string; onChange: (value: string) => void; label?: string }) {
  const [query, setQuery] = useState("");
  const selected = canonicalIconName(value);
  const icons = useMemo(() => ICON_NAMES.map((name) => [name, ICONS[name]] as const).filter(([name]) => name.toLowerCase().includes(query.trim().toLowerCase())), [query]);
  return <div className="flex min-w-0 flex-col gap-2"><label className="flex min-w-0 flex-col gap-1.5 text-[11px] tracking-[0.1em] text-white/65">{label}<input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Szukaj ikony…" className="h-11 w-full min-w-0 border border-white/20 bg-[#17191c] px-3 text-[13px] normal-case tracking-normal text-white outline-none hover:border-white/35 focus-visible:border-ink-gold focus-visible:ring-1 focus-visible:ring-ink-gold" /></label><div role="group" aria-label={`Lista ikon: ${label}`} className="grid max-h-56 min-w-0 grid-cols-5 gap-1.5 overflow-y-auto overscroll-contain border border-white/10 p-2 [scrollbar-gutter:stable]">{icons.map(([name, Icon]) => { const active = selected === name; return <button key={name} type="button" title={name} aria-label={`Wybierz ikonę ${name}`} aria-pressed={active} onClick={() => onChange(active ? "" : name)} className={`flex aspect-square min-h-11 min-w-0 items-center justify-center border transition-colors active:bg-white/10 ${active ? "border-ink-gold bg-ink-gold/15 text-ink-gold" : "border-white/15 text-white/60 hover:border-ink-gold hover:text-ink-gold"}`}><Icon aria-hidden className="h-4 w-4" /></button>; })}</div>{icons.length === 0 && <p role="status" className="text-[11px] text-white/55">Brak pasujących ikon.</p>}<button type="button" disabled={!selected} onClick={() => onChange("")} className="min-h-11 self-start border border-white/15 px-3 text-[11px] text-white/60 hover:border-white/35 hover:text-white disabled:opacity-40">Wyczyść ikonę</button></div>;
}
