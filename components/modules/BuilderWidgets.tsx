"use client";

import Image from "next/image";
import { useId, useRef, useState, type CSSProperties, type DragEvent } from "react";
import { Copy, Menu, X } from "lucide-react";
import { IconPreview } from "@/components/admin/builder/IconPicker";
import { defaultModuleData, isColumnWidgetType, MODULE_LABELS, withDefaults, type ColumnWidget, type Module, type ModuleStyle } from "@/lib/modules";
import { imageSource } from "@/lib/imageSource";
import { safeHref, safeMapEmbedUrl } from "@/lib/safeHref";
import { COLUMN_WIDGET_MIME, PALETTE_WIDGET_MIME, readColumnDragPayload } from "@/lib/builderDnd";
import { parseSafeCssDeclarations } from "@/lib/moduleStyle";
import Portfolio from "@/components/Portfolio";
import BookingSection from "@/components/BookingSection";
import type { PortfolioWork } from "@/lib/portfolio";
import type { PublicCalendarData } from "@/lib/publicCalendar";

interface BuilderWidgetProps {
  module: Module;
  showEmpty?: boolean;
  editable?: boolean;
  selectedWidgetId?: string | null;
  onSelectWidget?: (widgetId: string, columnIndex: number) => void;
  onDeleteWidget?: (widgetId: string, columnIndex: number) => void;
  onDuplicateWidget?: (widgetId: string, columnIndex: number) => void;
  onDuplicateColumn?: (columnIndex: number) => void;
  onColumnsChange?: (columns: ColumnWidget[][]) => void;
  portfolioWorks?: PortfolioWork[];
  calendar?: PublicCalendarData;
}

