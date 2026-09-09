"use client";

import type { CSSProperties } from "react";
import { ArrowDown, ArrowUp, Copy, Eye, EyeOff, GripVertical, MoreHorizontal, Trash2 } from "lucide-react";
import Hero from "@/components/Hero";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import MaintenanceScreen from "@/components/MaintenanceScreen";
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
  type ColumnWidget,
  type CtaBarModuleData,
  type PortfolioModuleData,
} from "@/lib/modules";
import { safeHref, safeMapEmbedUrl } from "@/lib/safeHref";
import { parseSafeCssDeclarations } from "@/lib/moduleStyle";
import type { SiteContent } from "@/lib/content";

function moduleVisualStyle(mod: Module): CSSProperties | undefined {
  const style = mod.style;
  if (!style) return undefined;
  const box = (name: "margin" | "padding", value?: ModuleStyle["marginBox"]) => value ? {
    [`${name}Top`]: value.top,
    [`${name}Right`]: value.right,
    [`${name}Bottom`]: value.bottom,
    [`${name}Left`]: value.left,
  } : {};
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
    zIndex: style.zIndex,
    ...(style.fontSize ? { "--builder-font-size": `${style.fontSize}px` } : {}),
    ...(style.lineHeight ? { "--builder-line-height": String(style.lineHeight) } : {}),
    ...(typeof style.letterSpacing === "number" && style.letterSpacing !== 0 ? { "--builder-letter-spacing": `${style.letterSpacing}px` } : {}),
    ...(style.fontWeight ? { "--builder-font-weight": style.fontWeight } : {}),
    ...(style.fontFamily && style.fontFamily !== "inherit" ? { "--builder-font-family": style.fontFamily === "display" ? "var(--font-anton)" : "var(--font-jost)" } : {}),
    ...(style.textAlign ? { "--builder-text-align": style.textAlign } : {}),
    ...(style.textTransform ? { "--builder-text-transform": style.textTransform } : {}),
    ...(style.color ? { "--builder-text-color": style.color } : {}),
    ...box("margin", style.marginBox),
    ...box("padding", style.paddingBox),
    ...parseSafeCssDeclarations(style.customCss),
  } as CSSProperties;
}

function hasTypography(style?: ModuleStyle) {
  return Boolean(style?.fontSize || style?.lineHeight || style?.letterSpacing || style?.fontWeight || (style?.fontFamily && style.fontFamily !== "inherit") || style?.textAlign || style?.textTransform || style?.color);
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
    md: "p-4 sm:p-5 md:p-8",
    lg: "p-5 sm:p-8 md:p-12",
    xl: "p-6 sm:p-12 md:p-20",
  }[style?.padding ?? "none"];
  const margin = {
    none: "my-0",
    sm: "my-3",
    md: "my-6",
    lg: "my-8 sm:my-10",
    xl: "my-10 sm:my-16",
  }[style?.margin ?? "none"];
  const width = {
    full: "w-full",
    wide: "mx-auto w-[calc(100%_-_1rem)] max-w-[90rem] sm:w-[calc(100%_-_2rem)]",
    normal: "mx-auto w-[calc(100%_-_1rem)] max-w-[72rem] sm:w-[calc(100%_-_2rem)]",
    narrow: "mx-auto w-[calc(100%_-_1rem)] max-w-[52rem] sm:w-[calc(100%_-_2rem)]",
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
  selectedWidgetId?: string | null;
  onSelectWidget?: (moduleId: string, widgetId: string, columnIndex: number) => void;
  onDeleteWidget?: (moduleId: string, widgetId: string, columnIndex: number) => void;
  onDuplicateWidget?: (moduleId: string, widgetId: string, columnIndex: number) => void;
  onDuplicateColumn?: (moduleId: string, columnIndex: number) => void;
  onColumnsChange?: (moduleId: string, columns: ColumnWidget[][]) => void;
}

