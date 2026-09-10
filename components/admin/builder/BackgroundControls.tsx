"use client";

import ImageUploadField from "@/components/admin/ImageUploadField";
import ColorPicker from "@/components/admin/builder/ColorPicker";
import IconPicker from "@/components/admin/builder/IconPicker";
import { NumberField, PanelSection, RangeField, SelectField, ToggleField } from "@/components/admin/builder/fields";
import type { BlendMode, ModuleStyle, ResponsiveNumber } from "@/lib/modules";

const BLEND_OPTIONS: { value: BlendMode; label: string }[] = [
  { value: "normal", label: "Normalne" }, { value: "multiply", label: "Mnożenie" }, { value: "screen", label: "Ekran" },
  { value: "overlay", label: "Nakładka" }, { value: "soft-light", label: "Miękkie światło" }, { value: "hard-light", label: "Twarde światło" },
  { value: "difference", label: "Różnica" }, { value: "exclusion", label: "Wykluczenie" }, { value: "color", label: "Kolor" }, { value: "luminosity", label: "Jasność" },
];

function ResponsivePixels({ label, value, fallback, min = 0, max = 400, onChange }: { label: string; value?: ResponsiveNumber; fallback: number; min?: number; max?: number; onChange: (value: ResponsiveNumber) => void }) {
  const current = { desktop: value?.desktop ?? fallback, tablet: value?.tablet ?? value?.desktop ?? fallback, mobile: value?.mobile ?? value?.tablet ?? value?.desktop ?? fallback };
  return <fieldset><legend className="mb-1.5 text-[10px] tracking-[0.08em] text-ink-grey">{label}</legend><div className="grid grid-cols-3 gap-1.5">{(["desktop", "tablet", "mobile"] as const).map((key) => <NumberField key={key} label={key === "desktop" ? "KOMPUTER" : key === "tablet" ? "TABLET" : "TELEFON"} value={current[key]} min={min} max={max} onChange={(next) => onChange({ ...current, [key]: next })} />)}</div></fieldset>;
}

