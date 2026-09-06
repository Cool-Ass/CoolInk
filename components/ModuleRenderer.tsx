"use client";

import type { CSSProperties } from "react";
import Hero from "@/components/Hero";
import About from "@/components/About";
import StatsBar from "@/components/StatsBar";
import CTABar from "@/components/CTABar";
import Portfolio from "@/components/Portfolio";
import type { PortfolioWork } from "@/lib/portfolio";
import type { PublicCalendarData } from "@/lib/publicCalendar";
import Studio from "@/components/Studio";
import Contact from "@/components/Contact";
import BookingSection from "@/components/BookingSection";
import TextSection from "@/components/modules/TextSection";
import ImageText from "@/components/modules/ImageText";
import Spacer from "@/components/modules/Spacer";
import BuilderWidgets from "@/components/modules/BuilderWidgets";
import {
  MODULE_LABELS,
  withDefaults,
  type Module,
  type ModuleStyle,
  type CtaBarModuleData,
  type PortfolioModuleData,
} from "@/lib/modules";
import { safeHref, safeMapEmbedUrl } from "@/lib/safeHref";
import { parseSafeCssDeclarations } from "@/lib/moduleStyle";
import type { SiteContent } from "@/lib/content";

function moduleVisualStyle(mod: Module): CSSProperties | undefined {
  const style = mod.style;
  if (!style) return undefined;
  return {
    backgroundColor: style.backgroundColor || undefined,
    backgroundImage: style.backgroundImage ? `url(${JSON.stringify(style.backgroundImage)})` : undefined,
    backgroundSize: style.backgroundSize || "cover",
    backgroundPosition: "center",
    borderColor: style.borderColor || undefined,
    borderWidth: style.borderWidth ? `${Math.min(12, Math.max(0, style.borderWidth))}px` : undefined,
    borderStyle: style.borderWidth ? "solid" : undefined,
    minHeight: style.minHeight ? `${Math.min(1600, Math.max(0, style.minHeight))}px` : undefined,
    opacity: typeof style.opacity === "number" ? Math.min(1, Math.max(0.1, style.opacity / 100)) : undefined,
    ...parseSafeCssDeclarations(style.customCss),
  };
}

function radiusClass(radius?: ModuleStyle["radius"]) {
  return radius === "lg" ? "rounded-2xl" : radius === "md" ? "rounded-xl" : radius === "sm" ? "rounded-md" : "";
}

export interface ModuleRendererGlobals {
  instagramUrl?: string;
  facebookUrl?: string;
  contact?: { address: string; phone: string; email: string; hours: string };
  calendar?: PublicCalendarData;
  theme?: SiteContent["theme"];
}

function moduleLayoutClasses(style?: ModuleStyle, editable = false) {
  const padding = {
    none: "p-0",
    sm: "p-3 md:p-5",
    md: "p-5 md:p-8",
    lg: "p-8 md:p-12",
    xl: "p-12 md:p-20",
  }[style?.padding ?? "none"];
  const margin = {
    none: "my-0",
    sm: "my-3",
    md: "my-6",
    lg: "my-10",
    xl: "my-16",
  }[style?.margin ?? "none"];
  const width = {
    full: "w-full",
    wide: "mx-auto w-[calc(100%_-_2rem)] max-w-[90rem]",
    normal: "mx-auto w-[calc(100%_-_2rem)] max-w-[72rem]",
    narrow: "mx-auto w-[calc(100%_-_2rem)] max-w-[52rem]",
  }[style?.contentWidth ?? "full"];
  const surface = {
    plain: "",
    card: "border border-ink-white/10 bg-ink-charcoal/70",
    outline: "border border-ink-gold/45 bg-transparent",
    glass: "border border-ink-white/15 bg-ink-black/55 backdrop-blur-xl",
  }[style?.surface ?? "plain"];
  const shadow = {
    none: "",
    sm: "shadow-md shadow-black/25",
    md: "shadow-xl shadow-black/35",
    lg: "shadow-2xl shadow-black/50",
  }[style?.shadow ?? "none"];
  const responsive = editable
    ? ""
    : `${style?.hiddenOn?.mobile ? "max-sm:hidden" : ""} ${style?.hiddenOn?.tablet ? "sm:max-lg:hidden" : ""} ${style?.hiddenOn?.desktop ? "lg:hidden" : ""}`;
  return `${padding} ${margin} ${width} ${surface} ${shadow} ${responsive}`;
}