function renderModule(mod: Module, portfolioWorks: PortfolioWork[], globals?: ModuleRendererGlobals, editable = false, nested?: Pick<ModuleRendererProps, "selectedWidgetId" | "onSelectWidget" | "onDeleteWidget" | "onDuplicateWidget" | "onDuplicateColumn" | "onColumnsChange">) {
  switch (mod.type) {
    case "siteHeader": {
      const data = withDefaults("siteHeader", mod.data);
      const navLinks = data.navItems.filter((item) => item.label.trim() && safeHref(item.href, "")).map((item, index) => ({ id: item.id || `header-${index}`, label: item.label, href: safeHref(item.href, "") }));
      return <div className={editable ? "relative min-h-20" : ""}><Header navLinks={navLinks} bookLabel={data.bookLabel} bookHref={safeHref(data.bookHref)} clientAreaLabel={data.clientAreaLabel} clientAreaHref={safeHref(data.clientAreaHref)} logoUrl={data.logoUrl} logoAlt={data.logoAlt} brandName={data.brandName} preview={editable} /></div>;
    }
    case "siteFooter": {
      const data = withDefaults("siteFooter", mod.data);
      const navLinks = data.navItems.filter((item) => item.label.trim() && safeHref(item.href, "")).map((item, index) => ({ id: item.id || `footer-${index}`, label: item.label, href: safeHref(item.href, "") }));
      return <Footer navLinks={navLinks} text={data.text} logoUrl={data.logoUrl} logoAlt={data.logoAlt} brandName={data.brandName} privacyLabel={data.privacyLabel} privacyHref={safeHref(data.privacyHref)} />;
    }
    case "maintenance":
      return <MaintenanceScreen content={withDefaults("maintenance", mod.data)} theme={globals?.theme} preview={editable} />;
    case "hero": {
      const data = withDefaults("hero", mod.data);
      const instagramUrl = typeof mod.data.instagramUrl === "string" ? data.instagramUrl : globals?.instagramUrl ?? data.instagramUrl;
      const facebookUrl = typeof mod.data.facebookUrl === "string" ? data.facebookUrl : globals?.facebookUrl ?? data.facebookUrl;
      return <Hero content={{ ...data, primaryBtnHref: safeHref(data.primaryBtnHref), secondaryBtnHref: safeHref(data.secondaryBtnHref) }} socials={{ instagramUrl: safeHref(instagramUrl, ""), facebookUrl: safeHref(facebookUrl, "") }} />;
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
      return <Contact content={contact} calendar={globals?.calendar} />;
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
    case "heading": case "text": case "image": case "button": case "navigation": case "divider": case "gallery": case "columns": case "faq": case "video": case "map": case "quote": case "googleReviews": case "iconList": case "callout": case "customCode": {
      const data = { ...mod.data };
      if (mod.type === "button" || mod.type === "callout") data.href = safeHref(data.href);
      if (mod.type === "map") data.embedUrl = safeMapEmbedUrl(data.embedUrl);
      return <BuilderWidgets module={{ ...mod, data }} showEmpty={editable} editable={editable} selectedWidgetId={nested?.selectedWidgetId} onSelectWidget={(widgetId, columnIndex) => nested?.onSelectWidget?.(mod.id, widgetId, columnIndex)} onDeleteWidget={(widgetId, columnIndex) => nested?.onDeleteWidget?.(mod.id, widgetId, columnIndex)} onDuplicateWidget={(widgetId, columnIndex) => nested?.onDuplicateWidget?.(mod.id, widgetId, columnIndex)} onDuplicateColumn={(columnIndex) => nested?.onDuplicateColumn?.(mod.id, columnIndex)} onColumnsChange={(columns) => nested?.onColumnsChange?.(mod.id, columns)} portfolioWorks={portfolioWorks} calendar={globals?.calendar} />;
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
  selectedWidgetId,
  onSelectWidget,
  onDeleteWidget,
  onDuplicateWidget,
  onDuplicateColumn,
  onColumnsChange,
}: ModuleRendererProps) {
  const visible = modules.filter((m) => editable || !m.hidden);

  return (
    <>
      {visible.map((mod, i) => {
        const content = renderModule(mod, portfolioWorks, globals, editable, { selectedWidgetId, onSelectWidget, onDeleteWidget, onDuplicateWidget, onDuplicateColumn, onColumnsChange });

        const visualStyle = moduleVisualStyle(mod);
        const styleClass = `${radiusClass(mod.style?.radius)} ${moduleLayoutClasses(mod.style, editable)} ${hasTypography(mod.style) ? "builder-custom-typography" : ""} ${mod.style?.fontSize ? "builder-custom-font-size" : ""} ${mod.style?.cssClass ?? ""}`;
        const overlay = mod.style?.overlayColor && (mod.style.overlayOpacity ?? 0) > 0 ? <span aria-hidden className="pointer-events-none absolute inset-0" style={{ backgroundColor: mod.style.overlayColor, opacity: (mod.style.overlayOpacity ?? 0) / 100 }} /> : null;

        if (!editable) {
          return <div key={mod.id} id={mod.style?.anchorId} className={`relative ${mod.type === "siteHeader" || mod.style?.anchorId === "site-header" ? "overflow-visible" : "overflow-hidden"} ${styleClass}`} style={visualStyle}>{overlay}<div className="relative">{content}</div></div>;
        }

        const isSelected = selectedId === mod.id;

        return (
          <div
            key={mod.id}
            draggable={Boolean(onReorder)}
            onDragStart={(e) => {
              if (e.target !== e.currentTarget) return;
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
            {/* Compact toolbar stays out of the section until its corner button is used. */}
            <div className="group/tools pointer-events-auto absolute right-2 top-2 z-40 flex items-center shadow-xl" onClick={(event) => event.stopPropagation()}>
              <div className="hidden items-center border border-ink-white/15 bg-ink-black/95 p-1 text-ink-grey backdrop-blur group-hover/tools:flex group-focus-within/tools:flex">
                <span className="flex max-w-32 items-center gap-1.5 truncate border-r border-ink-white/10 px-2 text-[9px] text-ink-white"><GripVertical className="h-3.5 w-3.5 text-ink-gold" />{MODULE_LABELS[mod.type]}</span>
                <button type="button" title="Przesuń w górę" onClick={() => onMove?.(mod.id, "up")} disabled={i === 0} aria-label="Przesuń sekcję w górę" className="flex h-7 w-7 items-center justify-center hover:text-ink-gold disabled:opacity-25"><ArrowUp className="h-3.5 w-3.5" /></button>
                <button type="button" title="Przesuń w dół" onClick={() => onMove?.(mod.id, "down")} disabled={i === visible.length - 1} aria-label="Przesuń sekcję w dół" className="flex h-7 w-7 items-center justify-center hover:text-ink-gold disabled:opacity-25"><ArrowDown className="h-3.5 w-3.5" /></button>
                {onDuplicate && <button type="button" title="Duplikuj" onClick={() => onDuplicate(mod.id)} aria-label="Duplikuj sekcję" className="flex h-7 w-7 items-center justify-center hover:text-ink-gold"><Copy className="h-3.5 w-3.5" /></button>}
                {onToggleHidden && <button type="button" title={mod.hidden ? "Pokaż" : "Ukryj"} onClick={() => onToggleHidden(mod.id)} aria-label={mod.hidden ? "Pokaż sekcję" : "Ukryj sekcję"} className="flex h-7 w-7 items-center justify-center hover:text-ink-gold">{mod.hidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}</button>}
                {onDelete && <button type="button" title="Usuń" onClick={() => onDelete(mod.id)} aria-label="Usuń sekcję" className="flex h-7 w-7 items-center justify-center text-red-300 hover:bg-red-500/10 hover:text-red-200"><Trash2 className="h-3.5 w-3.5" /></button>}
              </div>
              <button type="button" title="Narzędzia sekcji" aria-label={`Narzędzia sekcji: ${MODULE_LABELS[mod.type]}`} className={`flex h-8 w-8 items-center justify-center border bg-ink-black/90 backdrop-blur transition-colors ${isSelected ? "border-ink-gold text-ink-gold" : "border-ink-white/20 text-ink-grey opacity-65 group-hover/mod:opacity-100"}`}><MoreHorizontal className="h-4 w-4" /></button>
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
