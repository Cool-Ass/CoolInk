"use client";

import { useRef, useState } from "react";
import { ImagePlus, LoaderCircle, Trash2 } from "lucide-react";
import MediaPickerModal from "@/components/admin/MediaPickerModal";
import { imageSource } from "@/lib/imageSource";

export default function EventImagesField({ value, onChange }: { value: string[]; onChange: (urls: string[]) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const append = (urls: string[]) => onChange([...new Set([...value, ...urls])].slice(0, 8));

  async function upload(files: FileList | null) {
    if (!files?.length || uploading) return;
    setUploading(true); setError("");
    try {
      const uploaded: string[] = [];
      for (const file of Array.from(files).slice(0, 8 - value.length)) {
        const form = new FormData(); form.set("file", file); form.set("alt", `Grafika wydarzenia: ${file.name}`);
        const response = await fetch("/api/admin/media", { method: "POST", body: form });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.media?.url) throw new Error(data.error || "Nie udało się dodać zdjęcia.");
        uploaded.push(data.media.url);
      }
      append(uploaded);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Nie udało się dodać zdjęcia."); }
    finally { setUploading(false); if (inputRef.current) inputRef.current.value = ""; }
  }

  return <section className="border border-ink-white/10 bg-ink-black/20 p-3">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-[10px] tracking-[.12em] text-ink-grey">PLAKATY I ZDJĘCIA</p><p className="mt-1 text-[10px] text-ink-grey/80">Do 8 obrazów · pierwszy jest okładką wydarzenia.</p></div><div className="flex gap-2"><input ref={inputRef} type="file" multiple accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => void upload(event.target.files)} /><button type="button" disabled={uploading || value.length >= 8} onClick={() => inputRef.current?.click()} className="inline-flex min-h-9 items-center gap-2 border border-ink-gold/60 px-3 py-2 text-[10px] text-ink-gold disabled:opacity-40">{uploading ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />}PRZEŚLIJ</button><button type="button" disabled={value.length >= 8} onClick={() => setPickerOpen(true)} className="min-h-9 border border-ink-white/20 px-3 py-2 text-[10px] text-ink-grey disabled:opacity-40">BIBLIOTEKA</button></div></div>
    {value.length > 0 && <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">{value.map((url, index) => { const source = imageSource(url); return source ? <div key={url} className="group relative aspect-square overflow-hidden border border-ink-white/15"><img src={source} alt={`Zdjęcie wydarzenia ${index + 1}`} className="h-full w-full object-cover" />{index === 0 && <span className="absolute bottom-1 left-1 bg-ink-black/80 px-1.5 py-0.5 text-[8px] text-ink-gold">OKŁADKA</span>}<button type="button" onClick={() => onChange(value.filter((item) => item !== url))} aria-label="Usuń zdjęcie" className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center border border-red-400/50 bg-ink-black/85 text-red-300"><Trash2 className="h-3 w-3" /></button></div> : null; })}</div>}
    {error && <p role="alert" className="mt-2 text-xs text-red-300">{error}</p>}
    {pickerOpen && <MediaPickerModal multiple onSelect={() => undefined} onSelectMany={(urls) => { append(urls); setPickerOpen(false); }} onClose={() => setPickerOpen(false)} />}
  </section>;
}
