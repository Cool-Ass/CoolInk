"use client";

import ImageUploadField from "@/components/admin/ImageUploadField";
import ColorPicker from "@/components/admin/builder/ColorPicker";
import { NumberField, PanelSection, SelectField } from "@/components/admin/builder/fields";
import type { ModuleStyle } from "@/lib/modules";

export default function BackgroundControls({ value, onChange }: { value?: ModuleStyle; onChange: (value: ModuleStyle) => void }) {
  const style = value ?? {};
  const set = (patch: Partial<ModuleStyle>) => onChange({ ...style, ...patch });

  return <div className="flex flex-col">
    <PanelSection title="Typografia" defaultOpen>
      <SelectField label="KRÓJ PISMA" value={style.fontFamily ?? "inherit"} onChange={(fontFamily) => set({ fontFamily })} options={[{ value: "inherit", label: "Domyślny widgetu" }, { value: "display", label: "Nagłówkowy CoolInk" }, { value: "body", label: "Tekstowy CoolInk" }]} />
      <div className="grid grid-cols-2 gap-2">
        <NumberField label="WIELKOŚĆ (PX)" value={style.fontSize ?? 0} min={0} max={240} onChange={(fontSize) => set({ fontSize: fontSize || undefined })} />
        <SelectField label="GRUBOŚĆ" value={style.fontWeight ?? "400"} onChange={(fontWeight) => set({ fontWeight })} options={[{ value: "300", label: "Lekka 300" }, { value: "400", label: "Normalna 400" }, { value: "500", label: "Średnia 500" }, { value: "600", label: "Półgruba 600" }, { value: "700", label: "Gruba 700" }]} />
        <NumberField label="INTERLINIA" value={style.lineHeight ?? 0} min={0} max={4} step={0.05} onChange={(lineHeight) => set({ lineHeight: lineHeight || undefined })} />
        <NumberField label="ODSTĘP LITER (PX)" value={style.letterSpacing ?? 0} min={-10} max={40} step={0.1} onChange={(letterSpacing) => set({ letterSpacing: letterSpacing || undefined })} />
      </div>
      <SelectField label="WYRÓWNANIE" value={style.textAlign ?? "left"} onChange={(textAlign) => set({ textAlign })} options={[{ value: "left", label: "Do lewej" }, { value: "center", label: "Do środka" }, { value: "right", label: "Do prawej" }, { value: "justify", label: "Wyjustowane" }]} />
      <SelectField label="WIELKOŚĆ LITER" value={style.textTransform ?? "none"} onChange={(textTransform) => set({ textTransform })} options={[{ value: "none", label: "Bez zmian" }, { value: "uppercase", label: "WERSALIKI" }, { value: "lowercase", label: "małe litery" }, { value: "capitalize", label: "Pierwsze Wielkie" }]} />
      <ColorPicker label="KOLOR TEKSTU" value={style.color ?? ""} onChange={(color) => set({ color })} />
    </PanelSection>

    <PanelSection title="Tło">
      <ColorPicker label="KOLOR TŁA" value={style.backgroundColor ?? ""} onChange={(backgroundColor) => set({ backgroundColor })} />
      <ImageUploadField label="OBRAZ TŁA" value={style.backgroundImage ?? ""} onChange={(backgroundImage) => set({ backgroundImage })} />
      <SelectField label="DOPASOWANIE OBRAZU" value={style.backgroundSize ?? "cover"} onChange={(backgroundSize) => set({ backgroundSize })} options={[{ value: "cover", label: "Wypełnij" }, { value: "contain", label: "Pokaż cały" }, { value: "auto", label: "Naturalny rozmiar" }]} />
      <ColorPicker label="KOLOR NAKŁADKI" value={style.overlayColor ?? ""} onChange={(overlayColor) => set({ overlayColor })} />
      <label className="text-[10px] tracking-[0.08em] text-ink-grey">KRYCIE NAKŁADKI <span className="float-right text-white">{style.overlayOpacity ?? 0}%</span><input className="mt-2 w-full accent-[#c99a4a]" type="range" min="0" max="100" value={style.overlayOpacity ?? 0} onChange={(event) => set({ overlayOpacity: Number(event.target.value) })} /></label>
    </PanelSection>

    <PanelSection title="Obramowanie i efekty">
      <SelectField label="WARIANT POWIERZCHNI" value={style.surface ?? "plain"} onChange={(surface) => set({ surface })} options={[{ value: "plain", label: "Bez ramki" }, { value: "card", label: "Karta" }, { value: "outline", label: "Złoty obrys" }, { value: "glass", label: "Szkło / blur" }]} />
      <div className="grid grid-cols-2 gap-2"><SelectField label="PROMIEŃ ROGÓW" value={style.radius ?? "none"} onChange={(radius) => set({ radius })} options={[{ value: "none", label: "Brak" }, { value: "sm", label: "Mały" }, { value: "md", label: "Średni" }, { value: "lg", label: "Duży" }]} /><SelectField label="CIEŃ" value={style.shadow ?? "none"} onChange={(shadow) => set({ shadow })} options={[{ value: "none", label: "Brak" }, { value: "sm", label: "Delikatny" }, { value: "md", label: "Średni" }, { value: "lg", label: "Mocny" }]} /></div>
      <div className="grid grid-cols-2 gap-2"><ColorPicker label="KOLOR RAMKI" value={style.borderColor ?? ""} onChange={(borderColor) => set({ borderColor })} /><NumberField label="GRUBOŚĆ (PX)" value={style.borderWidth ?? 0} min={0} max={12} onChange={(borderWidth) => set({ borderWidth })} /></div>
      <NumberField label="KRYCIE MODUŁU (%)" value={style.opacity ?? 100} min={10} max={100} onChange={(opacity) => set({ opacity })} />
    </PanelSection>
  </div>;
}
