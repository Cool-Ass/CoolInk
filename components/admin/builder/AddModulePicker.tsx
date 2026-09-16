"use client";

import { useEffect, useState } from "react";
import {
  AlignLeft,
  BetweenHorizontalStart,
  CalendarDays,
  Columns3,
  GalleryHorizontal,
  Grid3X3,
  Heading,
  Image as ImageIcon,
  Images,
  LayoutTemplate,
  Link2,
  ListChecks,
  MapPinned,
  Menu,
  Megaphone,
  Minus,
  PanelTop,
  PanelBottom,
  Construction,
  PlaySquare,
  Quote,
  Rows3,
  Search,
  SplitSquareHorizontal,
  Sparkles,
  Star,
  SquareCode,
  StretchHorizontal,
  Timer,
  LogIn,
  UserPlus,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { PALETTE_WIDGET_MIME } from "@/lib/builderDnd";
import {
  MODULE_TYPE_ORDER,
  MODULE_LABELS,
  MODULE_DESCRIPTIONS,
  MODULE_CATEGORIES,
  type ModuleType,
} from "@/lib/modules";

const FAVORITES_KEY = "coolink-builder-widget-favorites-v1";

const ICONS: Record<ModuleType, LucideIcon> = {
  siteHeader: PanelTop,
  siteFooter: PanelBottom,
  maintenance: Construction,
  hero: PanelTop,
  about: UserRound,
  stats: Sparkles,
  ctaBar: Megaphone,
  portfolio: Images,
  studio: LayoutTemplate,
  contact: CalendarDays,
  booking: CalendarDays,
  textSection: AlignLeft,
  imageText: BetweenHorizontalStart,
  spacer: StretchHorizontal,
  heading: Heading,
  text: AlignLeft,
  image: ImageIcon,
  button: Link2,
  navigation: Menu,
  divider: Minus,
  gallery: GalleryHorizontal,
  columns: Columns3,
  innerSection: Rows3,
  faq: Rows3,
  video: PlaySquare,
  map: MapPinned,
  quote: Quote,
  googleReviews: Star,
  iconList: ListChecks,
  callout: Megaphone,
  beforeAfter: SplitSquareHorizontal,
  countdown: Timer,
  clientAuthForm: UserPlus,
  adminLoginForm: LogIn,
  customCode: SquareCode,
};

export default function AddModulePicker({
  onAdd,
  insertAfterSelection,
}: {
  onAdd: (type: ModuleType) => void;
  insertAfterSelection?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"all" | "favorites">("all");
  const [favorites, setFavorites] = useState<ModuleType[]>([]);
  const normalizedQuery = query.trim().toLocaleLowerCase("pl-PL");

  useEffect(() => {
    let cancelled = false;
    try {
      const stored = JSON.parse(window.localStorage.getItem(FAVORITES_KEY) ?? "[]");
      if (Array.isArray(stored)) queueMicrotask(() => { if (!cancelled) setFavorites(stored.filter((type): type is ModuleType => MODULE_TYPE_ORDER.includes(type))); });
    } catch { /* optional builder preference */ }
    return () => { cancelled = true; };
  }, []);

  function toggleFavorite(type: ModuleType) {
    setFavorites((current) => {
      const next = current.includes(type) ? current.filter((item) => item !== type) : [...current, type];
      try { window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(next)); } catch { /* optional builder preference */ }
      return next;
    });
  }

  const matches = (type: ModuleType) =>
    !normalizedQuery ||
    `${MODULE_LABELS[type]} ${MODULE_DESCRIPTIONS[type]}`
      .toLocaleLowerCase("pl-PL")
      .includes(normalizedQuery);
  const visibleTypes = MODULE_TYPE_ORDER.filter((type) => !["siteHeader", "siteFooter", "maintenance"].includes(type) && matches(type) && (view === "all" || favorites.includes(type)));

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-[#1d1f22]">
      <div className="shrink-0 border-b border-white/10 px-3 py-2.5 text-center">
        <p className="text-[11px] font-semibold text-white">Elementy</p>
        <p className="mt-0.5 text-[9px] leading-relaxed text-white/60">
          Przeciągnij widget na stronę lub kliknij, aby dodać go {insertAfterSelection ? "pod zaznaczeniem" : "na końcu"}.
        </p>
      </div>

      <div className="shrink-0 p-2.5">
        <label className="flex min-h-9 min-w-0 items-center gap-2 rounded-md border border-white/15 bg-[#17191c] px-2.5 text-white/60 transition-colors hover:border-white/30 focus-within:border-ink-gold focus-within:ring-1 focus-within:ring-ink-gold">
          <Search className="h-3.5 w-3.5 shrink-0" />
          <span className="sr-only">Szukaj widgetu</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Wyszukaj widget…"
            className="min-w-0 flex-1 bg-transparent text-[11px] text-white outline-none placeholder:italic placeholder:text-white/50"
          />
        </label>
        <div role="group" aria-label="Filtr elementów" className="mt-1.5 grid grid-cols-2 gap-px rounded-md border border-white/10 bg-white/10 p-px">
          <button type="button" aria-pressed={view === "all"} onClick={() => setView("all")} className={`flex min-h-8 items-center justify-center gap-1 rounded-[4px] px-2 text-[8px] tracking-[0.08em] transition-colors ${view === "all" ? "bg-white/10 text-white" : "bg-[#17191c] text-white/55 hover:bg-white/5 hover:text-white"}`}><Grid3X3 aria-hidden className="h-3 w-3" />WSZYSTKIE</button>
          <button type="button" aria-pressed={view === "favorites"} onClick={() => setView("favorites")} className={`flex min-h-8 items-center justify-center gap-1 rounded-[4px] px-2 text-[8px] tracking-[0.08em] transition-colors ${view === "favorites" ? "bg-ink-gold/15 text-ink-gold" : "bg-[#17191c] text-white/55 hover:bg-white/5 hover:text-white"}`}><Star aria-hidden className="h-3 w-3" />ULUBIONE {favorites.length ? `(${favorites.length})` : ""}</button>
        </div>
      </div>

      <div data-lenis-prevent className="min-h-0 min-w-0 flex-1 space-y-3 overflow-y-auto overflow-x-hidden overscroll-contain px-2.5 pb-3 [scrollbar-gutter:stable]">
        {(["widgets", "templates"] as const).map((category) => {
          const types = visibleTypes.filter((type) => MODULE_CATEGORIES[type] === category);
          if (!types.length) return null;
          return (
            <section key={category}>
              <p className="mb-1.5 px-1 text-[8px] font-semibold tracking-[0.14em] text-ink-gold/90">
                {category === "widgets" ? "WIDGETY" : "GOTOWE SEKCJE"}
              </p>
              <div className="grid min-w-0 grid-cols-3 gap-1">
                {types.map((type) => {
                  const Icon = ICONS[type];
                  const favorite = favorites.includes(type);
                  return (
                    <div
                      key={type}
                      draggable
                      title={`${MODULE_LABELS[type]} — ${MODULE_DESCRIPTIONS[type]}`}
                      onDragStart={(event) => {
                        event.dataTransfer.setData(PALETTE_WIDGET_MIME, type);
                        event.dataTransfer.effectAllowed = "copy";
                      }}
                      className="group relative min-h-16 min-w-0 cursor-grab rounded-md border border-white/12 bg-[#202226] text-center text-white/75 transition-colors hover:border-ink-gold/70 hover:bg-ink-gold/10 hover:text-white active:cursor-grabbing active:bg-ink-gold/15"
                    >
                      <button type="button" onClick={() => onAdd(type)} className="flex min-h-16 w-full min-w-0 flex-col items-center justify-center gap-1 px-1.5 py-1.5 text-center"><Icon aria-hidden className="h-4 w-4 stroke-[1.45] text-white/65 transition group-hover:text-ink-gold" /><span className="line-clamp-2 max-w-[78%] break-words text-[9px] leading-tight">{MODULE_LABELS[type]}</span></button>
                      <button type="button" aria-pressed={favorite} aria-label={favorite ? `Usuń ${MODULE_LABELS[type]} z ulubionych` : `Dodaj ${MODULE_LABELS[type]} do ulubionych`} title={favorite ? "Usuń z ulubionych" : "Dodaj do ulubionych"} onClick={() => toggleFavorite(type)} className={`absolute right-0 top-0 z-10 flex h-8 w-8 items-center justify-center rounded-tr-md transition-colors ${favorite ? "text-ink-gold" : "text-white/25 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 hover:text-white"}`}><Star aria-hidden className={`h-3 w-3 ${favorite ? "fill-current" : ""}`} /></button>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
        {!visibleTypes.length && (
          <p role="status" className="border border-dashed border-white/20 p-4 text-center text-[11px] text-white/65">
            {view === "favorites" && !favorites.length ? "Oznacz gwiazdką najczęściej używane elementy, aby mieć je zawsze pod ręką." : "Nie znaleziono takiego widgetu."}
          </p>
        )}
      </div>
    </div>
  );
}