export interface ModuleRendererProps {
  modules: Module[];
  portfolioWorks?: PortfolioWork[];
  globals?: ModuleRendererGlobals;
  /** Enables click-to-select + hover controls for the page builder. Off (plain render) on the public site. */
  editable?: boolean;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  onMove?: (id: string, direction: "up" | "down") => void;
  onDuplicate?: (id: string) => void;
  onDelete?: (id: string) => void;
  onToggleHidden?: (id: string) => void;
  onReorder?: (fromId: string, toId: string) => void;
}

function renderModule(mod: Module, portfolioWorks: PortfolioWork[], globals?: ModuleRendererGlobals, editable = false) {
  switch (mod.type) {
    case "hero": {
      const data = withDefaults("hero", mod.data);
      return <Hero content={{ ...data, primaryBtnHref: safeHref(data.primaryBtnHref), secondaryBtnHref: safeHref(data.secondaryBtnHref) }} socials={globals as { instagramUrl: string; facebookUrl: string }} />;
    }
    case "about":
      return <About content={withDefaults("about", mod.data)} />;
    case "stats":
      return <StatsBar content={withDefaults("stats", mod.data)} />;
    case "ctaBar": {
      const data = withDefaults("ctaBar", mod.data) as CtaBarModuleData;
      return (
        <div className="bg-ink-black py-6 md:py-8">
          <CTABar
            titleLines={[data.title1, data.title2]}
            message={data.message}
            buttonLabel={data.buttonLabel}
            href={safeHref(data.href)}
          />
        </div>
      );
    }
    case "portfolio": {
      const data = withDefaults("portfolio", mod.data) as PortfolioModuleData;
      const works =
        data.selectionMode === "selected"
          ? portfolioWorks.filter((w) => data.selectedIds?.includes(w.id))
          : portfolioWorks;
      return <Portfolio content={{ ...data, primaryBtnHref: safeHref(data.primaryBtnHref), secondaryBtnHref: safeHref(data.secondaryBtnHref) }} works={works} />;
    }
    case "studio": {
      const data = withDefaults("studio", mod.data);
      return <Studio content={{ ...data, primaryBtnHref: safeHref(data.primaryBtnHref), secondaryBtnHref: safeHref(data.secondaryBtnHref), ctaButtonHref: safeHref(data.ctaButtonHref) }} />;
    }
    case "contact": {
      const data = withDefaults("contact", mod.data);
      const contact = data.contactSource === "global" ? { ...data, ...(globals?.contact ?? {}) } : data;
      return <Contact content={contact} />;
    }
    case "booking":
      return <BookingSection content={withDefaults("booking", mod.data)} calendar={globals?.calendar} />;
    case "textSection":
      return <TextSection data={withDefaults("textSection", mod.data)} />;
    case "imageText": {
      const data = withDefaults("imageText", mod.data);
      return <ImageText data={{ ...data, buttonUrl: safeHref(data.buttonUrl, "") }} />;
    }
    case "spacer":
      return <Spacer data={withDefaults("spacer", mod.data)} />;
    case "heading": case "text": case "image": case "button": case "divider": case "gallery": case "columns": case "faq": case "video": case "map": case "quote": case "iconList": case "callout": case "customCode": {
      const data = { ...mod.data };
      if (mod.type === "button" || mod.type === "callout") data.href = safeHref(data.href);
      if (mod.type === "map") data.embedUrl = safeMapEmbedUrl(data.embedUrl);
      return <BuilderWidgets module={{ ...mod, data }} showEmpty={editable} />;
    }
    default:
      return null;
  }
}

