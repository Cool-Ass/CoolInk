"use client";

import Image from "next/image";
import { useRef, useState, type ChangeEvent } from "react";
import { useToast } from "@/components/admin/ToastProvider";
import MediaPickerModal from "@/components/admin/MediaPickerModal";
import { imageSource } from "@/lib/imageSource";

export default function ImageUploadField({
  value,
  onChange,
  label = "Obraz",
  previewFit = "cover",
  transparentPreview = false,
  helpText,
}: {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  previewFit?: "cover" | "contain";
  transparentPreview?: boolean;
  helpText?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const { showToast } = useToast();
  const previewSource = imageSource(value);

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
    <div className="flex min-w-0 flex-col gap-3">
      <p className="text-[12px] tracking-[0.12em] text-white/65">{label}</p>

      {previewSource && (
        <div className="relative h-40 w-full max-w-full overflow-hidden border border-white/20 bg-ink-charcoal" style={transparentPreview ? { backgroundColor: "#181818", backgroundImage: "linear-gradient(45deg,#2a2a2a 25%,transparent 25%),linear-gradient(-45deg,#2a2a2a 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#2a2a2a 75%),linear-gradient(-45deg,transparent 75%,#2a2a2a 75%)", backgroundSize: "20px 20px", backgroundPosition: "0 0,0 10px,10px -10px,-10px 0" } : undefined}>
          <Image src={previewSource} alt="" fill className={previewFit === "contain" ? "object-contain p-3" : "object-cover"} sizes="320px" />
          <button
            type="button"
            onClick={() => {
              if (window.confirm("Usunąć wybrane zdjęcie z tej sekcji? Plik pozostanie w bibliotece mediów.")) onChange("");
            }}
            className="absolute right-1.5 top-1.5 min-h-11 border border-white/30 bg-black/85 px-3 text-[11px] text-white transition-colors hover:border-red-400 hover:text-red-300"
          >
            Usuń
          </button>
        </div>
      )}

      {helpText && <p className="-mt-1 text-[10px] leading-relaxed text-ink-grey">{helpText}</p>}

      <div className="grid min-w-0 gap-2">
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
          className="min-h-11 w-full border border-ink-gold/60 px-3 text-[11px] tracking-[0.05em] text-ink-gold transition-colors hover:bg-ink-gold/10 active:bg-ink-gold/20 disabled:opacity-50"
        >
          {uploading ? "PRZESYŁANIE…" : "PRZEŚLIJ NOWE ZDJĘCIE"}
        </button>
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="min-h-11 w-full border border-white/20 px-3 text-[11px] tracking-[0.05em] text-white transition-colors hover:border-ink-gold hover:text-ink-gold active:bg-white/5"
        >
          WYBIERZ Z BIBLIOTEKI
        </button>
      </div>

      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Opcjonalnie: wklej bezpośredni adres URL zdjęcia"
        aria-label={`${label} — adres obrazu`}
        className="min-h-11 w-full min-w-0 border border-white/20 bg-[#17191c] px-3 text-[13px] text-white outline-none transition-colors hover:border-white/35 focus-visible:border-ink-gold focus-visible:ring-1 focus-visible:ring-ink-gold"
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
