"use client";

import Image from "next/image";
import { useRef, useState, type ChangeEvent } from "react";
import { ChevronDown, X } from "lucide-react";
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
  const [expandedId, setExpandedId] = useState<string | null>(null);
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
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3 border border-ink-white/15 bg-ink-charcoal/40 p-3 sm:p-4">
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
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {filtered.map((item) => {
            const source = imageSource(item.url);
            const expanded = expandedId === item.id;
            return <article key={item.id} className={`overflow-hidden border bg-ink-charcoal/30 transition-colors ${expanded ? "border-ink-gold/55" : "border-ink-white/10 hover:border-ink-white/25"}`}>
              <div className="relative aspect-[4/3] w-full bg-ink-black">
                <button type="button" onClick={() => setExpandedId(expanded ? null : item.id)} aria-expanded={expanded} className="absolute inset-0 z-10 w-full">
                  <span className="sr-only">{expanded ? "Zwiń informacje" : "Pokaż informacje"} o pliku {item.filename}</span>
                </button>
                {source ? <Image src={source} alt={item.alt ?? ""} fill className="object-cover" sizes="(max-width: 639px) 50vw, (max-width: 1279px) 33vw, 20vw" /> : <span className="flex h-full items-center justify-center text-xs text-ink-grey">Brak podglądu</span>}
                <ConfirmButton
                  onConfirm={() => handleDelete(item.id)}
                  label={<X className="h-4 w-4" />}
                  confirmText={item.usedIn.length ? `Plik jest używany w: ${item.usedIn.join(", ")}. Usunięcie zostanie zablokowane do czasu usunięcia tych użyć.` : "Usunąć ten plik na stałe?"}
                  pendingLabel="USUWANIE…"
                  className="absolute right-1.5 top-1.5 z-20 flex h-8 w-8 items-center justify-center border border-red-400/45 bg-ink-black/85 text-red-300 shadow-lg transition-colors hover:border-red-400 hover:bg-red-500/15"
                />
                <span className={`pointer-events-none absolute bottom-1.5 right-1.5 z-20 flex h-7 w-7 items-center justify-center bg-ink-black/75 text-ink-white transition-transform ${expanded ? "rotate-180" : ""}`}><ChevronDown className="h-4 w-4" /></span>
              </div>
              <div className="flex items-center justify-between gap-2 px-3 py-2">
                <p className="min-w-0 truncate text-[11px] text-ink-grey">{item.filename}</p>
                <span className="shrink-0 text-[9px] text-ink-gold">{item.usedIn.length ? "UŻYWANY" : "WOLNY"}</span>
              </div>
              {expanded && <div className="flex flex-col gap-2 border-t border-ink-white/10 p-3">
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
                {item.usedIn.length > 0 && <p className="text-[10.5px] text-ink-grey/70">Aby usunąć plik, najpierw usuń wszystkie jego użycia.</p>}
              </div>}
            </article>;
          })}
        </div>
      )}
    </div>
  );
}
