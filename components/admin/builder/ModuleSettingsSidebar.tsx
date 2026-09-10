"use client";

import { useState } from "react";
import { ArrowLeft, ClipboardPaste, Copy, FileText, Palette, RotateCcw, Settings2 } from "lucide-react";
import ImageUploadField from "@/components/admin/ImageUploadField";
import BackgroundControls from "@/components/admin/builder/BackgroundControls";
import IconPicker from "@/components/admin/builder/IconPicker";
import GalleryEditor from "@/components/admin/builder/GalleryEditor";
import ColorPicker from "@/components/admin/builder/ColorPicker";
import { TextField, TextareaField, SelectField, NumberField, RangeField, ToggleField, FieldGroup, BoxSpacingField, PanelSection } from "@/components/admin/builder/fields";
import { withDefaults, MODULE_LABELS, type Module, type ModuleStyle } from "@/lib/modules";
import type { PortfolioWork } from "@/lib/portfolio";
import { imageSource } from "@/lib/imageSource";

interface Props {
  module: Module;
  scope?: "section" | "widget" | "column";
  editorLabel?: string;
  columnWidth?: number;
  onColumnWidthChange?: (width: number) => void;
  onChange: (data: Record<string, unknown>) => void;
  onStyleChange: (style: ModuleStyle) => void;
  onClose: () => void;
  portfolioItems: PortfolioWork[];
  globalContact?: { address: string; phone: string; email: string; hours: string };
}

let copiedBuilderStyle: ModuleStyle | null = null;

export default function ModuleSettingsSidebar({ module, scope = "section", editorLabel, columnWidth, onColumnWidthChange, onChange, onStyleChange, onClose, portfolioItems, globalContact }: Props) {
  const [tab, setTab] = useState<"content" | "style" | "advanced">("content");
  const [styleAction, setStyleAction] = useState("");
  const tabs = [
    { id: "content" as const, label: module.type === "columns" || scope === "column" ? "UKŁAD" : "TREŚĆ", icon: FileText },
    { id: "style" as const, label: "STYL", icon: Palette },
    { id: "advanced" as const, label: "ZAAWANS.", icon: Settings2 },
  ];
  return (
    <div className="flex min-h-full flex-col bg-[#1d1f22]">
      <div className="flex h-12 items-center border-b border-white/10 px-3">
        <button onClick={onClose} aria-label="Wróć do elementów" title="Wróć do elementów" className="flex h-8 w-8 items-center justify-center text-white/55 transition hover:text-ink-gold"><ArrowLeft className="h-4 w-4" /></button>
        <p className="min-w-0 flex-1 truncate pr-8 text-center text-[13px] font-semibold text-white">{editorLabel ?? `Edytuj: ${MODULE_LABELS[module.type]}`}</p>
      </div>

      <div className="grid grid-cols-3 border-b border-white/10">{tabs.map(({ id, label, icon: Icon }) => <button key={id} type="button" onClick={() => setTab(id)} className={`flex min-h-14 flex-col items-center justify-center gap-1 border-b-2 px-1 text-[8px] transition ${tab === id ? "border-white text-white" : "border-transparent text-white/45 hover:text-white/75"}`}><Icon className="h-4 w-4" /><span>{label}</span></button>)}</div>
      <div className="flex flex-col gap-3 p-3">
        {tab === "content" && (scope === "column" ? <ColumnLayoutControls width={columnWidth ?? 100} onWidthChange={onColumnWidthChange} /> : renderFields(module, onChange, portfolioItems, globalContact))}
        {tab === "style" && <><div className="grid grid-cols-3 gap-1.5 border-b border-white/10 pb-3"><button type="button" onClick={() => { copiedBuilderStyle = structuredClone(module.style ?? {}); setStyleAction("Skopiowano"); }} className="flex min-h-9 items-center justify-center gap-1 border border-white/15 text-[9px] text-white/65 hover:border-ink-gold hover:text-ink-gold"><Copy className="h-3 w-3" />KOPIUJ</button><button type="button" disabled={!copiedBuilderStyle} onClick={() => { if (copiedBuilderStyle) { onStyleChange(structuredClone(copiedBuilderStyle)); setStyleAction("Wklejono"); } }} className="flex min-h-9 items-center justify-center gap-1 border border-white/15 text-[9px] text-white/65 hover:border-ink-gold hover:text-ink-gold disabled:opacity-30"><ClipboardPaste className="h-3 w-3" />WKLEJ</button><button type="button" onClick={() => { onStyleChange({}); setStyleAction("Zresetowano"); }} className="flex min-h-9 items-center justify-center gap-1 border border-white/15 text-[9px] text-white/65 hover:border-red-400 hover:text-red-300"><RotateCcw className="h-3 w-3" />RESET</button></div>{styleAction && <p role="status" className="-mt-1 text-[9px] text-ink-gold">{styleAction} styl.</p>}<BackgroundControls value={module.style} onChange={onStyleChange} /></>}
        {tab === "advanced" && <AdvancedControls value={module.style} onChange={onStyleChange} />}
      </div>
    </div>
  );
}