export default function ModuleRenderer({
  modules,
  portfolioWorks = [],
  globals,
  editable = false,
  selectedId,
  onSelect,
  onMove,
  onDuplicate,
  onDelete,
  onToggleHidden,
  onReorder,
}: ModuleRendererProps) {
  const visible = modules.filter((m) => editable || !m.hidden);

  return (
    <>
      {visible.map((mod, i) => {
        const content = renderModule(mod, portfolioWorks, globals, editable);

        const visualStyle = moduleVisualStyle(mod);
        const styleClass = `${radiusClass(mod.style?.radius)} ${moduleLayoutClasses(mod.style, editable)} ${mod.style?.cssClass ?? ""}`;
        const overlay = mod.style?.overlayColor && (mod.style.overlayOpacity ?? 0) > 0 ? <span aria-hidden className="pointer-events-none absolute inset-0" style={{ backgroundColor: mod.style.overlayColor, opacity: (mod.style.overlayOpacity ?? 0) / 100 }} /> : null;

        if (!editable) {
          return <div key={mod.id} id={mod.style?.anchorId} className={`relative overflow-hidden ${styleClass}`} style={visualStyle}>{overlay}<div className="relative">{content}</div></div>;
        }

        const isSelected = selectedId === mod.id;

        return (
          <div
            key={mod.id}
            draggable={Boolean(onReorder)}
            onDragStart={(e) => {
              e.dataTransfer.setData("text/module-id", mod.id);
              e.dataTransfer.effectAllowed = "move";
            }}
            onDragOver={(e) => {
              if (onReorder) e.preventDefault();
            }}
            onDrop={(e) => {
              e.preventDefault();
              const fromId = e.dataTransfer.getData("text/module-id");
              if (fromId && fromId !== mod.id) onReorder?.(fromId, mod.id);
            }}
            onClick={(e) => {
              e.stopPropagation();
              onSelect?.(mod.id);
            }}
            id={mod.style?.anchorId}
            style={visualStyle}
            className={`group/mod relative cursor-pointer overflow-hidden outline outline-2 outline-offset-[-2px] transition-all ${styleClass} ${
              isSelected
                ? "outline-ink-gold"
                : "outline-transparent hover:outline-ink-gold/40"
            } ${mod.hidden ? "opacity-40" : ""}`}
          >
            {/* Floating module toolbar */}
            <div
              className={`pointer-events-none absolute left-0 right-0 top-0 z-40 flex items-center justify-between gap-2 bg-ink-black/90 px-3 py-2 text-[11px] tracking-[0.06em] text-ink-white opacity-0 backdrop-blur-sm transition-opacity ${
                isSelected ? "opacity-100" : "group-hover/mod:opacity-100"
              }`}
            >
              <span className="pointer-events-none flex items-center gap-2 truncate">
                <span aria-hidden className="cursor-grab text-ink-gold">⠿</span>
                <span>{MODULE_LABELS[mod.type]}</span>
                <span className="hidden text-[10px] normal-case tracking-normal text-ink-grey sm:inline">Przeciągnij, aby zmienić kolejność</span>
                {mod.hidden && <span className="text-ink-grey">(ukryty)</span>}
              </span>
              <span className="pointer-events-auto flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  title="Przesuń w górę"
                  onClick={(e) => { e.stopPropagation(); onMove?.(mod.id, "up"); }}
                  disabled={i === 0}
                  aria-label="Przesuń sekcję w górę"
                  className="px-1 transition-colors hover:text-ink-gold disabled:opacity-30"
                >
                  ↑
                </button>
                <button
                  type="button"
                  title="Przesuń w dół"
                  onClick={(e) => { e.stopPropagation(); onMove?.(mod.id, "down"); }}
                  disabled={i === visible.length - 1}
                  aria-label="Przesuń sekcję w dół"
                  className="px-1 transition-colors hover:text-ink-gold disabled:opacity-30"
                >
                  ↓
                </button>
                <button
                  type="button"
                  title="Duplikuj"
                  onClick={(e) => { e.stopPropagation(); onDuplicate?.(mod.id); }}
                  className="border border-ink-white/20 px-2 py-1 transition-colors hover:border-ink-gold hover:text-ink-gold"
                >
                  Duplikuj
                </button>
                <button
                  type="button"
                  title={mod.hidden ? "Pokaż" : "Ukryj"}
                  onClick={(e) => { e.stopPropagation(); onToggleHidden?.(mod.id); }}
                  className="border border-ink-white/20 px-2 py-1 transition-colors hover:border-ink-gold hover:text-ink-gold"
                >
                  {mod.hidden ? "Pokaż" : "Ukryj"}
                </button>
                <button
                  type="button"
                  title="Usuń"
                  onClick={(e) => { e.stopPropagation(); onDelete?.(mod.id); }}
                  className="px-1 text-red-400/80 transition-colors hover:text-red-400"
                >
                  Usuń
                </button>
              </span>
            </div>

            {/* FAQ is deliberately interactive in the builder preview, so its
                accessibility buttons remain usable while the whole module is selected. */}
            {overlay}<div className={`relative ${editable && mod.type !== "faq" ? "pointer-events-none" : ""}`}>{content}</div>
          </div>
        );
      })}

      {editable && visible.length === 0 && (
        <div className="flex h-[50vh] flex-col items-center justify-center gap-2 border border-dashed border-ink-gold/40 px-6 text-center text-[14px] text-ink-grey">
          <p className="text-ink-white">Zacznij budować tę stronę</p>
          <p>Wybierz po prawej pierwszą sekcję, np. Hero, Tekst albo Obraz + tekst.</p>
        </div>
      )}
    </>
  );
}
