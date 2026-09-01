"use client";

import Image from "next/image";
import { useRef, useState, type ChangeEvent } from "react";
import ConfirmButton from "@/components/admin/ConfirmButton";
import { useToast } from "@/components/admin/ToastProvider";
import { imageSource } from "@/lib/imageSource";

interface MediaItem {
  id: string;
  url: string;
  filename: string;
  width: number | null;
  height: number | null;
  size: number | null;
  alt: string | null;
  usedIn: string[];
}

function formatSize(bytes: number | null) {
  if (!bytes) return "—";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function MediaGrid({ initialMedia }: { initialMedia: MediaItem[] }) {
  const [media, setMedia] = useState(initialMedia);
  const [query, setQuery] = useState("");
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  async function handleUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/media", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Przesyłanie nie powiodło się.");
      setMedia((m) => [{ ...data.media, usedIn: [] }, ...m]);
      showToast("Obraz przesłany.");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Przesyłanie nie powiodło się.", "error");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleAltSave(id: string, alt: string) {
    const res = await fetch(`/api/admin/media/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ alt }),
    });
    if (!res.ok) {
      showToast("Nie udało się zapisać opisu.", "error");
      return;
    }
    setMedia((m) => m.map((item) => (item.id === id ? { ...item, alt } : item)));
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/admin/media/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.error || "Nie udało się usunąć.", "error");
      return;
    }
    setMedia((m) => m.filter((item) => item.id !== id));
    showToast("Obraz usunięty.");
  }

  const filtered = media.filter((item) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      item.filename.toLowerCase().includes(q) ||
      (item.alt ?? "").toLowerCase().includes(q) ||
      item.usedIn.some((u) => u.toLowerCase().includes(q))
    );
  });

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center gap-3 border border-ink-white/15 bg-ink-charcoal/40 p-5">
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/svg+xml"
          onChange={handleUpload}
          disabled={uploading}
          className="text-[13px] text-ink-grey file:mr-3 file:cursor-pointer file:border file:border-ink-gold/60 file:bg-transparent file:px-3 file:py-2 file:text-[12px] file:tracking-[0.08em] file:text-ink-gold hover:file:bg-ink-gold/10"
        />
        {uploading && <span className="text-[12px] text-ink-grey">Przesyłanie…</span>}
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Szukaj po nazwie, opisie lub miejscu użycia…"
          className="ml-auto w-full max-w-xs border border-ink-white/20 bg-transparent px-3 py-2 text-[12px] text-ink-white outline-none focus:border-ink-gold"
        />
        <span className="shrink-0 text-[12px] text-ink-grey">
          {filtered.length} / {media.length} plików
        </span>
      </div>

      {filtered.length === 0 ? (
        <p className="border border-dashed border-ink-white/15 px-6 py-10 text-center text-[14px] text-ink-grey">
          {media.length === 0 ? "Brak przesłanych plików." : "Brak wyników dla tego wyszukiwania."}
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {filtered.map((item) => {
            const source = imageSource(item.url);
            return <div key={item.id} className="border border-ink-white/10 bg-ink-charcoal/30">
              <div className="relative aspect-square w-full bg-ink-black">
                {source ? <Image src={source} alt={item.alt ?? ""} fill className="object-cover" sizes="240px" /> : <span className="flex h-full items-center justify-center text-xs text-ink-grey">Brak podglądu</span>}
              </div>
              <div className="flex flex-col gap-2 p-3">
                <p className="truncate text-[11px] text-ink-grey">{item.filename}</p>
                <p className="text-[11px] text-ink-grey/70">
                  {item.width && item.height ? `${item.width}×${item.height} · ` : ""}
                  {formatSize(item.size)}
                </p>
                {item.usedIn.length > 0 ? (
                  <p className="text-[10.5px] leading-snug text-ink-gold/80">
                    Używane w: {item.usedIn.join(", ")}
                  </p>
                ) : (
                  <p className="text-[10.5px] text-ink-grey/60">Nieużywane obecnie</p>
                )}
                <input
                  type="text"
                  defaultValue={item.alt ?? ""}
                  placeholder="Tekst alternatywny / opis"
                  onBlur={(e) => handleAltSave(item.id, e.target.value)}
                  className="border border-ink-white/20 bg-transparent px-2 py-1.5 text-[12px] text-ink-white outline-none focus:border-ink-gold"
                />
                {item.usedIn.length > 0 ? (
                  <p className="text-[10.5px] text-ink-grey/70">Usuń najpierw wszystkie użycia pliku.</p>
                ) : (
                  <ConfirmButton
                    onConfirm={() => handleDelete(item.id)}
                    label="USUŃ"
                    confirmText="Usunąć ten plik na stałe?"
                    pendingLabel="USUWANIE…"
                    className="self-start text-[11px] tracking-[0.05em] text-red-400/80 transition-colors hover:text-red-400"
                  />
                )}
              </div>
            </div>;
          })}
        </div>
      )}
    </div>
  );
}
