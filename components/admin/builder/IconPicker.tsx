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
  return <div className="flex flex-col gap-2"><span className="text-[11px] tracking-[0.1em] text-ink-grey">{label}</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Szukaj ikony…" className="border border-ink-white/20 bg-transparent px-3 py-2 text-[13px] outline-none focus:border-ink-gold" /><div className="grid max-h-48 grid-cols-6 gap-2 overflow-y-auto rounded border border-ink-white/10 p-2">{icons.map(([name, Icon]) => <button key={name} type="button" title={name} aria-label={`Wybierz ikonę ${name}`} onClick={() => onChange(selected === name ? "" : name)} className={`flex aspect-square items-center justify-center border transition-all hover:-translate-y-0.5 hover:border-ink-gold hover:text-ink-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-ink-gold ${selected === name ? "border-ink-gold bg-ink-gold/10 text-ink-gold" : "border-ink-white/15 text-ink-grey"}`}><Icon className="h-4 w-4" /></button>)}</div><button type="button" onClick={() => onChange("")} className="self-start text-[11px] text-ink-grey hover:text-ink-white">Wyczyść ikonę</button></div>;
}