function widgetStyle(style?: ModuleStyle): CSSProperties | undefined {
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
    backgroundSize: style.backgroundSize || undefined,
    color: style.color || undefined,
    borderColor: style.borderColor || undefined,
    borderWidth: style.borderWidth ? `${style.borderWidth}px` : undefined,
    borderStyle: style.borderWidth ? "solid" : undefined,
    minHeight: style.minHeight || undefined,
    opacity: typeof style.opacity === "number" ? Math.min(1, Math.max(.1, style.opacity / 100)) : undefined,
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

export default function BuilderWidgets({ module, showEmpty = false, editable = false, selectedWidgetId, onSelectWidget, onDeleteWidget, onDuplicateWidget, onDuplicateColumn, onColumnsChange, portfolioWorks = [], calendar }: BuilderWidgetProps) {
  const widgetIdBase = useId().replace(/:/g, "");
  const widgetIdCounter = useRef(0);
  switch (module.type) {
    case "heading": {
      const d = withDefaults("heading", module.data);
      const Tag = d.level;
      return <section className={`px-2 py-2 ${d.alignment === "center" ? "text-center" : "text-left"}`}>{d.icon && <IconPreview name={d.icon} className={`mb-3 h-9 w-9 text-ink-gold ${d.alignment === "center" ? "mx-auto" : ""}`} />}<Tag className="whitespace-pre-line break-words font-display text-3xl text-ink-white md:text-5xl">{d.text}</Tag></section>;
    }
    case "text": {
      const d = withDefaults("text", module.data);
      return <section className={`px-2 py-2 ${d.alignment === "center" ? "text-center" : "text-left"}`}><p className="whitespace-pre-line break-words text-base leading-relaxed text-ink-grey md:text-lg">{d.text}</p></section>;
    }
    case "image": {
      const d = withDefaults("image", module.data);
      const source = imageSource(d.image);
      if (!source && !showEmpty) return null;
      const aspect = d.aspect === "square" ? "aspect-square" : d.aspect === "portrait" ? "aspect-[4/5]" : d.aspect === "wide" ? "aspect-[5/2]" : "aspect-[16/9]";
      const alignment = d.alignment === "right" ? "ml-auto" : d.alignment === "center" ? "mx-auto" : "mr-auto";
      return <figure className={`px-2 py-2 ${alignment}`} style={d.maxWidth ? { maxWidth: `${Math.min(1600, Math.max(40, d.maxWidth))}px` } : undefined}>{source ? <div className={`relative ${aspect} overflow-hidden bg-ink-charcoal`}><Image src={source} alt={d.alt} fill className={d.fit === "contain" ? "object-contain" : "object-cover"} sizes="100vw" /></div> : <div className={`flex ${aspect} items-center justify-center border border-dashed border-ink-white/25 bg-ink-charcoal text-sm text-ink-grey`}>Wybierz zdjęcie w panelu po lewej</div>}{d.caption && <figcaption className="mt-2 break-words text-sm text-ink-grey">{d.caption}</figcaption>}</figure>;
    }
    case "button": {
      const d = withDefaults("button", module.data);
      return <div className={`px-2 py-2 ${d.alignment === "center" ? "text-center" : d.alignment === "right" ? "text-right" : "text-left"}`}><a href={safeHref(d.href)} className={`inline-flex min-h-11 max-w-full items-center justify-center gap-2 break-words border px-5 py-3 text-sm tracking-[0.08em] transition-all hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-ink-gold ${d.width === "full" ? "w-full" : ""} ${d.style === "primary" ? "border-ink-gold bg-ink-gold text-ink-black" : "border-ink-gold text-ink-gold"}`}>{d.icon && d.iconPosition !== "right" && <IconPreview name={d.icon} />}{d.label}{d.icon && d.iconPosition === "right" && <IconPreview name={d.icon} />}</a></div>;
    }
    case "navigation": {
      const d = withDefaults("navigation", module.data);
      return <NavigationWidget items={d.items} alignment={d.alignment} mobileLabel={d.mobileLabel} variant={d.style} />;
    }
    case "portfolio": {
      const d = withDefaults("portfolio", module.data);
      const works = d.selectionMode === "selected" ? portfolioWorks.filter((work) => d.selectedIds.includes(work.id)) : portfolioWorks;
      return <Portfolio content={{ ...d, primaryBtnHref: safeHref(d.primaryBtnHref), secondaryBtnHref: safeHref(d.secondaryBtnHref) }} works={works} />;
    }
    case "booking":
      return <BookingSection content={withDefaults("booking", module.data)} calendar={calendar} />;
    case "divider": {
      const d = withDefaults("divider", module.data);
      const source = imageSource(d.icon);
      return <div className="px-4 py-7 sm:px-6 sm:py-8 md:px-12">{source && <img src={source} alt="" className="mx-auto mb-4 h-9 w-9 object-contain" />}{d.style === "space" ? <div className="h-12" /> : <div className={`h-px ${d.style === "gold" ? "bg-ink-gold" : "bg-ink-white/20"}`} />}</div>;
    }
    case "gallery": {
      const d = withDefaults("gallery", module.data);
      const images = d.images?.length ? d.images : [d.image1, d.image2, d.image3];
      const renderImages = showEmpty ? images.map((image) => imageSource(image)) : images.map((image) => imageSource(image)).filter((image): image is string => Boolean(image));
      if (renderImages.length === 0 && !showEmpty) return null;
      const gap = d.gap === "lg" ? "gap-6" : d.gap === "sm" ? "gap-2" : "gap-3";
      const radius = d.radius === "lg" ? "rounded-2xl" : d.radius === "md" ? "rounded-xl" : d.radius === "sm" ? "rounded-md" : "";
      const galleryColumns = d.columns ?? { desktop: 3, tablet: 2, mobile: 1 };
      const layoutStyle = {
        "--builder-gallery-columns-mobile": String(galleryColumns.mobile),
        "--builder-gallery-columns-tablet": String(galleryColumns.tablet),
        "--builder-gallery-columns-desktop": String(galleryColumns.desktop),
      } as CSSProperties & Record<"--builder-gallery-columns-mobile" | "--builder-gallery-columns-tablet" | "--builder-gallery-columns-desktop", string>;
      return <div style={layoutStyle} className={`px-4 py-7 sm:px-6 sm:py-8 md:px-12 ${d.layout === "masonry" ? "builder-gallery-masonry" : "builder-gallery-grid grid"} ${gap}`}>{renderImages.map((image, index) => image ? <div key={index} className={`relative mb-3 aspect-square overflow-hidden bg-ink-charcoal ${radius}`}><Image src={image} alt={`Zdjęcie galerii ${index + 1}`} fill className="object-cover" sizes="(max-width: 639px) 100vw, 33vw" /></div> : <div key={index} className="flex aspect-square items-center justify-center border border-dashed border-ink-white/25 bg-ink-charcoal text-center text-xs text-ink-grey">Zdjęcie {index + 1}</div>)}</div>;
    }
    case "columns": {
      const d = withDefaults("columns", module.data);
      const columnCount = d.layout === "four" ? 4 : d.layout === "three" ? 3 : d.layout === "two" ? 2 : 1;
      const columns = Array.from({ length: columnCount }, (_, index) => d.columns[index] ?? []);
      const backgroundTone = d.background === "charcoal" ? "bg-ink-charcoal" : d.background === "gold" ? "bg-ink-gold text-ink-black" : "bg-transparent";
      const background = `${backgroundTone} ${d.mobileLayout === "row" ? "builder-columns-row-mobile" : ""}`;
      const padding = d.padding === "sm" ? "py-8" : d.padding === "lg" ? "py-20" : "py-12";
      const gridTemplate = (d.columnWidths?.length === columnCount ? d.columnWidths : Array(columnCount).fill(100 / columnCount)).map((width) => `${Math.max(5, Number(width) || 0)}fr`).join(" ");
      const alignment = d.verticalAlign === "center" ? "items-center" : d.verticalAlign === "end" ? "items-end" : d.verticalAlign === "stretch" ? "items-stretch" : "items-start";

      function update(next: ColumnWidget[][]) { onColumnsChange?.(next); }
      function insertPalette(type: string, columnIndex: number, beforeIndex = columns[columnIndex].length) {
        if (!isColumnWidgetType(type)) return;
        const next = columns.map((items) => [...items]);
        widgetIdCounter.current += 1;
        const widgetId = `w_${widgetIdBase}_${widgetIdCounter.current}`;
        next[columnIndex].splice(beforeIndex, 0, { id: widgetId, type, data: defaultModuleData(type) });
        update(next);
        onSelectWidget?.(widgetId, columnIndex);
      }
      function moveWidget(payload: ReturnType<typeof readColumnDragPayload>, columnIndex: number, beforeIndex: number) {
        if (!payload || payload.moduleId !== module.id) return;
        const next = columns.map((items) => [...items]);
        const sourceIndex = next[payload.columnIndex]?.findIndex((item) => item.id === payload.widgetId) ?? -1;
        if (sourceIndex < 0) return;
        const [moved] = next[payload.columnIndex].splice(sourceIndex, 1);
        const adjustedIndex = payload.columnIndex === columnIndex && sourceIndex < beforeIndex ? beforeIndex - 1 : beforeIndex;
        next[columnIndex].splice(Math.max(0, adjustedIndex), 0, moved);
        update(next);
      }
      function handleDrop(event: DragEvent, columnIndex: number, beforeIndex: number) {
        event.preventDefault(); event.stopPropagation();
        const paletteType = event.dataTransfer.getData(PALETTE_WIDGET_MIME);
        if (paletteType) return insertPalette(paletteType, columnIndex, beforeIndex);
        moveWidget(readColumnDragPayload(event.dataTransfer.getData(COLUMN_WIDGET_MIME)), columnIndex, beforeIndex);
      }

      return <section className={`${background} px-4 md:px-8 ${padding}`}><div className={`builder-columns-grid grid ${alignment}`} style={{ gap: `${Math.min(160, Math.max(0, d.gap ?? 24))}px`, "--builder-column-template": gridTemplate } as CSSProperties}>{columns.map((widgets, columnIndex) => <div key={columnIndex} onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = event.dataTransfer.types.includes(PALETTE_WIDGET_MIME) ? "copy" : "move"; }} onDrop={(event) => handleDrop(event, columnIndex, widgets.length)} className={`min-w-0 ${editable ? "min-h-28 border border-dashed border-ink-gold/30 bg-ink-black/15 p-2" : ""}`}><div className="mb-2 flex items-center justify-between text-[9px] tracking-[.1em] text-ink-gold/70" hidden={!editable}><span>KOLUMNA {columnIndex + 1}</span><span className="flex items-center gap-2"><span>UPUŚĆ WIDGET</span>{onDuplicateColumn && <button type="button" title="Duplikuj kolumnę" aria-label={`Duplikuj kolumnę ${columnIndex + 1}`} onClick={(event) => { event.stopPropagation(); onDuplicateColumn(columnIndex); }} className="pointer-events-auto flex h-6 w-6 items-center justify-center border border-ink-gold/30 text-ink-gold transition hover:bg-ink-gold/10"><Copy className="h-3 w-3" /></button>}</span></div>{widgets.length ? widgets.map((widget, widgetIndex) => {
        const selected = selectedWidgetId === widget.id;
        const typography = hasTypography(widget.style);
        return <div key={widget.id} draggable={editable} onDragStart={(event) => { event.stopPropagation(); event.dataTransfer.setData(COLUMN_WIDGET_MIME, JSON.stringify({ moduleId: module.id, widgetId: widget.id, columnIndex })); event.dataTransfer.effectAllowed = "move"; }} onDragOver={(event) => { if (editable) event.preventDefault(); }} onDrop={(event) => handleDrop(event, columnIndex, widgetIndex)} onClick={(event) => { if (!editable) return; event.stopPropagation(); onSelectWidget?.(widget.id, columnIndex); }} style={widgetStyle(widget.style)} className={`group/widget relative min-w-0 ${typography ? "builder-custom-typography" : ""} ${widget.style?.fontSize ? "builder-custom-font-size" : ""} ${editable ? `cursor-pointer outline outline-2 outline-offset-[-2px] ${selected ? "outline-ink-gold" : "outline-transparent hover:outline-ink-gold/55"}` : ""} ${widget.style?.cssClass ?? ""}`}>
          {editable && <div className={`pointer-events-auto absolute left-1/2 top-0 z-30 flex -translate-x-1/2 -translate-y-1/2 items-center bg-ink-gold text-[9px] text-ink-black opacity-0 shadow-lg ${selected ? "opacity-100" : "group-hover/widget:opacity-100"}`}><span className="cursor-grab px-2 py-1">⠿ {MODULE_LABELS[widget.type]}</span>{onDuplicateWidget && <button type="button" title="Duplikuj widget" aria-label={`Duplikuj: ${MODULE_LABELS[widget.type]}`} onClick={(event) => { event.stopPropagation(); onDuplicateWidget(widget.id, columnIndex); }} className="border-l border-ink-black/20 px-2 py-1 hover:bg-black/10"><Copy className="h-3 w-3" /></button>}<button type="button" title="Usuń widget" aria-label={`Usuń: ${MODULE_LABELS[widget.type]}`} onClick={(event) => { event.stopPropagation(); onDeleteWidget?.(widget.id, columnIndex); }} className="border-l border-ink-black/20 px-2 py-1 hover:bg-black/10">×</button></div>}
          <BuilderWidgets module={{ ...widget, hidden: false } as Module} showEmpty={showEmpty} portfolioWorks={portfolioWorks} calendar={calendar} />
        </div>;
      }) : editable ? <div className="flex min-h-24 items-center justify-center p-4 text-center text-[10px] leading-relaxed text-ink-grey">Przeciągnij widget z lewego panelu tutaj</div> : null}</div>)}</div></section>;
    }
    case "faq": {
      const d = withDefaults("faq", module.data);
      return <FaqWidget title={d.title} items={d.items} variant={d.variant} initiallyOpen={d.initiallyOpen} />;
    }
    case "video": {
      const d = withDefaults("video", module.data);
      const src = toEmbedUrl(d.url);
      if (!src && !showEmpty) return null;
      return <figure className="px-4 py-8 sm:px-6 sm:py-10 md:px-12"><h2 className="mb-4 break-words font-display text-3xl text-ink-white">{d.title}</h2>{src ? <div className="aspect-video overflow-hidden bg-ink-charcoal"><iframe className="h-full w-full" src={src} title={d.title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen /></div> : <div className="flex aspect-video items-center justify-center border border-dashed border-ink-white/25 bg-ink-charcoal text-sm text-ink-grey">Wklej link do filmu YouTube lub Vimeo</div>}{d.caption && <figcaption className="mt-3 break-words text-sm text-ink-grey">{d.caption}</figcaption>}</figure>;
    }
    case "map": {
      const d = withDefaults("map", module.data);
      if (!d.embedUrl && !showEmpty) return null;
      const height = d.height === "sm" ? "h-64" : d.height === "lg" ? "h-[32rem]" : "h-96";
      const embedUrl = safeMapEmbedUrl(d.embedUrl);
      return <section className="px-4 py-8 sm:px-6 sm:py-10 md:px-12"><h2 className="break-words font-display text-3xl text-ink-white">{d.title}</h2>{d.address && <p className="mt-2 break-words text-sm text-ink-grey">{d.address}</p>}{embedUrl ? <iframe className={`mt-5 w-full border-0 ${height}`} src={embedUrl} title={d.title} loading="lazy" referrerPolicy="no-referrer-when-downgrade" /> : <div className={`mt-5 flex ${height} items-center justify-center border border-dashed border-ink-white/25 bg-ink-charcoal text-sm text-ink-grey`}>Wklej link „src” z opcji Udostępnij → Umieść mapę</div>}</section>;
    }
    case "quote": {
      const d = withDefaults("quote", module.data);
      const quoteStyle = d.variant === "centered" ? "mx-auto max-w-4xl px-4 text-center sm:px-6" : d.variant === "card" ? "mx-4 border border-ink-white/15 bg-ink-charcoal px-5 shadow-xl shadow-black/30 sm:mx-6 sm:px-7 md:mx-12 md:px-10" : "mx-4 border-l-2 border-ink-gold bg-ink-charcoal/50 px-4 sm:mx-6 sm:px-6 md:mx-12";
      return <blockquote className={`my-10 py-8 ${quoteStyle}`}><p className={`${d.variant === "centered" ? "text-3xl md:text-5xl" : "text-2xl"} font-display leading-relaxed text-ink-white`}>„{d.quote}”</p><footer className="mt-5 text-sm text-ink-gold">{d.author}{d.role && <span className="text-ink-grey"> · {d.role}</span>}</footer></blockquote>;
    }
    case "iconList": {
      const d = withDefaults("iconList", module.data);
      const icons = { check: "✓", dot: "•", arrow: "→" };
      const columns = d.columns === "three" ? "md:grid-cols-3" : d.columns === "two" ? "md:grid-cols-2" : "grid-cols-1";
      const listClass = d.layout === "list" ? "space-y-3" : `grid gap-4 ${columns}`;
      return <section className="px-4 py-8 sm:px-6 sm:py-10 md:px-12"><h2 className="mb-5 break-words font-display text-3xl text-ink-white">{d.title}</h2><ol className={listClass}>{d.items.filter(Boolean).map((item, index) => <li key={index} className={`flex min-w-0 gap-3 break-words text-base text-ink-grey ${d.layout === "cards" ? "border border-ink-white/12 bg-ink-charcoal/60 p-4 sm:p-5" : d.layout === "steps" ? "items-start border-t border-ink-white/15 py-5" : ""}`}><span className={`${d.layout === "steps" ? "font-display text-3xl" : "text-lg"} shrink-0 text-ink-gold`}>{d.layout === "steps" ? String(index + 1).padStart(2, "0") : icons[d.style]}</span><span className={d.layout === "steps" ? "pt-1" : ""}>{item}</span></li>)}</ol></section>;
    }
    case "callout": {
      const d = withDefaults("callout", module.data);
      const styles = { charcoal: "bg-ink-charcoal text-ink-white", gold: "bg-ink-gold text-ink-black", outline: "border border-ink-gold text-ink-white" };
      const muted = d.style === "gold" ? "text-ink-black/70" : "text-ink-grey";
      return <section className={`mx-4 my-8 px-4 py-8 sm:mx-6 sm:my-10 sm:px-6 sm:py-10 md:mx-12 md:px-10 ${styles[d.style]}`}><p className={`break-words text-[11px] tracking-[0.16em] ${d.style === "gold" ? "text-ink-black/70" : "text-ink-gold"}`}>{d.eyebrow}</p><h2 className="mt-3 break-words font-display text-3xl">{d.title}</h2><p className={`mt-3 max-w-2xl whitespace-pre-line break-words leading-relaxed ${muted}`}>{d.body}</p>{d.buttonLabel && <a href={safeHref(d.href)} className={`mt-6 inline-flex min-h-11 max-w-full items-center break-words border px-5 py-3 text-sm tracking-[0.08em] ${d.style === "gold" ? "border-ink-black text-ink-black" : "border-ink-gold text-ink-gold"}`}>{d.buttonLabel}</a>}</section>;
    }
    case "customCode": {
      const d = withDefaults("customCode", module.data);
      const height = Math.min(1600, Math.max(160, Number(d.height) || 420));
      const title = typeof d.title === "string" ? d.title : "Własny moduł HTML i CSS";
      const css = String(d.css ?? "").replace(/<\/style/gi, "<\\/style").replace(/@import/gi, "/* import blocked */");
      const html = String(d.html ?? "");
      const backgroundColor = typeof d.backgroundColor === "string" ? d.backgroundColor : "#111111";
      const document = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src https: data: blob:; media-src https:; font-src https: data:; style-src 'unsafe-inline'; script-src 'none'; connect-src 'none'; frame-src 'none'; form-action 'none'; base-uri 'none'"><style>${css}</style></head><body>${html}</body></html>`;
      return <section className="w-full" style={{ backgroundColor }}><iframe title={title || "Własny moduł HTML i CSS"} srcDoc={document} sandbox="" referrerPolicy="no-referrer" className="block w-full border-0" style={{ height }} /></section>;
    }
    default: return null;
  }
}

