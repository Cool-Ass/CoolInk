"use client";

import ImageUploadField from "@/components/admin/ImageUploadField";
import ColorPicker from "@/components/admin/builder/ColorPicker";
import { NumberField, SelectField } from "@/components/admin/builder/fields";
import type { ModuleStyle } from "@/lib/modules";

export default function BackgroundControls({ value, onChange }: { value?: ModuleStyle; onChange: (value: ModuleStyle) => void }) {
  const style = value ?? {};
  const set = (patch: Partial<ModuleStyle>) => onChange({ ...style, ...patch });
  return <div className="flex flex-col gap-5">
    <SelectField label="WARIANT POWIERZCHNI" value={style.surface ?? "plain"} onChange={(surface) => set({ surface })} options={[{ value: "plain", label: "Bez ramki" }, { value: "card", label: "Karta" }, { value: "outline", label: "Złoty obrys" }, { value: "glass", label: "Szkło / blur" }]} />
    <SelectField label="SZEROKOŚĆ MODUŁU" value={style.contentWidth ?? "full"} onChange={(contentWidth) => set({ contentWidth })} options={[{ value: "full", label: "Pełna szerokość" }, { value: "wide", label: "Szeroka" }, { value: "normal", label: "Standardowa" }, { value: "narrow", label: "Wąska" }]} />
    <div className="grid grid-cols-2 gap-3">
      <SelectField label="ODSTĘP WEWNĘTRZNY" value={style.padding ?? "none"} onChange={(padding) => set({ padding })} options={[{ value: "none", label: "Brak" }, { value: "sm", label: "Mały" }, { value: "md", label: "Średni" }, { value: "lg", label: "Duży" }, { value: "xl", label: "Bardzo duży" }]} />
      <SelectField label="ODSTĘP ZEWNĘTRZNY" value={style.margin ?? "none"} onChange={(margin) => set({ margin })} options={[{ value: "none", label: "Brak" }, { value: "sm", label: "Mały" }, { value: "md", label: "Średni" }, { value: "lg", label: "Duży" }, { value: "xl", label: "Bardzo duży" }]} />
    </div>
    <div className="grid grid-cols-2 gap-3">
      <SelectField label="PROMIEŃ ROGÓW" value={style.radius ?? "none"} onChange={(radius) => set({ radius })} options={[{ value: "none", label: "Brak" }, { value: "sm", label: "Mały" }, { value: "md", label: "Średni" }, { value: "lg", label: "Duży" }]} />
      <SelectField label="CIEŃ" value={style.shadow ?? "none"} onChange={(shadow) => set({ shadow })} options={[{ value: "none", label: "Brak" }, { value: "sm", label: "Delikatny" }, { value: "md", label: "Średni" }, { value: "lg", label: "Mocny" }]} />
    </div>
    <ColorPicker label="KOLOR TŁA" value={style.backgroundColor ?? ""} onChange={(backgroundColor) => set({ backgroundColor })} />
    <ImageUploadField label="OBRAZ TŁA (OPCJONALNIE)" value={style.backgroundImage ?? ""} onChange={(backgroundImage) => set({ backgroundImage })} />
    <SelectField label="DOPASOWANIE OBRAZU" value={style.backgroundSize ?? "cover"} onChange={(backgroundSize) => set({ backgroundSize })} options={[{ value: "cover", label: "Wypełnij (cover)" }, { value: "contain", label: "Pokaż cały (contain)" }, { value: "auto", label: "Naturalny rozmiar" }]} />
    <ColorPicker label="KOLOR NAKŁADKI" value={style.overlayColor ?? ""} onChange={(overlayColor) => set({ overlayColor })} />
    <label className="flex flex-col gap-2 text-[11px] tracking-[0.1em] text-ink-grey">KRYCIE NAKŁADKI<input type="range" min="0" max="100" value={style.overlayOpacity ?? 0} onChange={(e) => set({ overlayOpacity: Number(e.target.value) })} /><span className="text-xs normal-case tracking-normal">{style.overlayOpacity ?? 0}%</span></label>
    <div className="grid grid-cols-2 gap-3">
      <ColorPicker label="KOLOR OBRAMOWANIA" value={style.borderColor ?? ""} onChange={(borderColor) => set({ borderColor })} />
      <NumberField label="GRUBOŚĆ RAMKI (PX)" value={style.borderWidth ?? 0} min={0} max={12} onChange={(borderWidth) => set({ borderWidth })} />
      <NumberField label="MIN. WYSOKOŚĆ (PX)" value={style.minHeight ?? 0} min={0} max={1600} onChange={(minHeight) => set({ minHeight })} />
      <NumberField label="KRYCIE MODUŁU (%)" value={style.opacity ?? 100} min={10} max={100} onChange={(opacity) => set({ opacity })} />
    </div>
    <fieldset className="border border-ink-white/10 p-3"><legend className="px-2 text-[11px] tracking-[.1em] text-ink-grey">WIDOCZNOŚĆ</legend><div className="grid gap-2 text-xs text-ink-grey">{([['mobile','Ukryj na telefonie'],['tablet','Ukryj na tablecie'],['desktop','Ukryj na komputerze']] as const).map(([key,label]) => <label key={key} className="flex items-center gap-2"><input type="checkbox" checked={Boolean(style.hiddenOn?.[key])} onChange={(event) => set({ hiddenOn: { ...style.hiddenOn, [key]: event.target.checked } })} />{label}</label>)}</div></fieldset>
  </div>;
}
