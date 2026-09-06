"use client";

import { useState } from "react";
import {
  AlignLeft,
  BetweenHorizontalStart,
  CalendarDays,
  Columns3,
  GalleryHorizontal,
  Heading,
  Image as ImageIcon,
  Images,
  LayoutTemplate,
  Link2,
  ListChecks,
  MapPinned,
  Megaphone,
  Minus,
  PanelTop,
  PlaySquare,
  Quote,
  Rows3,
  Search,
  Sparkles,
  SquareCode,
  StretchHorizontal,
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

const ICONS: Record<ModuleType, LucideIcon> = {
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
  divider: Minus,
  gallery: GalleryHorizontal,
  columns: Columns3,
  faq: Rows3,
  video: PlaySquare,
  map: MapPinned,
  quote: Quote,
  iconList: ListChecks,
  callout: Megaphone,
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
  const normalizedQuery = query.trim().toLocaleLowerCase("pl-PL");

  const matches = (type: ModuleType) =>
    !normalizedQuery ||
    `${MODULE_LABELS[type]} ${MODULE_DESCRIPTIONS[type]}`
      .toLocaleLowerCase("pl-PL")
      .includes(normalizedQuery);

  return (
    <div className="flex min-h-full flex-col bg-[#1d1f22]">
      <div className="border-b border-white/10 px-4 py-4 text-center">
        <p className="text-[13px] font-semibold text-white">Elementy</p>
        <p className="mt-1 text-[10px] leading-relaxed text-white/45">
          Przeciągnij widget na stronę lub kliknij, aby dodać go {insertAfterSelection ? "pod zaznaczeniem" : "na końcu"}.
        </p>
      </div>

      <div className="p-3">
        <label className="flex h-9 items-center gap-2 border border-white/15 bg-[#17191c] px-3 text-white/55 focus-within:border-ink-gold">
          <Search className="h-3.5 w-3.5 shrink-0" />
          <span className="sr-only">Szukaj widgetu</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Wyszukaj widget…"
            className="min-w-0 flex-1 bg-transparent text-[12px] text-white outline-none placeholder:italic placeholder:text-white/35"
          />
        </label>
      </div>

      <div className="space-y-5 px-3 pb-5">
        {(["widgets", "templates"] as const).map((category) => {
          const types = MODULE_TYPE_ORDER.filter(
            (type) => MODULE_CATEGORIES[type] === category && matches(type),
          );
          if (!types.length) return null;
          return (
            <section key={category}>
              <p className="mb-2 px-1 text-[9px] font-semibold tracking-[0.16em] text-ink-gold/90">
                {category === "widgets" ? "WIDGETY" : "GOTOWE SEKCJE"}
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {types.map((type) => {
                  const Icon = ICONS[type];
                  return (
                    <button
                      key={type}
                      type="button"
                      draggable
                      title={`${MODULE_LABELS[type]} — ${MODULE_DESCRIPTIONS[type]}`}
                      onDragStart={(event) => {
                        event.dataTransfer.setData(PALETTE_WIDGET_MIME, type);
                        event.dataTransfer.effectAllowed = "copy";
                      }}
                      onClick={() => onAdd(type)}
                      className="group flex min-h-20 cursor-grab flex-col items-center justify-center gap-2 border border-white/15 bg-[#202226] px-2 py-3 text-center text-white/75 transition hover:border-ink-gold hover:bg-ink-gold/5 hover:text-white active:cursor-grabbing"
                    >
                      <Icon className="h-5 w-5 stroke-[1.45] text-white/65 transition group-hover:text-ink-gold" />
                      <span className="text-[10px] leading-tight">{MODULE_LABELS[type]}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
        {!MODULE_TYPE_ORDER.some(matches) && (
          <p className="border border-dashed border-white/15 p-4 text-center text-[11px] text-white/45">
            Nie znaleziono takiego widgetu.
          </p>
        )}
      </div>
    </div>
  );
}
