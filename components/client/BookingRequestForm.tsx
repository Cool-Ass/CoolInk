"use client";

import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import AppButton from "@/components/ui/AppButton";
import AppModal from "@/components/ui/AppModal";
import InspirationUpload from "@/components/client/InspirationUpload";

const styles = ["Realizm", "Black & Grey", "Fine Line", "Lettering", "Neo Traditional", "Inny"];
const placements = ["Ramię", "Przedramię", "Bark", "Klatka piersiowa", "Plecy", "Żebra", "Udo", "Łydka", "Dłoń", "Szyja", "Inne"];

export default function BookingRequestForm({ startsAt, endsAt, projectId, onClose, tattooStyles = styles }: { startsAt: string; endsAt: string; projectId?: string; onClose: () => void; tattooStyles?: string[] }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [createdProjectId, setCreatedProjectId] = useState<string | null>(null);
  const [inspirations, setInspirations] = useState<File[]>([]);
  const inspirationInput = useRef<HTMLInputElement>(null);
  const [data, setData] = useState({ title: "", description: "", placement: "", size: "", styles: [] as string[], notes: "" });
  const format = new Intl.DateTimeFormat("pl-PL", { dateStyle: "long", timeStyle: "short" });
  const range = `${format.format(new Date(startsAt))}–${new Date(endsAt).toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" })}`;
  const toggle = (style: string) => setData((value) => ({ ...value, styles: value.styles.includes(style) ? value.styles.filter((item) => item !== style) : [...value.styles, style] }));

  function selectInspirations(event: ChangeEvent<HTMLInputElement>) {
    const next = Array.from(event.target.files ?? []).filter((file) => ["image/jpeg", "image/png", "image/webp"].includes(file.type) && file.size <= 10 * 1024 * 1024);
    setInspirations((current) => [...current, ...next].slice(0, 8));
    if (inspirationInput.current) inspirationInput.current.value = "";
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (data.description.trim().length < 12) return setError("Opisz swój pomysł w co najmniej 12 znakach.");
    setSaving(true); setError("");
    try {
      const response = await fetch("/api/client/appointments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId, startsAt, endsAt, ...data }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Nie udało się wysłać prośby.");
      const nextProjectId = result.projectId || null;
      if (nextProjectId && inspirations.length) {
        await Promise.all(inspirations.map(async (file) => { const upload = new FormData(); upload.set("file", file); const uploaded = await fetch(`/api/client/projects/${nextProjectId}/images`, { method: "POST", body: upload }); if (!uploaded.ok) throw new Error("Prośba została wysłana, ale nie udało się dodać części inspiracji."); }));
      }
      setCreatedProjectId(nextProjectId); setDone(true); router.refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Nie udało się wysłać prośby."); }
    finally { setSaving(false); }
  }

  return <AppModal title="Umów wizytę" subtitle="Studio najpierw sprawdzi szczegóły i potwierdzi termin." size="lg" onClose={onClose}>
    {done ? <div className="py-7 text-center"><p className="text-[11px] tracking-[.18em] text-ink-gold">PROŚBA O WIZYTĘ WYSŁANA</p><h2 className="mt-3 font-display text-3xl">Dziękujemy.</h2><p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-ink-grey">Studio odpowie po sprawdzeniu szczegółów oraz terminu. Status znajdziesz w sekcji Moje wizyty.</p>{createdProjectId && <div className="mx-auto mt-5 max-w-md text-left"><p className="text-xs text-ink-grey">Inspiracje możesz uzupełnić później:</p><InspirationUpload projectId={createdProjectId} /></div>}<AppButton className="mt-6" onClick={onClose}>ZOBACZ MOJE WIZYTY</AppButton></div> : <form onSubmit={submit} className="space-y-5"><section className="border border-emerald-500/35 bg-emerald-500/5 p-4"><p className="text-[10px] tracking-[.14em] text-emerald-300">WYBRANY DZIEŃ</p><p className="mt-2 font-display text-xl">{new Intl.DateTimeFormat("pl-PL", { dateStyle: "long" }).format(new Date(startsAt))}</p><p className="mt-4 text-[10px] tracking-[.14em] text-emerald-300">DOSTĘPNY ZAKRES</p><p className="mt-1 text-lg">{range}</p><p className="mt-1 text-xs text-ink-grey">To preferencja dla studia — dokładną godzinę i długość sesji ustalimy po analizie projektu.</p></section><section className="grid gap-5 md:grid-cols-2"><div className="space-y-4"><p className="text-[10px] tracking-[.14em] text-ink-gold">POMYSŁ</p><label className="block text-xs text-ink-grey">NAZWA / KRÓTKI TEMAT (OPCJONALNIE)<input value={data.title} onChange={(e) => setData({ ...data, title: e.target.value })} maxLength={160} className="mt-2 w-full border border-ink-white/20 bg-ink-black px-3 py-3 text-sm text-ink-white" placeholder="Wszystko, byle nie wilk w lesie z lwem w koronie, zegarem w różach na tle księżyca z ukrytym znakiem nieskończoności" /></label><label className="block text-xs text-ink-grey">OPIS / POMYSŁ<textarea required value={data.description} onChange={(e) => setData({ ...data, description: e.target.value })} minLength={12} maxLength={5000} rows={7} className="mt-2 w-full border border-ink-white/20 bg-ink-black px-3 py-3 text-sm text-ink-white" placeholder="Co chcesz zrobić, co jest dla Ciebie ważne?" /></label><label className="block text-xs text-ink-grey">DODATKOWE INFORMACJE (OPCJONALNIE)<textarea value={data.notes} onChange={(e) => setData({ ...data, notes: e.target.value })} maxLength={1000} rows={3} className="mt-2 w-full border border-ink-white/20 bg-ink-black px-3 py-3 text-sm text-ink-white" /></label></div><div className="space-y-4"><p className="text-[10px] tracking-[.14em] text-ink-gold">SZCZEGÓŁY</p><div className="grid gap-4 sm:grid-cols-2"><label className="text-xs text-ink-grey">MIEJSCE<select value={data.placement} onChange={(e) => setData({ ...data, placement: e.target.value })} className="mt-2 w-full border border-ink-white/20 bg-ink-black px-3 py-3 text-sm text-ink-white"><option value="">Wybierz</option>{placements.map((item) => <option key={item}>{item}</option>)}</select></label><label className="text-xs text-ink-grey">ORIENTACYJNY ROZMIAR<input value={data.size} onChange={(e) => setData({ ...data, size: e.target.value })} maxLength={120} className="mt-2 w-full border border-ink-white/20 bg-ink-black px-3 py-3 text-sm text-ink-white" placeholder="Np. 15 cm" /></label></div><div><p className="text-xs text-ink-grey">STYL (OPCJONALNIE)</p><div className="mt-2 flex flex-wrap gap-2">{tattooStyles.map((style) => <button key={style} type="button" onClick={() => toggle(style)} className={`border px-3 py-2 text-xs ${data.styles.includes(style) ? "border-ink-gold bg-ink-gold/10 text-ink-gold" : "border-ink-white/20 text-ink-grey"}`}>{style}</button>)}</div></div><div className="border border-ink-white/10 p-3"><p className="text-xs text-ink-grey">INSPIRACJE (OPCJONALNIE)</p><input ref={inspirationInput} onChange={selectInspirations} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" multiple/><button type="button" onClick={() => inspirationInput.current?.click()} className="mt-3 border border-ink-white/25 px-3 py-2 text-[11px] tracking-[.09em] text-ink-grey hover:border-ink-gold hover:text-ink-gold">+ DODAJ ZDJĘCIA</button><p className="mt-2 text-xs text-ink-grey/75">JPG, PNG lub WEBP · maks. 10 MB na plik.</p>{inspirations.length > 0 && <div className="mt-3 grid grid-cols-4 gap-2">{inspirations.map((file, index) => <div key={`${file.name}-${index}`} className="relative border border-ink-white/10 p-2"><p className="line-clamp-2 text-[9px] text-ink-grey">{file.name}</p><button type="button" aria-label={`Usuń ${file.name}`} onClick={() => setInspirations((items) => items.filter((_, itemIndex) => itemIndex !== index))} className="mt-2 text-[10px] text-red-300">USUŃ</button></div>)}</div>}</div></div></section>{error && <p role="alert" className="border border-red-400/40 bg-red-400/10 p-3 text-sm text-red-300">{error}</p>}<div className="flex justify-end gap-3"><AppButton type="button" variant="ghost" onClick={onClose} disabled={saving}>ANULUJ</AppButton><AppButton type="submit" variant="primary" disabled={saving}>{saving ? "WYSYŁANIE…" : "WYŚLIJ PROŚBĘ O WIZYTĘ"}</AppButton></div></form>}
  </AppModal>;
}
