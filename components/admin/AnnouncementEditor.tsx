"use client";
import { useRef, useState, type ChangeEvent } from "react";
import AppButton from "@/components/ui/AppButton";
import MediaPickerModal from "@/components/admin/MediaPickerModal";
import type { Announcement } from "@/lib/announcementRules";

const emoji = ["😀", "😊", "😍", "🤩", "🥳", "🫶", "👍", "🙏", "❤️", "🖤", "💛", "🔥", "✨", "🎨", "📸", "✅", "⚠️", "📅", "🌹", "🦋", "💀", "🤘", "🎁", "💬", "📍", "💥", "🎉", "⏰", "💎", "🙌", "🖋️", "⭐"];
type Images = NonNullable<Announcement["images"]>;
export default function AnnouncementEditor({ body, images, disabled, onBodyChange, onImagesChange, onUploading }: { body: string; images: Images; disabled: boolean; onBodyChange: (value: string) => void; onImagesChange: (value: Images) => void; onUploading: (value: boolean) => void }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [picker, setPicker] = useState(false), [emojis, setEmojis] = useState(false);
  const [uploading, setUploading] = useState(false), [error, setError] = useState("");
  const selection = useRef({ start: 0, end: 0 });
  const locked = disabled || uploading;
  function insert(before: string, after = "", example = "", line = false) {
    const { start, end } = selection.current;
    const selected = body.slice(start, end) || example;
    const replacement = line ? selected.split("\n").map(value => before + value).join("\n") : before + selected + after;
    const result = body.slice(0, start) + (line && start > 0 && body[start - 1] !== "\n" ? "\n" : "") + replacement + body.slice(end);
    if (result.length > 2000) { setError("Treść może mieć maksymalnie 2000 znaków."); return; }
    onBodyChange(result);
    requestAnimationFrame(() => { const position = start + replacement.length; ref.current?.focus(); ref.current?.setSelectionRange(position, position); selection.current = { start: position, end: position }; });
  }
  function addImage(url: string) {
    if (images.some(image => image.url === url)) return;
    onImagesChange([...images, { url, alt: "" }].slice(0, 4));
  }
  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || locked || images.length >= 4) return;
    setUploading(true); onUploading(true); setError("");
    try {
      const form = new FormData(); form.append("file", file);
      const response = await fetch("/api/admin/media", { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Nie udało się przesłać obrazu.");
      addImage(data.media.url);
    } catch (e) { setError(e instanceof Error ? e.message : "Nie udało się przesłać obrazu."); }
    finally { setUploading(false); onUploading(false); }
  }
  return <div className="min-w-0 space-y-3">
    <div className="overflow-hidden rounded-md border border-ink-white/20">
      <div role="group" aria-label="Formatowanie komunikatu" className="flex flex-wrap gap-1 border-b border-ink-white/10 p-2">
        {[
          ["Pogrubienie", "B", "**", "**", "tekst", false],
          ["Kursywa", "I", "*", "*", "tekst", false],
          ["Podkreślenie", "U", "__", "__", "tekst", false],
          ["Przekreślenie", "S", "~~", "~~", "tekst", false],
          ["Wyróżnienie", "★", "==", "==", "tekst", false],
          ["Nagłówek", "H", "## ", "", "Nagłówek", true],
          ["Lista punktowana", "•", "- ", "", "Punkt", true],
          ["Lista numerowana", "1.", "1. ", "", "Punkt", true],
          ["Cytat", "❞", "> ", "", "Cytat", true],
        ].map(([label, symbol, before, after, example, line]) => <button key={String(label)} type="button" disabled={locked} aria-label={String(label)} title={String(label)} onMouseDown={e => e.preventDefault()} onClick={() => insert(String(before), String(after), String(example), Boolean(line))} className="min-h-8 min-w-8 rounded px-2 text-xs text-ink-grey hover:bg-ink-white/10 hover:text-ink-white disabled:opacity-40">{symbol}</button>)}
        <button type="button" disabled={locked} aria-label="Wybierz emoji" aria-expanded={emojis} onClick={() => setEmojis(!emojis)} className="min-h-8 rounded px-2 text-sm hover:bg-ink-white/10">😊</button>
      </div>
      {emojis && <div role="group" aria-label="Emoji" className="flex max-h-32 flex-wrap gap-1 overflow-y-auto border-b border-ink-white/10 p-2">{emoji.map(value => <button type="button" key={value} disabled={locked} aria-label={`Dodaj ${value}`} onClick={() => insert(value)} className="h-8 w-8 rounded text-lg hover:bg-ink-white/10">{value}</button>)}</div>}
      <label className="block p-3 text-xs text-ink-grey">Treść<textarea aria-label="Treść" ref={ref} required rows={6} maxLength={2000} disabled={locked} value={body} onChange={e => onBodyChange(e.target.value)} onSelect={e => { selection.current = { start: e.currentTarget.selectionStart, end: e.currentTarget.selectionEnd }; }} className="mt-1 w-full resize-y bg-transparent text-sm text-ink-white outline-none focus-visible:ring-1 focus-visible:ring-ink-gold" /></label>
      <p className="px-3 pb-2 text-[11px] text-ink-grey">Zaznacz tekst i wybierz format. Podgląd obok pokazuje gotowy komunikat. {body.length}/2000</p>
    </div>
    <div className="flex flex-wrap gap-2">
      <AppButton type="button" variant="secondary" disabled={locked || images.length >= 4} onClick={() => setPicker(true)}>Obraz z biblioteki</AppButton>
      <label className={`inline-flex min-h-9 cursor-pointer items-center rounded-md border border-ink-white/20 px-3 text-xs focus-within:ring-2 focus-within:ring-ink-gold ${locked || images.length >= 4 ? "opacity-40" : ""}`}>Prześlij obraz<input type="file" aria-label="Prześlij obraz do komunikatu" accept="image/jpeg,image/png,image/webp" disabled={locked || images.length >= 4} onChange={upload} className="sr-only" /></label>
    </div>
    <p className="text-[11px] text-ink-grey">Do 4 obrazów. Nowe pliki trafiają do publicznej biblioteki studia — nie dodawaj prywatnych zdjęć klientów. Plik pozostanie w bibliotece, nawet jeśli nie opublikujesz komunikatu.</p>
    {images.map((image, i) => <div key={image.url} className="flex min-w-0 items-end gap-2"><label className="min-w-0 flex-1 text-xs text-ink-grey">Opis obrazu {i + 1}<input required maxLength={300} value={image.alt} disabled={locked} onChange={e => onImagesChange(images.map((item, index) => index === i ? { ...item, alt: e.target.value } : item))} className="mt-1 w-full rounded border border-ink-white/20 bg-ink-black px-2 py-2 text-sm" placeholder="Krótko opisz to, co przedstawia obraz" /></label><AppButton type="button" variant="ghost" disabled={locked} onClick={() => onImagesChange(images.filter((_, index) => index !== i))}>Usuń</AppButton></div>)}
    {uploading && <p role="status" className="text-xs text-ink-grey">Przesyłanie obrazu…</p>}
    {error && <p role="alert" className="text-xs text-red-300">{error}</p>}
    {picker && <MediaPickerModal onSelect={url => { addImage(url); setPicker(false); }} onClose={() => setPicker(false)} />}
  </div>;
}