function NavigationWidget({ items, alignment, mobileLabel, variant }: { items: { id: string; label: string; href: string }[]; alignment: "left" | "center" | "right"; mobileLabel: string; variant: "plain" | "pills" }) {
  const [open, setOpen] = useState(false);
  const validItems = items.filter((item) => item.label.trim() && safeHref(item.href, ""));
  const align = alignment === "right" ? "justify-end" : alignment === "center" ? "justify-center" : "justify-start";
  const linkClass = variant === "pills" ? "border border-ink-white/15 px-3 py-2 hover:border-ink-gold" : "px-2 py-2 hover:text-ink-gold";
  return <nav className="relative px-2 py-2" aria-label={mobileLabel || "Menu strony"}>
    <button type="button" aria-expanded={open} onClick={() => setOpen((value) => !value)} className="ml-auto flex min-h-10 items-center gap-2 border border-ink-white/20 px-3 text-[11px] tracking-[.1em] text-ink-white md:hidden">{open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}{mobileLabel || "MENU"}</button>
    <div className={`${open ? "flex" : "hidden"} absolute right-0 top-full z-50 min-w-52 flex-col border border-ink-white/15 bg-ink-black/95 p-2 shadow-2xl md:static md:flex md:min-w-0 md:flex-row md:flex-wrap md:border-0 md:bg-transparent md:p-0 md:shadow-none ${align}`}>
      {validItems.map((item) => <a key={item.id} href={safeHref(item.href)} onClick={() => setOpen(false)} className={`text-[11px] tracking-[.08em] text-ink-white transition-colors ${linkClass}`}>{item.label}</a>)}
    </div>
  </nav>;
}

