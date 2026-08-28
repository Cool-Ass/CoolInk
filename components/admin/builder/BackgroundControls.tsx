"use client";

import ImageUploadField from "@/components/admin/ImageUploadField";
import ColorPicker from "@/components/admin/builder/ColorPicker";
import { SelectField } from "@/components/admin/builder/fields";
import type { ModuleStyle } from "@/lib/modules";

export default function BackgroundControls({ value, onChange }: { value?: ModuleStyle; onChange: (value: ModuleStyle) => void }) {
  const style = value ?? {};
  const set = (patch: Partial<ModuleStyle>) => onChange({ ...style, ...patch });
  return <div className="flex flex-col gap-4"><ColorPicker label="KOLOR TŁA" value={style.backgroundColor ?? ""} onChange={(backgroundColor) => set({ backgroundColor })} /><ImageUploadField label="OBRAZ TŁA (OPCJONALNIE)" value={style.backgroundImage ?? ""} onChange={(backgroundImage) => set({ backgroundImage })} /><SelectField label="DOPASOWANIE OBRAZU" value={style.backgroundSize ?? "cover"} onChange={(backgroundSize) => set({ backgroundSize })} options={[{ value: "cover", label: "Wypełnij (cover)" }, { value: "contain", label: "Pokaż cały (contain)" }, { value: "auto", label: "Naturalny rozmiar" }]} /><ColorPicker label="KOLOR NAKŁADKI" value={style.overlayColor ?? ""} onChange={(overlayColor) => set({ overlayColor })} /><label className="flex flex-col gap-2 text-[11px] tracking-[0.1em] text-ink-grey">KRYCIE NAKŁADKI<input type="range" min="0" max="100" value={style.overlayOpacity ?? 0} onChange={(e) => set({ overlayOpacity: Number(e.target.value) })} /><span className="text-xs normal-case tracking-normal">{style.overlayOpacity ?? 0}%</span></label><SelectField label="PROMIEŃ ROGÓW" value={style.radius ?? "none"} onChange={(radius) => set({ radius })} options={[{ value: "none", label: "Brak" }, { value: "sm", label: "Mały" }, { value: "md", label: "Średni" }, { value: "lg", label: "Duży" }]} /></div>;
}