function ColumnLayoutControls({ width, onWidthChange }: { width: number; onWidthChange?: (width: number) => void }) {
  return <div className="flex flex-col">
    <PanelSection title="Szerokość kolumny" defaultOpen><NumberField label="SZEROKOŚĆ (%)" value={width} min={5} max={100} step={0.1} onChange={(next) => onWidthChange?.(next)} /><p className="text-[9px] leading-relaxed text-ink-grey">Szerokości są proporcjami w bieżącej sekcji. Nie muszą sumować się do 100 — builder zachowa ich wzajemną relację.</p></PanelSection>
    <PanelSection title="Zawartość"><p className="text-[10px] leading-relaxed text-ink-grey">Kolejność widgetów zmieniasz przez przeciąganie. W zakładkach Styl i Zaawansowane ustawisz niezależne tło, maskę, animację, pozycję, filtry i odstępy tej kolumny.</p></PanelSection>
  </div>;
}
function AdvancedControls({ value, onChange }: { value?: ModuleStyle; onChange: (style: ModuleStyle) => void }) {
  const style = value ?? {};
  const set = (patch: Partial<ModuleStyle>) => onChange({ ...style, ...patch });
  return <div className="flex flex-col">
    <PanelSection title="Odstępy" defaultOpen><BoxSpacingField label="MARGINES" value={style.marginBox} onChange={(marginBox) => set({ marginBox })} /><BoxSpacingField label="DOPEŁNIENIE" value={style.paddingBox} onChange={(paddingBox) => set({ paddingBox })} /></PanelSection>
    <PanelSection title="Rozmiar i proporcje"><SelectField label="PRESET SZEROKOŚCI TREŚCI" value={style.contentWidth ?? "full"} onChange={(contentWidth) => set({ contentWidth })} options={[{ value: "full", label: "Pełna szerokość" }, { value: "wide", label: "Szeroka" }, { value: "normal", label: "Standardowa" }, { value: "narrow", label: "Wąska" }]} /><div className="grid grid-cols-2 gap-2"><NumberField label="SZEROKOŚĆ PX" value={style.width ?? 0} min={0} max={4000} onChange={(width) => set({ width: width || undefined })} /><NumberField label="MIN. SZEROKOŚĆ" value={style.minWidth ?? 0} min={0} max={4000} onChange={(minWidth) => set({ minWidth: minWidth || undefined })} /><NumberField label="MAKS. SZEROKOŚĆ" value={style.maxWidth ?? 0} min={0} max={4000} onChange={(maxWidth) => set({ maxWidth: maxWidth || undefined })} /><NumberField label="WYSOKOŚĆ PX" value={style.height ?? 0} min={0} max={4000} onChange={(height) => set({ height: height || undefined })} /><NumberField label="MIN. WYSOKOŚĆ" value={style.minHeight ?? 0} min={0} max={4000} onChange={(minHeight) => set({ minHeight: minHeight || undefined })} /><NumberField label="MAKS. WYSOKOŚĆ" value={style.maxHeight ?? 0} min={0} max={4000} onChange={(maxHeight) => set({ maxHeight: maxHeight || undefined })} /></div><TextField label="PROPORCJE CSS" value={style.aspectRatio ?? ""} onChange={(aspectRatio) => set({ aspectRatio })} placeholder="np. 16 / 9 albo 1 / 1" /></PanelSection>
    <PanelSection title="Układ Flex / Grid"><SelectField label="TRYB WYŚWIETLANIA" value={style.display ?? "block"} onChange={(display) => set({ display })} options={[{ value: "block", label: "Blok" }, { value: "flex", label: "Flex" }, { value: "grid", label: "Grid" }]} />{style.display === "flex" && <><div className="grid grid-cols-2 gap-2"><SelectField label="KIERUNEK" value={style.flexDirection ?? "column"} onChange={(flexDirection) => set({ flexDirection })} options={[{ value: "row", label: "Wiersz" }, { value: "column", label: "Kolumna" }, { value: "row-reverse", label: "Wiersz odwrotny" }, { value: "column-reverse", label: "Kolumna odwrotna" }]} /><SelectField label="ZAWIJANIE" value={style.flexWrap ?? "nowrap"} onChange={(flexWrap) => set({ flexWrap })} options={[{ value: "nowrap", label: "Bez zawijania" }, { value: "wrap", label: "Zawijaj" }]} /><SelectField label="ROZŁOŻENIE" value={style.justifyContent ?? "start"} onChange={(justifyContent) => set({ justifyContent })} options={[{ value: "start", label: "Początek" }, { value: "center", label: "Środek" }, { value: "end", label: "Koniec" }, { value: "space-between", label: "Między" }, { value: "space-around", label: "Dookoła" }, { value: "space-evenly", label: "Równo" }]} /><SelectField label="WYRÓWNANIE" value={style.alignItems ?? "stretch"} onChange={(alignItems) => set({ alignItems })} options={[{ value: "start", label: "Początek" }, { value: "center", label: "Środek" }, { value: "end", label: "Koniec" }, { value: "stretch", label: "Rozciągnij" }]} /></div><NumberField label="ODSTĘP ELEMENTÓW" value={style.gap ?? 0} min={0} max={300} onChange={(gap) => set({ gap })} /></>}{style.display === "grid" && <div className="grid grid-cols-2 gap-2"><NumberField label="LICZBA KOLUMN" value={style.gridColumns ?? 2} min={1} max={12} onChange={(gridColumns) => set({ gridColumns })} /><NumberField label="ODSTĘP" value={style.gap ?? 16} min={0} max={300} onChange={(gap) => set({ gap })} /></div>}</PanelSection>
    <PanelSection title="Pozycja i przepełnienie"><div className="grid grid-cols-2 gap-2"><SelectField label="POZYCJA" value={style.position ?? "static"} onChange={(position) => set({ position })} options={[{ value: "static", label: "Naturalna" }, { value: "relative", label: "Względna" }, { value: "sticky", label: "Przyklejona" }, { value: "absolute", label: "Absolutna" }]} /><NumberField label="Z-INDEX" value={style.zIndex ?? 0} min={-50} max={9999} onChange={(zIndex) => set({ zIndex })} /></div>{style.position && style.position !== "static" && <div className="grid grid-cols-2 gap-2"><NumberField label="GÓRA" value={style.insetTop ?? 0} min={-2000} max={2000} onChange={(insetTop) => set({ insetTop })} /><NumberField label="PRAWO" value={style.insetRight ?? 0} min={-2000} max={2000} onChange={(insetRight) => set({ insetRight })} /><NumberField label="DÓŁ" value={style.insetBottom ?? 0} min={-2000} max={2000} onChange={(insetBottom) => set({ insetBottom })} /><NumberField label="LEWO" value={style.insetLeft ?? 0} min={-2000} max={2000} onChange={(insetLeft) => set({ insetLeft })} /></div>}<div className="grid grid-cols-2 gap-2"><SelectField label="PRZEPEŁNIENIE X" value={style.overflowX ?? "visible"} onChange={(overflowX) => set({ overflowX })} options={[{ value: "visible", label: "Widoczne" }, { value: "hidden", label: "Ukryte" }, { value: "clip", label: "Przycięte" }, { value: "auto", label: "Auto" }]} /><SelectField label="PRZEPEŁNIENIE Y" value={style.overflowY ?? "visible"} onChange={(overflowY) => set({ overflowY })} options={[{ value: "visible", label: "Widoczne" }, { value: "hidden", label: "Ukryte" }, { value: "clip", label: "Przycięte" }, { value: "auto", label: "Auto" }]} /></div><p className="text-[9px] leading-relaxed text-ink-grey">Pozycja absolutna daje swobodę kolażu, ale wymaga kontroli widoku telefonu i tabletu.</p></PanelSection>
    <PanelSection title="Transformacja"><div className="grid grid-cols-2 gap-2"><NumberField label="PRZESUNIĘCIE X" value={style.translateX ?? 0} min={-2000} max={2000} onChange={(translateX) => set({ translateX })} /><NumberField label="PRZESUNIĘCIE Y" value={style.translateY ?? 0} min={-2000} max={2000} onChange={(translateY) => set({ translateY })} /><NumberField label="SKALA" value={style.scale ?? 1} min={0.05} max={5} step={0.01} onChange={(scale) => set({ scale })} /><NumberField label="OBRÓT" value={style.rotate ?? 0} min={-720} max={720} step={0.25} onChange={(rotate) => set({ rotate })} /><NumberField label="POCHYLENIE X" value={style.skewX ?? 0} min={-80} max={80} onChange={(skewX) => set({ skewX })} /><NumberField label="POCHYLENIE Y" value={style.skewY ?? 0} min={-80} max={80} onChange={(skewY) => set({ skewY })} /></div><SelectField label="PUNKT TRANSFORMACJI" value={style.transformOrigin ?? "center"} onChange={(transformOrigin) => set({ transformOrigin })} options={[{ value: "center", label: "Środek" }, { value: "top", label: "Góra" }, { value: "bottom", label: "Dół" }, { value: "left", label: "Lewo" }, { value: "right", label: "Prawo" }, { value: "top left", label: "Góra lewo" }, { value: "top right", label: "Góra prawo" }, { value: "bottom left", label: "Dół lewo" }, { value: "bottom right", label: "Dół prawo" }]} /></PanelSection>
    <PanelSection title="Najechanie / interakcja"><div className="grid grid-cols-2 gap-2"><NumberField label="RUCH X" value={style.hoverTranslateX ?? style.translateX ?? 0} min={-600} max={600} onChange={(hoverTranslateX) => set({ hoverTranslateX })} /><NumberField label="RUCH Y" value={style.hoverTranslateY ?? style.translateY ?? 0} min={-600} max={600} onChange={(hoverTranslateY) => set({ hoverTranslateY })} /><NumberField label="SKALA" value={style.hoverScale ?? style.scale ?? 1} min={0.05} max={5} step={0.01} onChange={(hoverScale) => set({ hoverScale })} /><NumberField label="OBRÓT" value={style.hoverRotate ?? style.rotate ?? 0} min={-720} max={720} onChange={(hoverRotate) => set({ hoverRotate })} /><RangeField label="KRYCIE" value={style.hoverOpacity ?? 100} min={0} max={100} suffix="%" onChange={(hoverOpacity) => set({ hoverOpacity })} /><RangeField label="ROZMYCIE" value={style.hoverBlur ?? style.blur ?? 0} min={0} max={40} suffix="px" onChange={(hoverBlur) => set({ hoverBlur })} /><RangeField label="JASNOŚĆ" value={style.hoverBrightness ?? style.brightness ?? 100} min={0} max={300} suffix="%" onChange={(hoverBrightness) => set({ hoverBrightness })} /><NumberField label="CZAS MS" value={style.transitionDuration ?? 350} min={0} max={5000} step={50} onChange={(transitionDuration) => set({ transitionDuration })} /></div><SelectField label="KRZYWA PRZEJŚCIA" value={style.transitionEasing ?? "ease"} onChange={(transitionEasing) => set({ transitionEasing })} options={[{ value: "ease", label: "Płynna" }, { value: "ease-in", label: "Przyspiesza" }, { value: "ease-out", label: "Zwalnia" }, { value: "ease-in-out", label: "Płynna w obie strony" }, { value: "linear", label: "Liniowa" }, { value: "spring", label: "Sprężysta" }]} /><SelectField label="KURSOR" value={style.cursor ?? "auto"} onChange={(cursor) => set({ cursor })} options={[{ value: "auto", label: "Automatyczny" }, { value: "default", label: "Domyślny" }, { value: "pointer", label: "Wskaźnik" }, { value: "crosshair", label: "Celownik" }, { value: "grab", label: "Chwyć" }, { value: "zoom-in", label: "Powiększ" }, { value: "none", label: "Ukryty" }]} /></PanelSection>
    <PanelSection title="Animacja"><SelectField label="EFEKT" value={style.animation ?? "none"} onChange={(animation) => set({ animation })} options={[{ value: "none", label: "Brak" }, { value: "fade", label: "Pojawienie" }, { value: "fade-up", label: "Z dołu" }, { value: "fade-down", label: "Z góry" }, { value: "fade-left", label: "Z prawej" }, { value: "fade-right", label: "Z lewej" }, { value: "zoom", label: "Zoom" }, { value: "flip", label: "Obrót 3D" }, { value: "rotate", label: "Obrót" }, { value: "blur-in", label: "Wyostrzenie" }, { value: "bounce", label: "Podskok" }, { value: "float", label: "Lewitacja" }, { value: "pulse", label: "Puls" }]} />{style.animation && style.animation !== "none" && <><div className="grid grid-cols-2 gap-2"><NumberField label="CZAS MS" value={style.animationDuration ?? 700} min={50} max={10000} step={50} onChange={(animationDuration) => set({ animationDuration })} /><NumberField label="OPÓŹNIENIE MS" value={style.animationDelay ?? 0} min={0} max={10000} step={50} onChange={(animationDelay) => set({ animationDelay })} /></div><div className="grid grid-cols-2 gap-2"><SelectField label="KRZYWA" value={style.animationEasing ?? "ease-out"} onChange={(animationEasing) => set({ animationEasing })} options={[{ value: "ease", label: "Płynna" }, { value: "ease-in", label: "Przyspiesza" }, { value: "ease-out", label: "Zwalnia" }, { value: "ease-in-out", label: "Obustronna" }, { value: "linear", label: "Liniowa" }, { value: "spring", label: "Sprężysta" }]} /><SelectField label="POWTARZANIE" value={style.animationIteration ?? "once"} onChange={(animationIteration) => set({ animationIteration })} options={[{ value: "once", label: "Jeden raz" }, { value: "infinite", label: "W pętli" }]} /></div></>}</PanelSection>
    <PanelSection title="Maska i dzielniki"><SelectField label="MASKA / KSZTAŁT" value={style.maskShape ?? "none"} onChange={(maskShape) => set({ maskShape })} options={[{ value: "none", label: "Brak" }, { value: "slant-left", label: "Skos w lewo" }, { value: "slant-right", label: "Skos w prawo" }, { value: "diamond", label: "Diament" }, { value: "hexagon", label: "Sześciokąt" }, { value: "circle", label: "Koło" }, { value: "ellipse", label: "Elipsa" }, { value: "ticket", label: "Bilet" }, { value: "arch", label: "Łuk" }]} /><div className="grid grid-cols-2 gap-2"><SelectField label="DZIELNIK GÓRA" value={style.shapeDividerTop ?? "none"} onChange={(shapeDividerTop) => set({ shapeDividerTop })} options={[{ value: "none", label: "Brak" }, { value: "slant", label: "Skos" }, { value: "wave", label: "Fala" }, { value: "zigzag", label: "Zygzak" }, { value: "curve", label: "Krzywa" }]} /><SelectField label="DZIELNIK DÓŁ" value={style.shapeDividerBottom ?? "none"} onChange={(shapeDividerBottom) => set({ shapeDividerBottom })} options={[{ value: "none", label: "Brak" }, { value: "slant", label: "Skos" }, { value: "wave", label: "Fala" }, { value: "zigzag", label: "Zygzak" }, { value: "curve", label: "Krzywa" }]} /></div><ColorPicker label="KOLOR DZIELNIKA" value={style.shapeDividerColor ?? ""} onChange={(shapeDividerColor) => set({ shapeDividerColor })} /><RangeField label="WYSOKOŚĆ DZIELNIKA" value={style.shapeDividerHeight ?? 48} min={4} max={240} suffix="px" onChange={(shapeDividerHeight) => set({ shapeDividerHeight })} /></PanelSection>
    <PanelSection title="Responsywność"><div className="grid gap-2 text-[11px] text-ink-grey">{([['mobile','Ukryj na telefonie'],['tablet','Ukryj na tablecie'],['desktop','Ukryj na komputerze']] as const).map(([key,label]) => <label key={key} className="flex items-center gap-2"><input type="checkbox" checked={Boolean(style.hiddenOn?.[key])} onChange={(event) => set({ hiddenOn: { ...style.hiddenOn, [key]: event.target.checked } })} />{label}</label>)}</div></PanelSection>
    <PanelSection title="Identyfikacja CSS"><TextField label="IDENTYFIKATOR CSS" value={style.anchorId ?? ""} onChange={(anchorId) => set({ anchorId })} placeholder="np. kontakt" /><TextField label="KLASY CSS" value={style.cssClass ?? ""} onChange={(cssClass) => set({ cssClass })} placeholder="np. moja-sekcja" /></PanelSection>
    <PanelSection title="Własny CSS"><TextareaField label="DEKLARACJE CSS" value={style.customCss ?? ""} onChange={(customCss) => set({ customCss })} rows={10} placeholder="np. isolation: isolate; transform-style: preserve-3d;" /><p className="border-l-2 border-ink-gold/70 bg-ink-gold/5 px-2.5 py-2 text-[10px] leading-relaxed text-ink-grey">Dostępne są bezpieczne deklaracje CSS i zmienne własne. Skrypty, importy, zewnętrzne adresy i pozycja fixed są blokowane.</p></PanelSection>
  </div>;
}

