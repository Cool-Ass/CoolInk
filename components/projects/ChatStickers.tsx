"use client";
import { useEffect, useState } from "react";
import { prepareBrowserImage } from "@/lib/prepareBrowserImage";
type Sticker = { id: string; name: string; url: string };
export default function ChatStickers({ admin, disabled, onSend }: { admin: boolean; disabled: boolean; onSend: (file: File) => Promise<void> }) {
  const [items, setItems] = useState<Sticker[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { let alive = true; void fetch("/api/chat-stickers").then(async (response) => { if (!response.ok) throw new Error("Nie udało się wczytać naklejek."); const data = await response.json(); if (alive) setItems(data.stickers); }).catch((error: Error) => { if (alive) setError(error.message); }); return () => { alive = false; }; }, []);
  async function add(file?: File) {
    if (!file) return;
    setBusy(true); setError("");
    try { const form = new FormData(); form.set("file", await prepareBrowserImage(file)); form.set("name", file.name); const response = await fetch("/api/chat-stickers", { method: "POST", body: form }); const data = await response.json(); if (!response.ok) throw new Error(data.error); setItems((previous) => [...previous, data.sticker]); }
    catch (error) { setError(error instanceof Error ? error.message : "Błąd przesyłania."); } finally { setBusy(false); }
  }
  async function remove(id: string) {
    if (!window.confirm("Usunąć naklejkę z biblioteki? Wysłane kopie pozostaną w rozmowach.")) return;
    setBusy(true);
    try { const response = await fetch(`/api/chat-stickers?id=${encodeURIComponent(id)}`, { method: "DELETE" }); if (!response.ok) throw new Error("Nie udało się usunąć naklejki."); setItems((previous) => previous.filter((item) => item.id !== id)); }
    catch (error) { setError(error instanceof Error ? error.message : "Błąd połączenia."); } finally { setBusy(false); }
  }
  return <details className="my-2 text-xs"><summary className="cursor-pointer text-ink-gold">Naklejki</summary><div className="mt-2 flex max-h-48 flex-wrap gap-2 overflow-y-auto">{items.map((item) => <div key={item.id}><button type="button" disabled={disabled || busy} title={`Wyślij naklejkę: ${item.name}`} aria-label={`Wyślij naklejkę: ${item.name}`} onClick={async () => { const blob = await (await fetch(item.url)).blob(); await onSend(new File([blob], "naklejka.webp", { type: "image/webp" })); }}><img src={item.url} alt={item.name} width={64} height={64} className="h-16 w-16 object-contain" /></button>{admin && <button type="button" disabled={busy} className="block text-ink-grey" aria-label={`Usuń naklejkę: ${item.name}`} onClick={() => void remove(item.id)}>Usuń</button>}</div>)}</div>{!items.length && <p className="my-2 text-ink-grey">Brak naklejek studia.</p>}{admin && <label className="mt-2 block">Dodaj naklejkę studia (PNG z przezroczystością, JPG lub WEBP)<input type="file" accept="image/png,image/jpeg,image/webp" disabled={busy || disabled} onChange={(event) => { void add(event.target.files?.[0]); event.target.value = ""; }} className="mt-1 block max-w-full" /></label>}{error && <p role="alert" className="text-red-300">{error}</p>}</details>;
}
