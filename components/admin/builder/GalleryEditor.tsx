"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import MediaLibraryPicker from "@/components/admin/MediaLibraryPicker";
import { SelectField } from "@/components/admin/builder/fields";
import ResponsiveControls from "@/components/admin/builder/ResponsiveControls";
import type { GalleryModuleData } from "@/lib/modules";

export default function GalleryEditor({ value, onChange }: { value: GalleryModuleData; onChange: (value: Record<string, unknown>) => void }) {
  const [picker, setPicker] = useState(false);
  const images = useMemo(() => value.images?.length ? value.images : [value.image1, value.image2, value.image3].filter(Boolean), [value]);
  const change = (images: string[]) => onChange({ ...value, images });
  return <div className="flex flex-col gap-4"><p className="text-[12px] leading-relaxed text-ink-grey">Wybieraj wiele zdjęć naraz. Stare galerie z trzema polami nadal są poprawnie wyświetlane.</p><button type="button" onClick={() => setPicker(true)} className="self-start border border-ink-gold px-3 py-2 text-[11px] tracking-[0.08em] text-ink-gold transition-colors hover:bg-ink-gold/10">WYBIERZ Z BIBLIOTEKI</button>{images.length ? <div className="grid grid-cols-3 gap-2">{images.map((url, index) => <div key={`${url}-${index}`} className="group relative aspect-square overflow-hidden border border-ink-white/15"><Image src={url} alt="" fill className="object-cover" sizes="120px" /><button type="button" onClick={() => change(images.filter((_, i) => i !== index))} className="absolute right-1 top-1 border border-ink-white/20 bg-ink-black/80 px-1.5 py-0.5 text-[10px] opacity-0 transition-opacity group-hover:opacity-100">Usuń</button></div>)}</div> : <div className="border border-dashed border-ink-white/20 p-6 text-center text-xs text-ink-grey">Nie wybrano jeszcze zdjęć.</div>}<SelectField label="Układ galerii" value={value.layout ?? "grid"} onChange={(layout) => onChange({ ...value, layout })} options={[{ value: "grid", label: "Siatka" }, { value: "masonry", label: "Masonry" }]} /><ResponsiveControls label="KOLUMNY" value={value.columns ?? { desktop: 3, tablet: 2, mobile: 1 }} max={4} onChange={(columns) => onChange({ ...value, columns })} />{picker && <MediaLibraryPicker multiple onSelect={() => {}} onSelectMany={(urls) => { change([...images, ...urls.filter((url) => !images.includes(url))]); setPicker(false); }} onClose={() => setPicker(false)} />}</div>;
}