function FaqWidget({ title, items, variant, initiallyOpen }: { title: string; items: { question: string; answer: string }[]; variant: "lines" | "cards" | "split"; initiallyOpen: "none" | "first" }) {
  const [openIndex, setOpenIndex] = useState<number | null>(initiallyOpen === "first" ? 0 : null);
  const id = useId();
  const sectionClass = variant === "split" ? "grid gap-8 px-4 py-10 sm:px-6 sm:py-12 md:px-12 lg:grid-cols-[.55fr_1fr]" : "px-4 py-10 sm:px-6 sm:py-12 md:px-12";
  const listClass = variant === "cards" ? "grid gap-3" : "divide-y divide-ink-white/15 border-y border-ink-white/15";
  return <section className={sectionClass}><h2 className={`${variant === "split" ? "lg:sticky lg:top-24 lg:self-start" : "mb-6"} font-display text-3xl text-ink-white`}>{title}</h2><div className={listClass}>{items.map((item, index) => {
    const open = openIndex === index;
    const answerId = `${id}-faq-answer-${index}`;
    return <article key={`${item.question}-${index}`} className={variant === "cards" ? "border border-ink-white/12 bg-ink-charcoal/55 px-5" : "py-1"}><button type="button" aria-expanded={open} aria-controls={answerId} onClick={(event) => { event.stopPropagation(); setOpenIndex(open ? null : index); }} className="flex w-full items-center justify-between gap-4 py-4 text-left text-base text-ink-white"><span>{item.question}</span><span aria-hidden className={`shrink-0 text-2xl leading-none text-ink-gold transition-transform duration-200 ${open ? "rotate-45" : ""}`}>+</span></button><div id={answerId} hidden={!open} className="pb-4 pr-8"><p className="whitespace-pre-line text-sm leading-relaxed text-ink-grey">{item.answer}</p></div></article>;
  })}</div></section>;
}