function renderFields(
  module: Module,
  onChange: (data: Record<string, unknown>) => void,
  portfolioItems: PortfolioWork[],
  globalContact?: { address: string; phone: string; email: string; hours: string },
) {
  switch (module.type) {
    case "siteHeader": {
      const d = withDefaults("siteHeader", module.data);
      return <>
        <FieldGroup title="MARKA"><ImageUploadField label="Logo" value={d.logoUrl} onChange={(logoUrl) => onChange({ ...d, logoUrl })} /><TextField label="Opis logo" value={d.logoAlt} onChange={(logoAlt) => onChange({ ...d, logoAlt })} /><TextField label="Nazwa awaryjna" value={d.brandName} onChange={(brandName) => onChange({ ...d, brandName })} /></FieldGroup>
        <FieldGroup title="PRZYCISKI"><TextField label="Konto klienta" value={d.clientAreaLabel} onChange={(clientAreaLabel) => onChange({ ...d, clientAreaLabel })} /><TextField label="Link konta" value={d.clientAreaHref} onChange={(clientAreaHref) => onChange({ ...d, clientAreaHref })} /><TextField label="Rezerwacja" value={d.bookLabel} onChange={(bookLabel) => onChange({ ...d, bookLabel })} /><TextField label="Link rezerwacji" value={d.bookHref} onChange={(bookHref) => onChange({ ...d, bookHref })} /></FieldGroup>
        <FieldGroup title="MENU">{d.navItems.map((item, index) => <div key={item.id || index} className="grid grid-cols-[1fr_1fr_auto] gap-1.5"><TextField label="Nazwa" value={item.label} onChange={(label) => onChange({ ...d, navItems: d.navItems.map((current, itemIndex) => itemIndex === index ? { ...current, label } : current) })} /><TextField label="Link" value={item.href} onChange={(href) => onChange({ ...d, navItems: d.navItems.map((current, itemIndex) => itemIndex === index ? { ...current, href } : current) })} /><button type="button" aria-label={`Usuń ${item.label}`} onClick={() => onChange({ ...d, navItems: d.navItems.filter((_, itemIndex) => itemIndex !== index) })} className="mt-5 h-8 w-8 border border-red-400/35 text-red-300">×</button></div>)}<button type="button" onClick={() => onChange({ ...d, navItems: [...d.navItems, { id: crypto.randomUUID(), label: "NOWA POZYCJA", href: "#" }] })} className="border border-ink-gold/50 px-3 py-2 text-[10px] text-ink-gold">+ DODAJ POZYCJĘ</button></FieldGroup>
      </>;
    }
    case "siteFooter": {
      const d = withDefaults("siteFooter", module.data);
      return <>
        <FieldGroup title="MARKA"><ImageUploadField label="Logo" value={d.logoUrl} onChange={(logoUrl) => onChange({ ...d, logoUrl })} /><TextField label="Opis logo" value={d.logoAlt} onChange={(logoAlt) => onChange({ ...d, logoAlt })} /><TextField label="Nazwa awaryjna" value={d.brandName} onChange={(brandName) => onChange({ ...d, brandName })} /></FieldGroup>
        <TextareaField label="Tekst stopki" value={d.text} onChange={(text) => onChange({ ...d, text })} rows={3} />
        <TextField label="Polityka prywatności" value={d.privacyLabel} onChange={(privacyLabel) => onChange({ ...d, privacyLabel })} /><TextField label="Link polityki" value={d.privacyHref} onChange={(privacyHref) => onChange({ ...d, privacyHref })} />
        <FieldGroup title="MENU">{d.navItems.map((item, index) => <div key={item.id || index} className="grid grid-cols-[1fr_1fr_auto] gap-1.5"><TextField label="Nazwa" value={item.label} onChange={(label) => onChange({ ...d, navItems: d.navItems.map((current, itemIndex) => itemIndex === index ? { ...current, label } : current) })} /><TextField label="Link" value={item.href} onChange={(href) => onChange({ ...d, navItems: d.navItems.map((current, itemIndex) => itemIndex === index ? { ...current, href } : current) })} /><button type="button" aria-label={`Usuń ${item.label}`} onClick={() => onChange({ ...d, navItems: d.navItems.filter((_, itemIndex) => itemIndex !== index) })} className="mt-5 h-8 w-8 border border-red-400/35 text-red-300">×</button></div>)}<button type="button" onClick={() => onChange({ ...d, navItems: [...d.navItems, { id: crypto.randomUUID(), label: "NOWA POZYCJA", href: "#" }] })} className="border border-ink-gold/50 px-3 py-2 text-[10px] text-ink-gold">+ DODAJ POZYCJĘ</button></FieldGroup>
      </>;
    }
    case "maintenance": {
      const d = withDefaults("maintenance", module.data);
      return <><TextField label="Nazwa studia" value={d.brandLabel} onChange={(brandLabel) => onChange({ ...d, brandLabel })} /><TextField label="Nadpis" value={d.statusLabel} onChange={(statusLabel) => onChange({ ...d, statusLabel })} /><TextField label="Nagłówek — linia 1" value={d.headingLine1} onChange={(headingLine1) => onChange({ ...d, headingLine1 })} /><TextField label="Nagłówek — linia 2" value={d.headingLine2} onChange={(headingLine2) => onChange({ ...d, headingLine2 })} /><TextareaField label="Wiadomość" value={d.message} onChange={(message) => onChange({ ...d, message })} rows={4} /><TextField label="Znak na dole" value={d.mark} onChange={(mark) => onChange({ ...d, mark })} /></>;
    }
    case "hero": {
      const d = withDefaults("hero", module.data);
      return (
        <>
          <TextField label="Nadpis (eyebrow)" value={d.eyebrow} onChange={(v) => onChange({ ...d, eyebrow: v })} />
          <TextField label="Nagłówek — linia 1" value={d.heading1} onChange={(v) => onChange({ ...d, heading1: v })} />
          <TextField label="Nagłówek — linia 2" value={d.heading2} onChange={(v) => onChange({ ...d, heading2: v })} />
          <TextareaField label="Opis" value={d.body} onChange={(v) => onChange({ ...d, body: v })} rows={4} />
          <TextField label="Etykieta głównego przycisku" value={d.primaryBtnLabel} onChange={(v) => onChange({ ...d, primaryBtnLabel: v })} />
          <TextField label="Link głównego przycisku" value={d.primaryBtnHref} onChange={(v) => onChange({ ...d, primaryBtnHref: v })} placeholder="#kalendarz lub /kontakt" />
          <TextField label="Etykieta przycisku wideo" value={d.secondaryBtnLabel} onChange={(v) => onChange({ ...d, secondaryBtnLabel: v })} />
          <TextField label="Link przycisku wideo" value={d.secondaryBtnHref} onChange={(v) => onChange({ ...d, secondaryBtnHref: v })} placeholder="Link do filmu lub sekcji" />
          <FieldGroup title="ZDJĘCIA HERO">
            <ImageUploadField label="Tekstura / zdjęcie tła" value={d.backgroundImage} onChange={(v) => onChange({ ...d, backgroundImage: v })} />
            <ImageUploadField label="Portret po prawej" value={d.portraitImage} onChange={(v) => onChange({ ...d, portraitImage: v })} />
            <TextField label="Opis portretu dla dostępności" value={d.portraitAlt} onChange={(v) => onChange({ ...d, portraitAlt: v })} />
          </FieldGroup>
          <FieldGroup title="OKRĄGŁA PIECZĘĆ (PUSTE POLA UKRYWAJĄ CAŁOŚĆ)">
            <TextField label="Tekst na okręgu" value={d.stampRingText} onChange={(v) => onChange({ ...d, stampRingText: v })} />
            <div className="grid grid-cols-3 gap-2">
              <TextField label="Lewy tekst" value={d.stampLeftText} onChange={(v) => onChange({ ...d, stampLeftText: v })} />
              <TextField label="Środek" value={d.stampCenterText} onChange={(v) => onChange({ ...d, stampCenterText: v })} />
              <TextField label="Prawy tekst" value={d.stampRightText} onChange={(v) => onChange({ ...d, stampRightText: v })} />
            </div>
          </FieldGroup>
          <FieldGroup title="SOCIAL MEDIA">
            <TextField label="Instagram" value={d.instagramUrl} onChange={(instagramUrl) => onChange({ ...d, instagramUrl })} placeholder="https://instagram.com/..." />
            <TextField label="Facebook" value={d.facebookUrl} onChange={(facebookUrl) => onChange({ ...d, facebookUrl })} placeholder="https://facebook.com/..." />
          </FieldGroup>
        </>
      );
    }
    case "about": {
      const d = withDefaults("about", module.data);
      return (
        <>
          <TextField label="Nadpis (eyebrow)" value={d.eyebrow} onChange={(v) => onChange({ ...d, eyebrow: v })} />
          <TextField label="Nagłówek — linia 1" value={d.heading1} onChange={(v) => onChange({ ...d, heading1: v })} />
          <TextField label="Nagłówek — linia 2" value={d.heading2} onChange={(v) => onChange({ ...d, heading2: v })} />
          <TextareaField label="Tekst / historia" value={d.body} onChange={(v) => onChange({ ...d, body: v })} rows={6} />
          <TextField label="Podpis — imię" value={d.signatureName} onChange={(v) => onChange({ ...d, signatureName: v })} />
          <TextField label="Podpis — rola" value={d.signatureRole} onChange={(v) => onChange({ ...d, signatureRole: v })} />
          <FieldGroup title="KOLAŻ ZDJĘĆ">
            <ImageUploadField label="Duże zdjęcie" value={d.mainImage} onChange={(v) => onChange({ ...d, mainImage: v })} />
            <TextField label="Opis dużego zdjęcia" value={d.mainImageAlt} onChange={(v) => onChange({ ...d, mainImageAlt: v })} />
            <ImageUploadField label="Małe zdjęcie 1" value={d.detailImage1} onChange={(v) => onChange({ ...d, detailImage1: v })} />
            <TextField label="Opis małego zdjęcia 1" value={d.detailImage1Alt} onChange={(v) => onChange({ ...d, detailImage1Alt: v })} />
            <ImageUploadField label="Małe zdjęcie 2" value={d.detailImage2} onChange={(v) => onChange({ ...d, detailImage2: v })} />
            <TextField label="Opis małego zdjęcia 2" value={d.detailImage2Alt} onChange={(v) => onChange({ ...d, detailImage2Alt: v })} />
            <ImageUploadField label="Małe zdjęcie 3" value={d.detailImage3} onChange={(v) => onChange({ ...d, detailImage3: v })} />
            <TextField label="Opis małego zdjęcia 3" value={d.detailImage3Alt} onChange={(v) => onChange({ ...d, detailImage3Alt: v })} />
          </FieldGroup>
        </>
      );
    }
    case "stats": {
      const d = withDefaults("stats", module.data);
      const items = Array.from({ length: 4 }, (_, index) => d.items[index] || { value: "", label: "" });
      return <><p className="text-[12px] leading-relaxed text-ink-grey">Wpisz własne liczby i opisy. Układ oraz ikony zachowają styl strony.</p><FieldGroup title="STATYSTYKI">{items.map((item, index) => <div key={index} className="grid grid-cols-3 gap-2"><TextField label={`Liczba ${index + 1}`} value={item.value} onChange={(v) => onChange({ ...d, items: items.map((current, i) => i === index ? { ...current, value: v } : current) })} /><div className="col-span-2"><TextField label={`Opis ${index + 1}`} value={item.label} onChange={(v) => onChange({ ...d, items: items.map((current, i) => i === index ? { ...current, label: v } : current) })} /></div></div>)}</FieldGroup></>;
    }
    case "ctaBar": {
      const d = withDefaults("ctaBar", module.data);
      return (
        <>
          <TextField label="Tytuł — linia 1" value={d.title1} onChange={(v) => onChange({ ...d, title1: v })} />
          <TextField label="Tytuł — linia 2" value={d.title2} onChange={(v) => onChange({ ...d, title2: v })} />
          <TextareaField label="Wiadomość" value={d.message} onChange={(v) => onChange({ ...d, message: v })} rows={2} />
          <TextField label="Etykieta przycisku" value={d.buttonLabel} onChange={(v) => onChange({ ...d, buttonLabel: v })} />
          <TextField label="Link przycisku" value={d.href} onChange={(v) => onChange({ ...d, href: v })} placeholder="#contact lub /kontakt" />
        </>
      );
    }
    case "portfolio": {
      const d = withDefaults("portfolio", module.data);
      const selectedIds: string[] = Array.isArray(d.selectedIds) ? d.selectedIds : [];
      return (
        <>
          <TextField label="Nadpis (eyebrow)" value={d.eyebrow} onChange={(v) => onChange({ ...d, eyebrow: v })} />
          <TextField label="Nagłówek — linia 1" value={d.heading1} onChange={(v) => onChange({ ...d, heading1: v })} />
          <TextField label="Nagłówek — linia 2" value={d.heading2} onChange={(v) => onChange({ ...d, heading2: v })} />
          <TextareaField label="Opis" value={d.body} onChange={(v) => onChange({ ...d, body: v })} rows={3} />
          <TextField label="Etykieta głównego przycisku" value={d.primaryBtnLabel} onChange={(v) => onChange({ ...d, primaryBtnLabel: v })} />
          <TextField label="Link głównego przycisku" value={d.primaryBtnHref} onChange={(v) => onChange({ ...d, primaryBtnHref: v })} />
          <TextField label="Etykieta przycisku wideo" value={d.secondaryBtnLabel} onChange={(v) => onChange({ ...d, secondaryBtnLabel: v })} />
          <TextField label="Link przycisku wideo" value={d.secondaryBtnHref} onChange={(v) => onChange({ ...d, secondaryBtnHref: v })} />
          <TextField label="Komunikat, gdy portfolio jest puste" value={d.emptyMessage} onChange={(v) => onChange({ ...d, emptyMessage: v })} />
          <SelectField
            label="Wybór zdjęć"
            value={d.selectionMode}
            onChange={(v) => onChange({ ...d, selectionMode: v })}
            options={[
              { value: "all", label: "Wszystkie opublikowane" },
              { value: "selected", label: "Wybrane ręcznie" },
            ]}
          />
          {d.selectionMode === "selected" && (
            <FieldGroup title="WYBIERZ ZDJĘCIA">
              {portfolioItems.length === 0 ? (
                <p className="text-[12px] text-ink-grey">
                  Brak zdjęć w portfolio — dodaj je w /admin/portfolio.
                </p>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {portfolioItems.map((item) => {
                    const active = selectedIds.includes(item.id);
                    const source = imageSource(item.src);
                    if (!source) return null;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          const next = active
                            ? selectedIds.filter((id) => id !== item.id)
                            : [...selectedIds, item.id];
                          onChange({ ...d, selectedIds: next });
                        }}
                        className={`relative aspect-square overflow-hidden border-2 transition-colors ${
                          active ? "border-ink-gold" : "border-transparent hover:border-ink-white/30"
                        }`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={source} alt={item.alt} className="h-full w-full object-cover" />
                      </button>
                    );
                  })}
                </div>
              )}
            </FieldGroup>
          )}
        </>
      );
    }
    case "studio": {
      const d = withDefaults("studio", module.data);
      return (
        <>
          <ImageUploadField label="Zdjęcie studia" value={d.image} onChange={(v) => onChange({ ...d, image: v })} />
          <TextField label="Opis zdjęcia dla dostępności" value={d.imageAlt} onChange={(v) => onChange({ ...d, imageAlt: v })} />
          <TextField label="Nadpis (eyebrow)" value={d.eyebrow} onChange={(v) => onChange({ ...d, eyebrow: v })} />
          <TextField label="Nagłówek — linia 1" value={d.heading1} onChange={(v) => onChange({ ...d, heading1: v })} />
          <TextField label="Nagłówek — linia 2" value={d.heading2} onChange={(v) => onChange({ ...d, heading2: v })} />
          <TextareaField label="Opis" value={d.body} onChange={(v) => onChange({ ...d, body: v })} rows={4} />
          <TextField label="Etykieta głównego przycisku" value={d.primaryBtnLabel} onChange={(v) => onChange({ ...d, primaryBtnLabel: v })} />
          <TextField label="Link głównego przycisku" value={d.primaryBtnHref} onChange={(v) => onChange({ ...d, primaryBtnHref: v })} />
          <TextField label="Etykieta przycisku wideo" value={d.secondaryBtnLabel} onChange={(v) => onChange({ ...d, secondaryBtnLabel: v })} />
          <TextField label="Link przycisku wideo" value={d.secondaryBtnHref} onChange={(v) => onChange({ ...d, secondaryBtnHref: v })} />
          <FieldGroup title="BANER CTA (na dole sekcji)">
            <TextField label="Tytuł — linia 1" value={d.ctaTitle1} onChange={(v) => onChange({ ...d, ctaTitle1: v })} />
            <TextField label="Tytuł — linia 2" value={d.ctaTitle2} onChange={(v) => onChange({ ...d, ctaTitle2: v })} />
            <TextareaField label="Wiadomość" value={d.ctaMessage} onChange={(v) => onChange({ ...d, ctaMessage: v })} rows={2} />
            <TextField label="Etykieta przycisku" value={d.ctaButtonLabel} onChange={(v) => onChange({ ...d, ctaButtonLabel: v })} />
            <TextField label="Link przycisku" value={d.ctaButtonHref} onChange={(v) => onChange({ ...d, ctaButtonHref: v })} />
          </FieldGroup>
        </>
      );
    }
    case "contact": {
      const stored = withDefaults("contact", module.data);
      const d = stored.contactSource === "global" && globalContact ? { ...stored, ...globalContact } : stored;
      const setContact = (patch: Partial<typeof d>) => onChange({ ...d, contactSource: "module", ...patch });
      return (
        <>
          <TextField label="Nadpis (eyebrow)" value={d.eyebrow} onChange={(v) => onChange({ ...d, eyebrow: v })} />
          <TextField label="Nagłówek — linia 1" value={d.heading1} onChange={(v) => onChange({ ...d, heading1: v })} />
          <TextField label="Nagłówek — linia 2" value={d.heading2} onChange={(v) => onChange({ ...d, heading2: v })} />
          <TextareaField label="Opis" value={d.body} onChange={(v) => onChange({ ...d, body: v })} rows={3} />
          <FieldGroup title="DANE KONTAKTOWE">
            <p className="text-[10px] leading-relaxed text-ink-grey">Te dane zapisują się w tym module i zmieniają się od razu w podglądzie.</p>
            <TextField label="Adres" value={d.address} onChange={(address) => setContact({ address })} />
            <TextField label="Telefon" value={d.phone} onChange={(phone) => setContact({ phone })} />
            <TextField label="Email" value={d.email} onChange={(email) => setContact({ email })} />
            <TextField label="Godziny otwarcia" value={d.hours} onChange={(hours) => setContact({ hours })} />
            <TextField label="Etykieta adresu" value={d.addressLabel} onChange={(v) => onChange({ ...d, addressLabel: v })} />
            <TextField label="Etykieta telefonu" value={d.phoneLabel} onChange={(v) => onChange({ ...d, phoneLabel: v })} />
            <TextField label="Etykieta e-maila" value={d.emailLabel} onChange={(v) => onChange({ ...d, emailLabel: v })} />
            <TextField label="Etykieta godzin" value={d.hoursLabel} onChange={(v) => onChange({ ...d, hoursLabel: v })} />
          </FieldGroup>
          <FieldGroup title="KALENDARZ REZERWACJI">
            <TextField label="Nadpis kalendarza" value={d.booking.eyebrow} onChange={(v) => onChange({ ...d, booking: { ...d.booking, eyebrow: v } })} />
            <TextField label="Nagłówek kalendarza" value={d.booking.heading} onChange={(v) => onChange({ ...d, booking: { ...d.booking, heading: v } })} />
            <TextareaField label="Opis kalendarza" value={d.booking.body} onChange={(v) => onChange({ ...d, booking: { ...d.booking, body: v } })} rows={2} />
            <TextField label="Nazwa kalendarza" value={d.booking.calendarLabel} onChange={(v) => onChange({ ...d, booking: { ...d.booking, calendarLabel: v } })} />
            <TextareaField label="Objaśnienie kolorów" value={d.booking.legend} onChange={(v) => onChange({ ...d, booking: { ...d.booking, legend: v } })} rows={2} />
            <TextField label="Tekst przy wolnym terminie" value={d.booking.freeLabel} onChange={(v) => onChange({ ...d, booking: { ...d.booking, freeLabel: v } })} />
            <TextField label="Tekst przy konsultacji" value={d.booking.consultationLabel} onChange={(v) => onChange({ ...d, booking: { ...d.booking, consultationLabel: v } })} />
            <TextField label="Przycisk rezerwacji" value={d.booking.bookingButtonLabel} onChange={(v) => onChange({ ...d, booking: { ...d.booking, bookingButtonLabel: v } })} />
            <TextField label="Przycisk konsultacji" value={d.booking.consultationButtonLabel} onChange={(v) => onChange({ ...d, booking: { ...d.booking, consultationButtonLabel: v } })} />
          </FieldGroup>
        </>
      );
    }
    case "booking": {
      const d = withDefaults("booking", module.data);
      return <>
        <TextField label="Nadpis" value={d.eyebrow} onChange={(v) => onChange({ ...d, eyebrow: v })} />
        <TextField label="Nagłówek" value={d.heading} onChange={(v) => onChange({ ...d, heading: v })} />
        <TextareaField label="Opis" value={d.body} onChange={(v) => onChange({ ...d, body: v })} rows={3} />
        <FieldGroup title="TEKSTY KALENDARZA">
          <TextField label="Nazwa kalendarza" value={d.calendarLabel} onChange={(v) => onChange({ ...d, calendarLabel: v })} />
          <TextareaField label="Objaśnienie kolorów" value={d.legend} onChange={(v) => onChange({ ...d, legend: v })} rows={3} />
          <TextField label="Etykieta wolnego terminu" value={d.freeLabel} onChange={(v) => onChange({ ...d, freeLabel: v })} />
          <TextField label="Etykieta konsultacji" value={d.consultationLabel} onChange={(v) => onChange({ ...d, consultationLabel: v })} />
          <TextField label="Etykieta niedostępnego dnia" value={d.unavailableLabel} onChange={(v) => onChange({ ...d, unavailableLabel: v })} />
          <TextareaField label="Komunikat o braku terminu" value={d.unavailableMessage} onChange={(v) => onChange({ ...d, unavailableMessage: v })} rows={2} />
          <TextareaField label="Komunikat o częściowo zajętym terminie" value={d.partiallyBookedMessage} onChange={(v) => onChange({ ...d, partiallyBookedMessage: v })} rows={3} />
          <TextField label="Etykieta wyboru projektu" value={d.addToProjectLabel} onChange={(v) => onChange({ ...d, addToProjectLabel: v })} />
          <TextField label="Opcja nowej wizyty" value={d.newVisitLabel} onChange={(v) => onChange({ ...d, newVisitLabel: v })} />
          <TextField label="Przycisk propozycji terminu" value={d.proposeButtonLabel} onChange={(v) => onChange({ ...d, proposeButtonLabel: v })} />
          <TextField label="Przycisk rezerwacji" value={d.bookingButtonLabel} onChange={(v) => onChange({ ...d, bookingButtonLabel: v })} />
          <TextField label="Przycisk konsultacji" value={d.consultationButtonLabel} onChange={(v) => onChange({ ...d, consultationButtonLabel: v })} />
          <TextField label="Domyślna etykieta wydarzenia" value={d.eventFallbackLabel} onChange={(v) => onChange({ ...d, eventFallbackLabel: v })} />
          <TextField label="Domyślna etykieta promocji" value={d.promotionFallbackLabel} onChange={(v) => onChange({ ...d, promotionFallbackLabel: v })} />
        </FieldGroup>
      </>;
    }
    case "textSection": {
      const d = withDefaults("textSection", module.data);
      return (
        <>
          <TextField label="Nadpis (eyebrow)" value={d.eyebrow} onChange={(v) => onChange({ ...d, eyebrow: v })} />
          <TextField label="Nagłówek — linia 1" value={d.heading1} onChange={(v) => onChange({ ...d, heading1: v })} />
          <TextField label="Nagłówek — linia 2" value={d.heading2} onChange={(v) => onChange({ ...d, heading2: v })} />
          <TextareaField label="Treść" value={d.body} onChange={(v) => onChange({ ...d, body: v })} rows={6} />
          <SelectField
            label="Wyrównanie"
            value={d.alignment}
            onChange={(v) => onChange({ ...d, alignment: v })}
            options={[
              { value: "left", label: "Do lewej" },
              { value: "center", label: "Wyśrodkowane" },
            ]}
          />
        </>
      );
    }
    case "imageText": {
      const d = withDefaults("imageText", module.data);
      return (
        <>
          <ImageUploadField label="Obraz" value={d.image} onChange={(v) => onChange({ ...d, image: v })} />
          <TextField label="Opis obrazu dla dostępności" value={d.imageAlt} onChange={(v) => onChange({ ...d, imageAlt: v })} />
          <TextField label="Komunikat przy braku obrazu" value={d.emptyMessage} onChange={(v) => onChange({ ...d, emptyMessage: v })} />
          <TextField label="Nagłówek — linia 1" value={d.heading1} onChange={(v) => onChange({ ...d, heading1: v })} />
          <TextField label="Nagłówek — linia 2" value={d.heading2} onChange={(v) => onChange({ ...d, heading2: v })} />
          <TextareaField label="Treść" value={d.body} onChange={(v) => onChange({ ...d, body: v })} rows={5} />
          <TextField label="Etykieta przycisku (opcjonalnie)" value={d.buttonLabel} onChange={(v) => onChange({ ...d, buttonLabel: v })} />
          <TextField label="Link przycisku" value={d.buttonUrl} onChange={(v) => onChange({ ...d, buttonUrl: v })} placeholder="/kontakt" />
          <SelectField
            label="Pozycja obrazu"
            value={d.imagePosition}
            onChange={(v) => onChange({ ...d, imagePosition: v })}
            options={[
              { value: "left", label: "Po lewej" },
              { value: "right", label: "Po prawej" },
            ]}
          />
        </>
      );
    }
    case "spacer": {
      const d = withDefaults("spacer", module.data);
      return (
        <SelectField
          label="Rozmiar odstępu"
          value={d.size}
          onChange={(v) => onChange({ ...d, size: v })}
          options={[
            { value: "sm", label: "Mały" },
            { value: "md", label: "Średni" },
            { value: "lg", label: "Duży" },
          ]}
        />
      );
    }
    case "heading": {
      const d = withDefaults("heading", module.data);
      return <>
        <TextField label="Treść nagłówka" value={d.text} onChange={(v) => onChange({ ...d, text: v })} />
        <IconPicker label="IKONA NAD NAGŁÓWKIEM" value={d.icon || ""} onChange={(v) => onChange({ ...d, icon: v })} />
        <SelectField label="Rozmiar / poziom" value={d.level} onChange={(v) => onChange({ ...d, level: v })} options={[{ value: "h1", label: "Duży (H1)" }, { value: "h2", label: "Średni (H2)" }, { value: "h3", label: "Mały (H3)" }]} />
        <SelectField label="Wyrównanie" value={d.alignment} onChange={(v) => onChange({ ...d, alignment: v })} options={[{ value: "left", label: "Do lewej" }, { value: "center", label: "Wyśrodkowane" }]} />
      </>;
    }
    case "text": {
      const d = withDefaults("text", module.data);
      return <>
        <TextareaField label="Treść" value={d.text} onChange={(v) => onChange({ ...d, text: v })} rows={8} />
        <SelectField label="Wyrównanie" value={d.alignment} onChange={(v) => onChange({ ...d, alignment: v })} options={[{ value: "left", label: "Do lewej" }, { value: "center", label: "Wyśrodkowane" }]} />
      </>;
    }
    case "image": {
      const d = withDefaults("image", module.data);
      return <>
        <ImageUploadField label="Zdjęcie" value={d.image} onChange={(v) => onChange({ ...d, image: v })} />
        <TextField label="Opis alternatywny (dla dostępności i Google)" value={d.alt} onChange={(v) => onChange({ ...d, alt: v })} placeholder="Np. tatuaż realistyczny na przedramieniu" />
        <TextField label="Podpis pod zdjęciem (opcjonalnie)" value={d.caption} onChange={(v) => onChange({ ...d, caption: v })} />
        <div className="grid grid-cols-2 gap-2"><SelectField label="PROPORCJE" value={d.aspect ?? "landscape"} onChange={(aspect) => onChange({ ...d, aspect })} options={[{ value: "landscape", label: "16:9" }, { value: "wide", label: "Szerokie 5:2" }, { value: "square", label: "Kwadrat" }, { value: "portrait", label: "Portret 4:5" }]} /><SelectField label="DOPASOWANIE" value={d.fit ?? "cover"} onChange={(fit) => onChange({ ...d, fit })} options={[{ value: "cover", label: "Wypełnij" }, { value: "contain", label: "Pokaż całe" }]} /><SelectField label="PUNKT KADROWANIA" value={d.objectPosition ?? "center"} onChange={(objectPosition) => onChange({ ...d, objectPosition })} options={[{ value: "center", label: "Środek" }, { value: "top", label: "Góra" }, { value: "bottom", label: "Dół" }, { value: "left", label: "Lewo" }, { value: "right", label: "Prawo" }]} /><SelectField label="EFEKT NAJECHANIA" value={d.hoverEffect ?? "none"} onChange={(hoverEffect) => onChange({ ...d, hoverEffect })} options={[{ value: "none", label: "Brak" }, { value: "zoom", label: "Powiększenie" }, { value: "lift", label: "Uniesienie" }, { value: "grayscale", label: "Kolor z szarości" }, { value: "reveal", label: "Filmowe odsłonięcie" }]} /></div>
        <div className="grid grid-cols-[1fr_110px] gap-2"><TextField label="LINK PO KLIKNIĘCIU (OPCJONALNIE)" value={d.link ?? ""} onChange={(link) => onChange({ ...d, link })} placeholder="/portfolio lub https://…" /><SelectField label="OTWÓRZ" value={d.linkTarget ?? "same"} onChange={(linkTarget) => onChange({ ...d, linkTarget })} options={[{ value: "same", label: "Tutaj" }, { value: "new", label: "Nowa karta" }]} /></div>
        <div className="grid grid-cols-2 gap-2"><NumberField label="MAKS. SZEROKOŚĆ (PX)" value={d.maxWidth ?? 0} min={0} max={1600} onChange={(maxWidth) => onChange({ ...d, maxWidth })} /><SelectField label="WYRÓWNANIE" value={d.alignment ?? "left"} onChange={(alignment) => onChange({ ...d, alignment })} options={[{ value: "left", label: "Do lewej" }, { value: "center", label: "Do środka" }, { value: "right", label: "Do prawej" }]} /></div>
      </>;
    }
    case "button": {
      const d = withDefaults("button", module.data);
      return <>
        <TextField label="Tekst przycisku" value={d.label} onChange={(v) => onChange({ ...d, label: v })} />
        <TextField label="Dokąd prowadzi" value={d.href} onChange={(v) => onChange({ ...d, href: v })} placeholder="/kontakt lub #kontakt" />
        <IconPicker label="IKONA PRZYCISKU" value={d.icon} onChange={(icon) => onChange({ ...d, icon })} />
        <SelectField label="Pozycja ikony" value={d.iconPosition ?? "left"} onChange={(iconPosition) => onChange({ ...d, iconPosition })} options={[{ value: "left", label: "Po lewej" }, { value: "right", label: "Po prawej" }]} />
        <SelectField label="Styl" value={d.style} onChange={(v) => onChange({ ...d, style: v })} options={[{ value: "primary", label: "Złote wypełnienie" }, { value: "outline", label: "Złoty obrys" }]} />
        <div className="grid grid-cols-3 gap-2"><SelectField label="ROZMIAR" value={d.size ?? "md"} onChange={(size) => onChange({ ...d, size })} options={[{ value: "sm", label: "Mały" }, { value: "md", label: "Średni" }, { value: "lg", label: "Duży" }]} /><SelectField label="NAROŻNIKI" value={d.radius ?? "none"} onChange={(radius) => onChange({ ...d, radius })} options={[{ value: "none", label: "Proste" }, { value: "sm", label: "Miękkie" }, { value: "pill", label: "Pigułka" }]} /><SelectField label="OTWÓRZ" value={d.target ?? "same"} onChange={(target) => onChange({ ...d, target })} options={[{ value: "same", label: "Tutaj" }, { value: "new", label: "Nowa karta" }]} /></div>
        <SelectField label="Wyrównanie" value={d.alignment} onChange={(v) => onChange({ ...d, alignment: v })} options={[{ value: "left", label: "Do lewej" }, { value: "center", label: "Wyśrodkowane" }, { value: "right", label: "Do prawej" }]} />
        <SelectField label="Szerokość" value={d.width ?? "auto"} onChange={(width) => onChange({ ...d, width })} options={[{ value: "auto", label: "Dopasowana" }, { value: "full", label: "Pełna szerokość" }]} />
      </>;
    }
    case "navigation": {
      const d = withDefaults("navigation", module.data);
      return <>
        <div className="grid grid-cols-2 gap-2"><SelectField label="WYRÓWNANIE" value={d.alignment} onChange={(alignment) => onChange({ ...d, alignment })} options={[{ value: "left", label: "Do lewej" }, { value: "center", label: "Do środka" }, { value: "right", label: "Do prawej" }]} /><SelectField label="STYL" value={d.style} onChange={(style) => onChange({ ...d, style })} options={[{ value: "plain", label: "Minimalny" }, { value: "pills", label: "Przyciski" }]} /></div>
        <TextField label="NAZWA MENU NA TELEFONIE" value={d.mobileLabel} onChange={(mobileLabel) => onChange({ ...d, mobileLabel })} />
        <FieldGroup title="POZYCJE MENU" defaultOpen>{d.items.map((item, index) => <div key={item.id || index} className="grid grid-cols-[1fr_1fr_auto] gap-1.5"><TextField label="Nazwa" value={item.label} onChange={(label) => onChange({ ...d, items: d.items.map((current, itemIndex) => itemIndex === index ? { ...current, label } : current) })} /><TextField label="Link" value={item.href} onChange={(href) => onChange({ ...d, items: d.items.map((current, itemIndex) => itemIndex === index ? { ...current, href } : current) })} /><button type="button" aria-label={`Usuń ${item.label}`} onClick={() => onChange({ ...d, items: d.items.filter((_, itemIndex) => itemIndex !== index) })} className="mt-5 h-8 w-8 border border-red-400/35 text-red-300">×</button></div>)}<button type="button" onClick={() => onChange({ ...d, items: [...d.items, { id: crypto.randomUUID(), label: "NOWA POZYCJA", href: "#" }] })} className="border border-ink-gold/50 px-3 py-2 text-[10px] text-ink-gold">+ DODAJ POZYCJĘ</button></FieldGroup>
      </>;
    }
    case "divider": {
      const d = withDefaults("divider", module.data);
      return <><SelectField label="Rodzaj separatora" value={d.style} onChange={(v) => onChange({ ...d, style: v })} options={[{ value: "line", label: "Delikatna linia" }, { value: "gold", label: "Złota linia" }, { value: "space", label: "Sam odstęp" }]} /><div className="grid grid-cols-3 gap-2"><RangeField label="SZEROKOŚĆ" value={d.width ?? 100} min={5} max={100} suffix="%" onChange={(width) => onChange({ ...d, width })} /><NumberField label="GRUBOŚĆ" value={d.thickness ?? 1} min={1} max={30} onChange={(thickness) => onChange({ ...d, thickness })} /><SelectField label="POZYCJA" value={d.alignment ?? "center"} onChange={(alignment) => onChange({ ...d, alignment })} options={[{ value: "left", label: "Lewo" }, { value: "center", label: "Środek" }, { value: "right", label: "Prawo" }]} /></div><ImageUploadField label="Ikona separatora (SVG / PNG, opcjonalnie)" value={d.icon || ""} onChange={(v) => onChange({ ...d, icon: v })} /></>;
    }
    case "gallery": {
      const d = withDefaults("gallery", module.data);
      return <GalleryEditor value={d} onChange={onChange} />;
    }
    case "columns": {
      const d = withDefaults("columns", module.data);
      const counts = { one: 1, two: 2, three: 3, four: 4 } as const;
      return <>
        <p className="border-l-2 border-ink-gold/70 bg-ink-gold/5 px-3 py-2 text-[10px] leading-relaxed text-ink-grey">Przeciągaj widgety z biblioteki bezpośrednio do kolumn na podglądzie. Kliknij widget w kolumnie, aby edytować jego treść i styl.</p>
        <SelectField label="Liczba kolumn" value={d.layout} onChange={(v) => {
          const nextCount = counts[v];
          const next = Array.from({ length: nextCount }, (_, i) => d.columns[i] ?? []);
          const evenWidth = Math.round((100 / nextCount) * 100) / 100;
          onChange({ ...d, layout: v, columns: next, columnWidths: Array(nextCount).fill(evenWidth), columnStyles: Array.from({ length: nextCount }, (_, index) => d.columnStyles?.[index] ?? {}) });
        }} options={[{ value: "one", label: "1 kolumna" }, { value: "two", label: "2 kolumny" }, { value: "three", label: "3 kolumny" }, { value: "four", label: "4 kolumny" }]} />
        <NumberField label="ODSTĘP MIĘDZY KOLUMNAMI (PX)" value={d.gap ?? 24} min={0} max={160} onChange={(gap) => onChange({ ...d, gap })} />
        <SelectField label="WYRÓWNANIE PIONOWE" value={d.verticalAlign ?? "start"} onChange={(verticalAlign) => onChange({ ...d, verticalAlign })} options={[{ value: "start", label: "Do góry" }, { value: "center", label: "Do środka" }, { value: "end", label: "Do dołu" }, { value: "stretch", label: "Rozciągnij" }]} />
        <SelectField label="UKŁAD NA TELEFONIE" value={d.mobileLayout ?? "stack"} onChange={(mobileLayout) => onChange({ ...d, mobileLayout })} options={[{ value: "stack", label: "Kolumny jedna pod drugą" }, { value: "row", label: "Zachowaj kolumny w wierszu" }]} />
        <SelectField label="Tło całego układu" value={d.background} onChange={(v) => onChange({ ...d, background: v })} options={[{ value: "transparent", label: "Bez tła" }, { value: "charcoal", label: "Ciemne" }, { value: "gold", label: "Złote" }]} />
        <SelectField label="Odstęp góra / dół" value={d.padding} onChange={(v) => onChange({ ...d, padding: v })} options={[{ value: "sm", label: "Mały" }, { value: "md", label: "Średni" }, { value: "lg", label: "Duży" }]} />
      </>;
    }
    case "faq": {
      const d = withDefaults("faq", module.data);
      const updateItem = (index: number, key: "question" | "answer", value: string) => onChange({ ...d, items: d.items.map((item, i) => i === index ? { ...item, [key]: value } : item) });
      return <><TextField label="Nagłówek sekcji" value={d.title} onChange={(v) => onChange({ ...d, title: v })} /><div className="grid grid-cols-2 gap-3"><SelectField label="Wariant wizualny" value={d.variant} onChange={(variant) => onChange({ ...d, variant })} options={[{ value: "lines", label: "Linie" }, { value: "cards", label: "Karty" }, { value: "split", label: "Tytuł z boku" }]} /><SelectField label="Po otwarciu strony" value={d.initiallyOpen} onChange={(initiallyOpen) => onChange({ ...d, initiallyOpen })} options={[{ value: "none", label: "Wszystko zamknięte" }, { value: "first", label: "Pierwsze otwarte" }]} /><SelectField label="IKONA ROZWIJANIA" value={d.iconStyle ?? "plus"} onChange={(iconStyle) => onChange({ ...d, iconStyle })} options={[{ value: "plus", label: "Plus" }, { value: "chevron", label: "Szewron" }, { value: "arrow", label: "Strzałka" }]} /><ToggleField label="WIELE ODPOWIEDZI NARAZ" checked={Boolean(d.allowMultiple)} onChange={(allowMultiple) => onChange({ ...d, allowMultiple })} /></div><FieldGroup title="PYTANIA I ODPOWIEDZI"><div className="flex flex-col gap-4">{d.items.map((item, index) => <div key={index} className="border border-ink-white/10 p-3"><div className="mb-2 flex justify-between"><span className="text-[11px] text-ink-gold">Pytanie {index + 1}</span><button type="button" onClick={() => onChange({ ...d, items: d.items.filter((_, i) => i !== index) })} className="text-[11px] text-red-400">Usuń</button></div><TextField label="Pytanie" value={item.question} onChange={(v) => updateItem(index, "question", v)} /><div className="mt-3"><TextareaField label="Odpowiedź" value={item.answer} rows={3} onChange={(v) => updateItem(index, "answer", v)} /></div></div>)}</div><button type="button" onClick={() => onChange({ ...d, items: [...d.items, { question: "Nowe pytanie", answer: "Wpisz odpowiedź." }] })} className="mt-3 border border-ink-white/20 px-3 py-2 text-[11px] text-ink-grey hover:border-ink-gold hover:text-ink-gold">+ DODAJ PYTANIE</button></FieldGroup></>;
    }
    case "video": { const d = withDefaults("video", module.data); return <><TextField label="Tytuł" value={d.title} onChange={(v) => onChange({ ...d, title: v })} /><TextField label="Link YouTube lub Vimeo" value={d.url} onChange={(v) => onChange({ ...d, url: v })} placeholder="https://www.youtube.com/watch?v=…" /><TextField label="Podpis (opcjonalnie)" value={d.caption} onChange={(v) => onChange({ ...d, caption: v })} /><SelectField label="PROPORCJE" value={d.aspect ?? "video"} onChange={(aspect) => onChange({ ...d, aspect })} options={[{ value: "video", label: "16:9 — standard" }, { value: "cinema", label: "21:9 — kinowe" }, { value: "square", label: "1:1 — kwadrat" }, { value: "portrait", label: "9:16 — pion" }]} /><div className="grid grid-cols-2 gap-2"><ToggleField label="AUTOSTART" description="Działa tylko z wyciszeniem." checked={Boolean(d.autoplay)} onChange={(autoplay) => onChange({ ...d, autoplay, muted: autoplay ? true : d.muted })} /><ToggleField label="WYCISZONE" checked={d.muted !== false} onChange={(muted) => onChange({ ...d, muted, autoplay: muted ? d.autoplay : false })} /><ToggleField label="PĘTLA" checked={Boolean(d.loop)} onChange={(loop) => onChange({ ...d, loop })} /><ToggleField label="STEROWANIE" checked={d.controls !== false} onChange={(controls) => onChange({ ...d, controls })} /></div></>; }
    case "map": { const d = withDefaults("map", module.data); return <><TextField label="Nagłówek" value={d.title} onChange={(v) => onChange({ ...d, title: v })} /><TextField label="Adres wyświetlany nad mapą" value={d.address} onChange={(v) => onChange({ ...d, address: v })} /><TextareaField label="Link osadzania mapy (src)" value={d.embedUrl} rows={3} onChange={(v) => onChange({ ...d, embedUrl: v })} placeholder="W Google Maps: Udostępnij → Umieść mapę → skopiuj adres z src" /><SelectField label="Wysokość mapy" value={d.height} onChange={(v) => onChange({ ...d, height: v })} options={[{ value: "sm", label: "Mała" }, { value: "md", label: "Średnia" }, { value: "lg", label: "Duża" }]} /></>; }
    case "quote": { const d = withDefaults("quote", module.data); return <><TextareaField label="Cytat / opinia" value={d.quote} rows={5} onChange={(v) => onChange({ ...d, quote: v })} /><TextField label="Autor" value={d.author} onChange={(v) => onChange({ ...d, author: v })} /><TextField label="Rola / dopisek" value={d.role} onChange={(v) => onChange({ ...d, role: v })} /><SelectField label="Wariant wizualny" value={d.variant} onChange={(variant) => onChange({ ...d, variant })} options={[{ value: "editorial", label: "Redakcyjny" }, { value: "card", label: "Karta" }, { value: "centered", label: "Duży wyśrodkowany" }]} /></>; }
    case "googleReviews": { const d = withDefaults("googleReviews", module.data); return <><TextField label="Nadpis" value={d.eyebrow} onChange={(eyebrow) => onChange({ ...d, eyebrow })} /><TextField label="Nagłówek" value={d.heading} onChange={(heading) => onChange({ ...d, heading })} /><TextareaField label="Opis" value={d.body} rows={3} onChange={(body) => onChange({ ...d, body })} /><TextField label="Tekst linku do Google" value={d.buttonLabel} onChange={(buttonLabel) => onChange({ ...d, buttonLabel })} /><div className="grid grid-cols-2 gap-3"><NumberField label="Liczba opinii" value={d.limit} min={1} max={5} onChange={(limit) => onChange({ ...d, limit })} /><SelectField label="Układ" value={d.layout} onChange={(layout) => onChange({ ...d, layout })} options={[{ value: "cards", label: "Karty" }, { value: "list", label: "Lista" }]} /></div><p className="border-l-2 border-ink-gold/60 bg-ink-gold/5 px-3 py-2 text-[10px] leading-relaxed text-ink-grey">Profil Google podłączasz raz w Treściach globalnych. Tutaj ustawiasz wyłącznie wygląd i treść widgetu.</p></>; }
    case "iconList": { const d = withDefaults("iconList", module.data); return <><TextField label="Nagłówek" value={d.title} onChange={(v) => onChange({ ...d, title: v })} /><TextareaField label="Punkty listy — jeden w każdej linii" value={d.items.join("\n")} rows={6} onChange={(v) => onChange({ ...d, items: v.split("\n") })} /><div className="grid grid-cols-2 gap-3"><SelectField label="Wariant wizualny" value={d.layout} onChange={(layout) => onChange({ ...d, layout })} options={[{ value: "list", label: "Lista" }, { value: "cards", label: "Karty korzyści" }, { value: "steps", label: "Numerowane kroki" }]} /><SelectField label="Liczba kolumn" value={d.columns} onChange={(columns) => onChange({ ...d, columns })} options={[{ value: "one", label: "1 kolumna" }, { value: "two", label: "2 kolumny" }, { value: "three", label: "3 kolumny" }]} /></div><SelectField label="Ikona punktu" value={d.style} onChange={(v) => onChange({ ...d, style: v })} options={[{ value: "check", label: "✓ Zaznaczenie" }, { value: "dot", label: "• Kropka" }, { value: "arrow", label: "→ Strzałka" }]} /></>; }
    case "callout": { const d = withDefaults("callout", module.data); return <><TextField label="Mały nadpis" value={d.eyebrow} onChange={(v) => onChange({ ...d, eyebrow: v })} /><TextField label="Tytuł" value={d.title} onChange={(v) => onChange({ ...d, title: v })} /><TextareaField label="Treść" value={d.body} rows={4} onChange={(v) => onChange({ ...d, body: v })} /><TextField label="Tekst przycisku (opcjonalnie)" value={d.buttonLabel} onChange={(v) => onChange({ ...d, buttonLabel: v })} /><TextField label="Link przycisku" value={d.href} onChange={(v) => onChange({ ...d, href: v })} /><SelectField label="Wygląd" value={d.style} onChange={(v) => onChange({ ...d, style: v })} options={[{ value: "charcoal", label: "Ciemny blok" }, { value: "gold", label: "Złoty blok" }, { value: "outline", label: "Obrys" }]} /></>; }
    case "customCode": { const d = withDefaults("customCode", module.data); return <><p className="border-l-2 border-ink-gold bg-ink-gold/5 px-3 py-3 text-[12px] leading-relaxed text-ink-grey">Kod działa w odizolowanej ramce. Skrypty, formularze, importy CSS i dostęp do strony nadrzędnej są zablokowane.</p><TextField label="Nazwa modułu dla dostępności" value={d.title} onChange={(title) => onChange({ ...d, title })} /><TextareaField label="HTML" value={d.html} onChange={(html) => onChange({ ...d, html })} rows={14} /><TextareaField label="CSS" value={d.css} onChange={(css) => onChange({ ...d, css })} rows={14} /><div className="grid grid-cols-2 gap-3"><NumberField label="Wysokość (px)" value={d.height} min={160} max={1600} onChange={(height) => onChange({ ...d, height })} /><ColorPicker label="Kolor tła ramki" value={d.backgroundColor} onChange={(backgroundColor) => onChange({ ...d, backgroundColor })} /></div></>; }
    default:
      return null;
  }
}