export default function BackgroundControls({ value, onChange }: { value?: ModuleStyle; onChange: (value: ModuleStyle) => void }) {
  const style = value ?? {};
  const set = (patch: Partial<ModuleStyle>) => onChange({ ...style, ...patch });

  return <div className="flex flex-col">
    <PanelSection title="Typografia" defaultOpen>
      <SelectField label="KRÓJ PISMA" value={style.fontFamily ?? "inherit"} onChange={(fontFamily) => set({ fontFamily })} options={[{ value: "inherit", label: "Domyślny widgetu" }, { value: "display", label: "Nagłówkowy CoolInk" }, { value: "body", label: "Tekstowy CoolInk" }]} />
      <ResponsivePixels label="WIELKOŚĆ PISMA (PX)" value={style.responsiveFontSize} fallback={style.fontSize ?? 0} max={260} onChange={(responsiveFontSize) => set({ responsiveFontSize, fontSize: responsiveFontSize.desktop || undefined })} />
      <div className="grid grid-cols-2 gap-2">
        <SelectField label="GRUBOŚĆ" value={style.fontWeight ?? "400"} onChange={(fontWeight) => set({ fontWeight })} options={[{ value: "300", label: "Lekka 300" }, { value: "400", label: "Normalna 400" }, { value: "500", label: "Średnia 500" }, { value: "600", label: "Półgruba 600" }, { value: "700", label: "Gruba 700" }]} />
        <SelectField label="POCHYLENIE" value={style.fontStyle ?? "normal"} onChange={(fontStyle) => set({ fontStyle })} options={[{ value: "normal", label: "Normalne" }, { value: "italic", label: "Kursywa" }]} />
        <NumberField label="INTERLINIA" value={style.lineHeight ?? 0} min={0} max={4} step={0.05} onChange={(lineHeight) => set({ lineHeight: lineHeight || undefined })} />
        <NumberField label="ODSTĘP LITER" value={style.letterSpacing ?? 0} min={-20} max={80} step={0.1} onChange={(letterSpacing) => set({ letterSpacing })} />
        <NumberField label="ODSTĘP SŁÓW" value={style.wordSpacing ?? 0} min={-30} max={100} step={0.5} onChange={(wordSpacing) => set({ wordSpacing })} />
        <SelectField label="DEKORACJA" value={style.textDecoration ?? "none"} onChange={(textDecoration) => set({ textDecoration })} options={[{ value: "none", label: "Brak" }, { value: "underline", label: "Podkreślenie" }, { value: "line-through", label: "Przekreślenie" }, { value: "overline", label: "Linia nad tekstem" }]} />
      </div>
      <div className="grid grid-cols-2 gap-2"><SelectField label="WYRÓWNANIE" value={style.textAlign ?? "left"} onChange={(textAlign) => set({ textAlign })} options={[{ value: "left", label: "Do lewej" }, { value: "center", label: "Do środka" }, { value: "right", label: "Do prawej" }, { value: "justify", label: "Wyjustowane" }]} /><SelectField label="WIELKOŚĆ LITER" value={style.textTransform ?? "none"} onChange={(textTransform) => set({ textTransform })} options={[{ value: "none", label: "Bez zmian" }, { value: "uppercase", label: "WERSALIKI" }, { value: "lowercase", label: "małe litery" }, { value: "capitalize", label: "Pierwsze Wielkie" }]} /></div>
      <ColorPicker label="KOLOR TEKSTU" value={style.color ?? ""} onChange={(color) => set({ color })} />
    </PanelSection>

    <PanelSection title="Obrys i cień tekstu">
      <div className="grid grid-cols-2 gap-2"><NumberField label="GRUBOŚĆ OBRYSU" value={style.textStrokeWidth ?? 0} min={0} max={8} step={0.25} onChange={(textStrokeWidth) => set({ textStrokeWidth })} /><ColorPicker label="KOLOR OBRYSU" value={style.textStrokeColor ?? ""} onChange={(textStrokeColor) => set({ textStrokeColor })} /></div>
      <ColorPicker label="KOLOR CIENIA" value={style.textShadowColor ?? ""} onChange={(textShadowColor) => set({ textShadowColor })} />
      <div className="grid grid-cols-3 gap-2"><NumberField label="X" value={style.textShadowX ?? 0} min={-100} max={100} onChange={(textShadowX) => set({ textShadowX })} /><NumberField label="Y" value={style.textShadowY ?? 2} min={-100} max={100} onChange={(textShadowY) => set({ textShadowY })} /><NumberField label="ROZMYCIE" value={style.textShadowBlur ?? 0} min={0} max={100} onChange={(textShadowBlur) => set({ textShadowBlur })} /></div>
    </PanelSection>

    <PanelSection title="Tło: kolor, gradient i obraz">
      <ColorPicker label="KOLOR TŁA" value={style.backgroundColor ?? ""} onChange={(backgroundColor) => set({ backgroundColor })} />
      <SelectField label="GRADIENT" value={style.gradientEnabled ? style.gradientType ?? "linear" : "none"} onChange={(gradient) => set({ gradientEnabled: gradient !== "none", gradientType: gradient === "radial" ? "radial" : "linear" })} options={[{ value: "none", label: "Brak" }, { value: "linear", label: "Liniowy" }, { value: "radial", label: "Radialny" }]} />
      {style.gradientEnabled && <><div className="grid grid-cols-2 gap-2"><ColorPicker label="KOLOR 1" value={style.gradientColor1 ?? "#c99a4a"} onChange={(gradientColor1) => set({ gradientColor1 })} /><ColorPicker label="KOLOR 2" value={style.gradientColor2 ?? "#090807"} onChange={(gradientColor2) => set({ gradientColor2 })} /></div><div className="grid grid-cols-2 gap-2"><RangeField label="PUNKT 1" value={style.gradientStop1 ?? 0} min={0} max={100} suffix="%" onChange={(gradientStop1) => set({ gradientStop1 })} /><RangeField label="PUNKT 2" value={style.gradientStop2 ?? 100} min={0} max={100} suffix="%" onChange={(gradientStop2) => set({ gradientStop2 })} /></div>{style.gradientType !== "radial" && <RangeField label="KĄT" value={style.gradientAngle ?? 135} min={0} max={360} suffix="°" onChange={(gradientAngle) => set({ gradientAngle })} />}</>}
      <ImageUploadField label="OBRAZ TŁA" value={style.backgroundImage ?? ""} onChange={(backgroundImage) => set({ backgroundImage })} />
      <div className="grid grid-cols-2 gap-2"><SelectField label="DOPASOWANIE" value={style.backgroundSize ?? "cover"} onChange={(backgroundSize) => set({ backgroundSize })} options={[{ value: "cover", label: "Wypełnij" }, { value: "contain", label: "Pokaż cały" }, { value: "auto", label: "Naturalny" }]} /><SelectField label="POZYCJA" value={style.backgroundPosition ?? "center"} onChange={(backgroundPosition) => set({ backgroundPosition })} options={[{ value: "center", label: "Środek" }, { value: "top", label: "Góra" }, { value: "bottom", label: "Dół" }, { value: "left", label: "Lewo" }, { value: "right", label: "Prawo" }]} /><SelectField label="POWTARZANIE" value={style.backgroundRepeat ?? "no-repeat"} onChange={(backgroundRepeat) => set({ backgroundRepeat })} options={[{ value: "no-repeat", label: "Bez powtarzania" }, { value: "repeat", label: "Powtarzaj" }, { value: "repeat-x", label: "Poziomo" }, { value: "repeat-y", label: "Pionowo" }]} /><SelectField label="PARALLAX TŁA" value={style.parallax ?? "none"} onChange={(parallax) => set({ parallax })} options={[{ value: "none", label: "Brak" }, { value: "slow", label: "Powolny" }, { value: "medium", label: "Średni" }, { value: "fast", label: "Mocny" }]} /></div>
      <SelectField label="TRYB MIESZANIA TŁA" value={style.backgroundBlendMode ?? "normal"} onChange={(backgroundBlendMode) => set({ backgroundBlendMode })} options={BLEND_OPTIONS} />
      <ToggleField label="STAŁE TŁO" description="Efekt kinowego parallaxu; na telefonie automatycznie wraca do przewijania." checked={style.backgroundAttachment === "fixed"} onChange={(checked) => set({ backgroundAttachment: checked ? "fixed" : "scroll" })} />
    </PanelSection>

    <PanelSection title="Nakładka i wzór">
      <ColorPicker label="KOLOR NAKŁADKI" value={style.overlayColor ?? ""} onChange={(overlayColor) => set({ overlayColor })} />
      <RangeField label="KRYCIE NAKŁADKI" value={style.overlayOpacity ?? 0} min={0} max={100} suffix="%" onChange={(overlayOpacity) => set({ overlayOpacity })} />
      <SelectField label="MIESZANIE NAKŁADKI" value={style.overlayBlendMode ?? "normal"} onChange={(overlayBlendMode) => set({ overlayBlendMode })} options={BLEND_OPTIONS} />
      <SelectField label="DARMOWY WZÓR" value={style.pattern ?? "none"} onChange={(pattern) => set({ pattern })} options={[{ value: "none", label: "Brak" }, { value: "noise", label: "Filmowe ziarno" }, { value: "dots", label: "Kropki" }, { value: "grid", label: "Siatka" }, { value: "diagonal", label: "Linie diagonalne" }, { value: "crosses", label: "Krzyże" }]} />
      {style.pattern && style.pattern !== "none" && <><ColorPicker label="KOLOR WZORU" value={style.patternColor ?? "#c99a4a"} onChange={(patternColor) => set({ patternColor })} /><div className="grid grid-cols-2 gap-2"><RangeField label="KRYCIE" value={style.patternOpacity ?? 18} min={0} max={100} suffix="%" onChange={(patternOpacity) => set({ patternOpacity })} /><RangeField label="SKALA" value={style.patternSize ?? 28} min={4} max={240} suffix="px" onChange={(patternSize) => set({ patternSize })} /></div></>}
    </PanelSection>

    <PanelSection title="Ikona i gadżet dekoracyjny">
      <p className="text-[9px] leading-relaxed text-ink-grey">Ustawienia obejmują ikony w widżecie. Dodatkowa ikona może być nałożona na dowolny widget, kolumnę lub sekcję.</p>
      <IconPicker label="DODATKOWA IKONA" value={style.decorativeIcon} onChange={(decorativeIcon) => set({ decorativeIcon })} />
      <SelectField label="POZYCJA" value={style.iconPlacement ?? "top-right"} onChange={(iconPlacement) => set({ iconPlacement })} options={[{ value: "top-left", label: "Góra lewo" }, { value: "top-center", label: "Góra środek" }, { value: "top-right", label: "Góra prawo" }, { value: "center-left", label: "Środek lewo" }, { value: "center", label: "Idealny środek" }, { value: "center-right", label: "Środek prawo" }, { value: "bottom-left", label: "Dół lewo" }, { value: "bottom-center", label: "Dół środek" }, { value: "bottom-right", label: "Dół prawo" }]} />
      <ResponsivePixels label="WIELKOŚĆ IKON (PX)" value={style.iconSize} fallback={24} min={4} max={320} onChange={(iconSize) => set({ iconSize })} />
      <div className="grid grid-cols-2 gap-2"><ColorPicker label="KOLOR IKONY" value={style.iconColor ?? ""} onChange={(iconColor) => set({ iconColor })} /><ColorPicker label="TŁO IKONY" value={style.iconBackgroundColor ?? ""} onChange={(iconBackgroundColor) => set({ iconBackgroundColor })} /></div>
      <div className="grid grid-cols-2 gap-2"><NumberField label="PRZESUNIĘCIE X" value={style.iconOffsetX ?? 0} min={-800} max={800} onChange={(iconOffsetX) => set({ iconOffsetX })} /><NumberField label="PRZESUNIĘCIE Y" value={style.iconOffsetY ?? 0} min={-800} max={800} onChange={(iconOffsetY) => set({ iconOffsetY })} /><NumberField label="OBRÓT" value={style.iconRotation ?? 0} min={-720} max={720} onChange={(iconRotation) => set({ iconRotation })} /><NumberField label="DOPEŁNIENIE" value={style.iconPadding ?? 0} min={0} max={80} onChange={(iconPadding) => set({ iconPadding })} /><NumberField label="ZAOKRĄGLENIE" value={style.iconRadius ?? 0} min={0} max={999} onChange={(iconRadius) => set({ iconRadius })} /><NumberField label="WARSTWA Z" value={style.iconZIndex ?? 5} min={-10} max={999} onChange={(iconZIndex) => set({ iconZIndex })} /></div>
      <RangeField label="KRYCIE IKONY" value={style.iconOpacity ?? 100} min={0} max={100} suffix="%" onChange={(iconOpacity) => set({ iconOpacity })} />
    </PanelSection>

    <PanelSection title="Obramowanie i cień">
      <SelectField label="WARIANT POWIERZCHNI" value={style.surface ?? "plain"} onChange={(surface) => set({ surface })} options={[{ value: "plain", label: "Bez ramki" }, { value: "card", label: "Karta" }, { value: "outline", label: "Złoty obrys" }, { value: "glass", label: "Szkło / blur" }]} />
      <div className="grid grid-cols-2 gap-2"><SelectField label="PROMIEŃ PRESET" value={style.radius ?? "none"} onChange={(radius) => set({ radius })} options={[{ value: "none", label: "Brak" }, { value: "sm", label: "Mały" }, { value: "md", label: "Średni" }, { value: "lg", label: "Duży" }]} /><NumberField label="DOKŁADNY PROMIEŃ" value={style.borderRadius ?? 0} min={0} max={999} onChange={(borderRadius) => set({ borderRadius })} /></div>
      <div className="grid grid-cols-2 gap-2"><ColorPicker label="KOLOR RAMKI" value={style.borderColor ?? ""} onChange={(borderColor) => set({ borderColor })} /><NumberField label="GRUBOŚĆ" value={style.borderWidth ?? 0} min={0} max={40} onChange={(borderWidth) => set({ borderWidth })} /></div>
      <SelectField label="STYL RAMKI" value={style.borderStyle ?? "solid"} onChange={(borderStyle) => set({ borderStyle })} options={[{ value: "solid", label: "Ciągła" }, { value: "dashed", label: "Kreskowana" }, { value: "dotted", label: "Kropkowana" }, { value: "double", label: "Podwójna" }]} />
      <SelectField label="CIEŃ PRESET" value={style.shadow ?? "none"} onChange={(shadow) => set({ shadow })} options={[{ value: "none", label: "Brak" }, { value: "sm", label: "Delikatny" }, { value: "md", label: "Średni" }, { value: "lg", label: "Mocny" }]} />
      <ColorPicker label="WŁASNY KOLOR CIENIA" value={style.boxShadowColor ?? ""} onChange={(boxShadowColor) => set({ boxShadowColor })} />
      <div className="grid grid-cols-2 gap-2"><NumberField label="CIEŃ X" value={style.boxShadowX ?? 0} min={-200} max={200} onChange={(boxShadowX) => set({ boxShadowX })} /><NumberField label="CIEŃ Y" value={style.boxShadowY ?? 12} min={-200} max={200} onChange={(boxShadowY) => set({ boxShadowY })} /><NumberField label="ROZMYCIE" value={style.boxShadowBlur ?? 0} min={0} max={300} onChange={(boxShadowBlur) => set({ boxShadowBlur })} /><NumberField label="ROZLANIE" value={style.boxShadowSpread ?? 0} min={-100} max={200} onChange={(boxShadowSpread) => set({ boxShadowSpread })} /></div>
    </PanelSection>

    <PanelSection title="Filtry i światło">
      <div className="grid grid-cols-2 gap-2"><RangeField label="JASNOŚĆ" value={style.brightness ?? 100} min={0} max={300} suffix="%" onChange={(brightness) => set({ brightness })} /><RangeField label="KONTRAST" value={style.contrast ?? 100} min={0} max={300} suffix="%" onChange={(contrast) => set({ contrast })} /><RangeField label="NASYCENIE" value={style.saturate ?? 100} min={0} max={300} suffix="%" onChange={(saturate) => set({ saturate })} /><RangeField label="SZAROŚĆ" value={style.grayscale ?? 0} min={0} max={100} suffix="%" onChange={(grayscale) => set({ grayscale })} /><RangeField label="ROZMYCIE" value={style.blur ?? 0} min={0} max={40} suffix="px" onChange={(blur) => set({ blur })} /><RangeField label="BARWA" value={style.hueRotate ?? 0} min={-180} max={180} suffix="°" onChange={(hueRotate) => set({ hueRotate })} /></div>
      <RangeField label="ROZMYCIE TŁA / SZKŁO" value={style.backdropBlur ?? 0} min={0} max={80} suffix="px" onChange={(backdropBlur) => set({ backdropBlur })} />
      <SelectField label="MIESZANIE CAŁEGO ELEMENTU" value={style.mixBlendMode ?? "normal"} onChange={(mixBlendMode) => set({ mixBlendMode })} options={BLEND_OPTIONS} />
      <ColorPicker label="KOLOR POŚWIATY" value={style.glowColor ?? ""} onChange={(glowColor) => set({ glowColor })} />
      <div className="grid grid-cols-2 gap-2"><RangeField label="POŚWIATA X" value={style.glowX ?? 50} min={0} max={100} suffix="%" onChange={(glowX) => set({ glowX })} /><RangeField label="POŚWIATA Y" value={style.glowY ?? 50} min={0} max={100} suffix="%" onChange={(glowY) => set({ glowY })} /><RangeField label="ROZMIAR" value={style.glowSize ?? 420} min={20} max={1600} suffix="px" onChange={(glowSize) => set({ glowSize })} /><RangeField label="KRYCIE" value={style.glowOpacity ?? 0} min={0} max={100} suffix="%" onChange={(glowOpacity) => set({ glowOpacity })} /></div>
    </PanelSection>
  </div>;
}