function toEmbedUrl(url: string) {
  const href = safeHref(url, "");
  if (!href) return "";
  try {
    const parsed = new URL(href);
    const host = parsed.hostname.toLowerCase();
    let id = "";
    if (host === "youtu.be") id = parsed.pathname.split("/").filter(Boolean)[0] ?? "";
    if (host === "youtube.com" || host === "www.youtube.com") {
      id = parsed.pathname.startsWith("/embed/")
        ? parsed.pathname.split("/")[2] ?? ""
        : parsed.pathname === "/watch"
          ? parsed.searchParams.get("v") ?? ""
          : "";
    }
    if (host === "www.youtube-nocookie.com" && parsed.pathname.startsWith("/embed/")) {
      id = parsed.pathname.split("/")[2] ?? "";
    }
    if (/^[a-z0-9_-]{6,20}$/i.test(id)) {
      return `https://www.youtube-nocookie.com/embed/${id}`;
    }

    const vimeoId =
      host === "vimeo.com"
        ? parsed.pathname.split("/").filter(Boolean)[0]
        : host === "player.vimeo.com" && parsed.pathname.startsWith("/video/")
          ? parsed.pathname.split("/")[2]
          : "";
    return /^\d{5,12}$/.test(vimeoId ?? "")
      ? `https://player.vimeo.com/video/${vimeoId}`
      : "";
  } catch {
    return "";
  }
}
