"use client";

import Image from "next/image";
import { useRef, useState, type ChangeEvent } from "react";
import { useToast } from "@/components/admin/ToastProvider";
import MediaPickerModal from "@/components/admin/MediaPickerModal";

export default function ImageUploadField({
  value,
  onChange,
  label = "Obraz",
}: {
  value: string;
  onChange: (url: string) => void;
  label?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const { showToast } = useToast();

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/media", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Przesyłanie nie powiodło się.");
      onChange(data.media.url);
      showToast("Obraz przesłany.");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Przesyłanie nie powiodło się.", "error");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="text-[12px] tracking-[0.12em] text-ink-grey">{label}</label>

      {value && (
        <div className="relative h-40 w-full max-w-xs overflow-hidden border border-ink-white/15 bg-ink-charcoal">
          <Image src={value} alt="" fill className="object-cover" sizes="320px" />
          <button
            type="button"
            onClick={() => {
              if (window.confirm("Usunąć wybrane zdjęcie z tej sekcji? Plik pozostanie w bibliotece mediów.")) onChange("");
            }}
            className="absolute right-1.5 top-1.5 border border-ink-white/30 bg-ink-black/80 px-2 py-0.5 text-[11px] text-ink-white transition-colors hover:border-red-400 hover:text-red-400"
          >
            Usuń
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/svg+xml"
          onChange={handleFile}
          disabled={uploading}
          className="sr-only"
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="border border-ink-gold/60 px-3 py-2 text-[12px] tracking-[0.05em] text-ink-gold transition-colors hover:bg-ink-gold/10 disabled:opacity-50"
        >
          {uploading ? "PRZESYŁANIE…" : "PRZEŚLIJ NOWE ZDJĘCIE"}
        </button>
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="border border-ink-white/20 px-3 py-2 text-[12px] tracking-[0.05em] text-ink-white transition-colors hover:border-ink-gold hover:text-ink-gold"
        >
          WYBIERZ Z BIBLIOTEKI
        </button>
      </div>

      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Opcjonalnie: wklej bezpośredni adres URL zdjęcia"
        className="border border-ink-white/20 bg-transparent px-3 py-2 text-[13px] text-ink-white outline-none transition-colors focus:border-ink-gold"
      />

      {pickerOpen && (
        <MediaPickerModal
          onSelect={(url) => {
            onChange(url);
            setPickerOpen(false);
          }}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
  );
}
