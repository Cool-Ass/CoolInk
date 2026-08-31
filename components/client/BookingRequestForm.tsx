"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import AppButton from "@/components/ui/AppButton";
import AppModal from "@/components/ui/AppModal";
import InspirationUpload from "@/components/client/InspirationUpload";

const styles = ["Realizm", "Black & Grey", "Fine Line", "Lettering", "Neo Traditional", "Inny"];
const placements = ["Ramię", "Przedramię", "Bark", "Klatka piersiowa", "Plecy", "Żebra", "Udo", "Łydka", "Dłoń", "Szyja", "Inne"];

export default function BookingRequestForm({ startsAt, endsAt, onClose }: { startsAt: string; endsAt: string; onClose: () => void }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [createdProjectId, setCreatedProjectId] = useState<string | null>(null);
  const [data, setData] = useState({ title: "", description: "", placement: "", size: "", styles: [] as string[], notes: "" });
  const format = new Intl.DateTimeFormat("pl-PL", { dateStyle: "long", timeStyle: "short" });
  const range = `${format.format(new Date(startsAt))}–${new Date(endsAt).toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" })}`;
  const toggle = (style: string) => setData((value) => ({ ...value, styles: value.styles.includes(style) ? value.styles.filter((item) => item !== style) : [...value.styles, style] }));

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (data.description.trim().length < 12) return setError("Opisz swój pomysł w co najmniej 12 znakach.");
    setSaving(true); setError("");
    try {
      const response = await fetch("/api/client/appointments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ startsAt, endsAt, ...data }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Nie udało się wysłać prośby.");
      setCreatedProjectId(result.projectId || null); setDone(true); router.refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Nie udało się wysłać prośby."); }
    finally { setSaving(false); }
  }

  return <AppModal title="Umów wizytę" subtitle="Studio najpierw sprawdzi szczegóły i potwierdzi termin." size="lg" onClose={onClose}>
    {done ? <div className="py-7 text-center"><p className="text-[11px] tracking-[.18em] text-ink-gold">PROŚBA O WIZYTĘ WYSŁANA</p><h2 className="mt-3 font-display text-3xl">Dziękujemy.</h2><p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-ink-grey">Studio odpowie po sprawdzeniu szczegółów oraz terminu. Status znajdziesz w sekcji Moje wizyty.</p>{createdProjectId && <div className="mx-auto mt-5 max-w-md text-left"><p className="text-xs text-ink-grey">Możesz od razu dodać zdjęcia inspiracji:</p><InspirationUpload projectId={createdProjectId} /></div>}<AppButton className="mt-6" onClick={onClose}>ZOBACZ MOJE WIZYTY</AppButton></div> : <form onSubmit={submit} className="space-y-6"><section className="border border-emerald-500/35 bg-emerald-500/5 p-4"><p className="text-[10px] tracking-[.14em] text-emerald-300">WYBRANY WOLNY TERMIN</p><p className="mt-2 font-display text-xl">{range}</p><p className="mt-1 text-xs text-ink-grey">Nie musisz wybierać go ponownie.</p></section><section className="space-y-4"><p className="text-[10px] tracking-[.14em] text-ink-gold">TATUAŻ</p><label className="block text-xs text-ink-grey">NAZWA / KRÓTKI TEMAT (OPCJONALNIE)<input value={data.title} onChange={(e) => setData({ ...data, title: e.target.value })} maxLength={160} className="mt-2 w-full border border-ink-white/20 bg-ink-black px-3 py-3 text-sm text-ink-white" placeholder="Np. wilk z księżycem" /></label><label className="block text-xs text-ink-grey">OPIS / POMYSŁ<textarea required value={data.description} onChange={(e) => setData({ ...data, description: e.target.value })} minLength={12} maxLength={5000} rows={5} className="mt-2 w-full border border-ink-white/20 bg-ink-black px-3 py-3 text-sm text-ink-white" placeholder="Co chcesz zrobić, co jest dla Ciebie ważne?" /></label><div className="grid gap-4 sm:grid-cols-2"><label className="text-xs text-ink-grey">MIEJSCE<select value={data.placement} onChange={(e) => setData({ ...data, placement: e.target.value })} className="mt-2 w-full border border-ink-white/20 bg-ink-black px-3 py-3 text-sm text-ink-white"><option value="">Wybierz</option>{placements.map((item) => <option key={item}>{item}</option>)}</select></label><label className="text-xs text-ink-grey">ORIENTACYJNY ROZMIAR<input value={data.size} onChange={(e) => setData({ ...data, size: e.target.value })} maxLength={120} className="mt-2 w-full border border-ink-white/20 bg-ink-black px-3 py-3 text-sm text-ink-white" placeholder="Np. 15 cm" /></label></div><div><p className="text-xs text-ink-grey">STYL (OPCJONALNIE)</p><div className="mt-2 flex flex-wrap gap-2">{styles.map((style) => <button key={style} type="button" onClick={() => toggle(style)} className={`border px-3 py-2 text-xs ${data.styles.includes(style) ? "border-ink-gold bg-ink-gold/10 text-ink-gold" : "border-ink-white/20 text-ink-grey"}`}>{style}</button>)}</div></div><label className="block text-xs text-ink-grey">DODATKOWE INFORMACJE (OPCJONALNIE)<textarea value={data.notes} onChange={(e) => setData({ ...data, notes: e.target.value })} maxLength={1000} rows={3} className="mt-2 w-full border border-ink-white/20 bg-ink-black px-3 py-3 text-sm text-ink-white" /></label></section><p className="border border-ink-white/10 p-3 text-xs leading-relaxed text-ink-grey">Dane kontaktowe pobieramy z Twojego profilu. Po wysłaniu dodasz zdjęcia inspiracji do swojej wizyty.</p>{error && <p role="alert" className="border border-red-400/40 bg-red-400/10 p-3 text-sm text-red-300">{error}</p>}<div className="flex justify-end gap-3"><AppButton type="button" variant="ghost" onClick={onClose} disabled={saving}>ANULUJ</AppButton><AppButton type="submit" variant="primary" disabled={saving}>{saving ? "WYSYŁANIE…" : "WYŚLIJ PROŚBĘ O WIZYTĘ"}</AppButton></div></form>}
  </AppModal>;
}
