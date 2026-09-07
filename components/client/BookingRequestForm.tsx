"use client";

import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import AppButton from "@/components/ui/AppButton";
import AppModal from "@/components/ui/AppModal";
import InspirationUpload from "@/components/client/InspirationUpload";

const styles = ["Realizm", "Black & Grey", "Fine Line", "Lettering", "Neo Traditional", "Inny"];
const placements = ["Ramię", "Przedramię", "Bark", "Klatka piersiowa", "Plecy", "Żebra", "Udo", "Łydka", "Dłoń", "Szyja", "Inne"];

export default function BookingRequestForm({
  startsAt,
  endsAt,
  projectId,
  serviceType = "tattoo",
  rescheduleAppointmentId,
  onClose,
  tattooStyles = styles,
}: {
  startsAt: string;
  endsAt: string;
  projectId?: string;
  serviceType?: "tattoo" | "consultation";
  rescheduleAppointmentId?: string;
  onClose: () => void;
  tattooStyles?: string[];
}) {
  const router = useRouter();
  const consultation = serviceType === "consultation";
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [createdProjectId, setCreatedProjectId] = useState<string | null>(null);
  const [inspirations, setInspirations] = useState<File[]>([]);
  const inspirationInput = useRef<HTMLInputElement>(null);
  const [data, setData] = useState({ title: "", description: "", placement: "", size: "", styles: [] as string[], notes: "", consultationMode: "studio" });
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
    const minimum = consultation ? 5 : 12;
    if (data.description.trim().length < minimum) return setError(consultation ? "Napisz krótko, co chcesz omówić." : "Opisz swój pomysł w co najmniej 12 znakach.");
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/client/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: consultation ? undefined : projectId, startsAt, endsAt, serviceType, ...data }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Nie udało się wysłać prośby.");
      const nextProjectId = result.projectId || null;
      if (nextProjectId && inspirations.length) {
        await Promise.all(inspirations.map(async (file) => {
          const upload = new FormData();
          upload.set("file", file);
          const uploaded = await fetch(`/api/client/projects/${nextProjectId}/images`, { method: "POST", body: upload });
          if (!uploaded.ok) throw new Error("Prośba została wysłana, ale nie udało się dodać części zdjęć.");
        }));
      }
      setCreatedProjectId(nextProjectId);
      setDone(true);
      router.refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Nie udało się wysłać prośby."); }
    finally { setSaving(false); }
  }

  async function confirmReschedule() {
    if (!rescheduleAppointmentId) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/client/appointments/${rescheduleAppointmentId}/reschedule`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ startsAt, endsAt, note: data.notes }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Nie udało się przełożyć wizyty.");
      setDone(true);
      router.refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Nie udało się przełożyć wizyty."); }
    finally { setSaving(false); }
  }

  if (rescheduleAppointmentId) return <AppModal title="Przełóż wizytę" subtitle="Studio potwierdzi wybrany przez Ciebie nowy termin." size="md" onClose={onClose}>
    {done ? <div className="py-7 text-center"><p className="text-sm tracking-[.14em] text-ink-gold">PROŚBA WYSŁANA</p><h2 className="mt-3 font-display text-3xl">Nowy termin czeka na potwierdzenie.</h2><p className="mt-3 text-sm leading-relaxed text-ink-grey">Poprzedni termin został zastąpiony nową prośbą. Studio otrzymało powiadomienie.</p><AppButton className="mt-6" onClick={onClose}>WRÓĆ DO PROJEKTÓW</AppButton></div> : <div className="space-y-5"><section className="border border-emerald-500/35 bg-emerald-500/5 p-4"><p className="text-xs tracking-[.14em] text-emerald-300">NOWY TERMIN</p><p className="mt-2 font-display text-2xl">{range}</p></section><label className="block text-sm text-ink-grey">WIADOMOŚĆ DLA STUDIA (OPCJONALNIE)<textarea value={data.notes} onChange={(event) => setData({ ...data, notes: event.target.value })} maxLength={1000} rows={3} className="mt-2 w-full border border-ink-white/20 bg-ink-black px-3 py-3 text-sm text-ink-white" placeholder="Np. krótka informacja, dlaczego zmieniasz termin" /></label>{error && <p role="alert" className="border border-red-400/40 bg-red-400/10 p-3 text-sm text-red-300">{error}</p>}<div className="flex justify-end gap-3"><AppButton type="button" variant="ghost" onClick={onClose} disabled={saving}>WRÓĆ</AppButton><AppButton type="button" onClick={() => void confirmReschedule()} disabled={saving}>{saving ? "ZAPISYWANIE…" : "POTWIERDŹ NOWY TERMIN"}</AppButton></div></div>}
  </AppModal>;

  const uploadBox = <div className="border border-ink-white/10 p-4">
    <p className="text-sm text-ink-grey">ZDJĘCIA LUB INSPIRACJE (OPCJONALNIE)</p>
    <input ref={inspirationInput} onChange={selectInspirations} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" multiple />
    <button type="button" onClick={() => inspirationInput.current?.click()} className="mt-3 border border-ink-white/25 px-3 py-2.5 text-xs tracking-[.09em] text-ink-grey hover:border-ink-gold hover:text-ink-gold">+ DODAJ ZDJĘCIA</button>
    <p className="mt-2 text-xs text-ink-grey/75">JPG, PNG lub WEBP · maks. 10 MB na plik.</p>
    {inspirations.length > 0 && <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">{inspirations.map((file, index) => <div key={`${file.name}-${index}`} className="border border-ink-white/10 p-2"><p className="line-clamp-2 text-xs text-ink-grey">{file.name}</p><button type="button" aria-label={`Usuń ${file.name}`} onClick={() => setInspirations((items) => items.filter((_, itemIndex) => itemIndex !== index))} className="mt-2 text-xs text-red-300">USUŃ</button></div>)}</div>}
  </div>;

  return <AppModal title={consultation ? "Umów konsultację" : "Umów wizytę"} subtitle={consultation ? "Krótka rozmowa przed podjęciem decyzji o projekcie." : "Studio najpierw sprawdzi szczegóły i potwierdzi termin."} size="lg" onClose={onClose}>
    {done ? <div className="py-7 text-center"><p className="text-sm tracking-[.16em] text-ink-gold">{consultation ? "KONSULTACJA ZGŁOSZONA" : "PROŚBA O WIZYTĘ WYSŁANA"}</p><h2 className="mt-3 font-display text-3xl">Dziękujemy.</h2><p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-ink-grey">{consultation ? "Studio potwierdzi termin konsultacji. Wszystkie informacje znajdziesz w swoim koncie." : "Studio odpowie po sprawdzeniu szczegółów oraz terminu."}</p>{createdProjectId && inspirations.length === 0 && <div className="mx-auto mt-5 max-w-md text-left"><p className="text-sm text-ink-grey">Zdjęcia możesz uzupełnić później:</p><InspirationUpload projectId={createdProjectId} /></div>}<AppButton className="mt-6" onClick={onClose}>PRZEJDŹ DO PROJEKTÓW</AppButton></div> : <form onSubmit={submit} className="space-y-5">
      <section className={`border p-4 ${consultation ? "border-blue-400/35 bg-blue-400/5" : "border-emerald-500/35 bg-emerald-500/5"}`}><p className={`text-sm tracking-[.12em] ${consultation ? "text-blue-200" : "text-emerald-300"}`}>{consultation ? "WYBRANA KONSULTACJA" : "WYBRANY TERMIN"}</p><p className="mt-2 font-display text-xl">{range}</p><p className="mt-2 text-sm text-ink-grey">{consultation ? "Po konsultacji wszystkie notatki i zdjęcia będzie można jednym kliknięciem zachować jako projekt tatuażu." : "To preferencja dla studia — dokładną długość sesji ustalimy po analizie projektu."}</p></section>

      {consultation ? <section className="grid gap-5 md:grid-cols-2">
        <div className="space-y-4"><label className="block text-sm text-ink-grey">TEMAT ROZMOWY (OPCJONALNIE)<input value={data.title} onChange={(event) => setData({ ...data, title: event.target.value })} maxLength={160} className="mt-2 w-full border border-ink-white/20 bg-ink-black px-3 py-3 text-sm text-ink-white" placeholder="Np. cover-up starego tatuażu" /></label><label className="block text-sm text-ink-grey">CO CHCESZ OMÓWIĆ?<textarea required value={data.description} onChange={(event) => setData({ ...data, description: event.target.value })} minLength={5} maxLength={5000} rows={6} className="mt-2 w-full border border-ink-white/20 bg-ink-black px-3 py-3 text-sm text-ink-white" placeholder="Napisz krótko, z czym przychodzisz i czego potrzebujesz." /></label></div>
        <div className="space-y-4"><fieldset><legend className="text-sm text-ink-grey">FORMA KONSULTACJI</legend><div className="mt-2 grid gap-2">{[["studio", "W studiu"], ["phone", "Telefonicznie"], ["video", "Rozmowa wideo"]].map(([value, label]) => <label key={value} className={`flex cursor-pointer items-center gap-3 border p-3 text-sm ${data.consultationMode === value ? "border-blue-300 bg-blue-400/10 text-blue-100" : "border-ink-white/15 text-ink-grey"}`}><input type="radio" name="consultationMode" value={value} checked={data.consultationMode === value} onChange={() => setData({ ...data, consultationMode: value })} />{label}</label>)}</div></fieldset>{uploadBox}</div>
      </section> : <section className="grid gap-5 md:grid-cols-2">
        <div className="space-y-4"><label className="block text-sm text-ink-grey">NAZWA / KRÓTKI TEMAT (OPCJONALNIE)<input value={data.title} onChange={(event) => setData({ ...data, title: event.target.value })} maxLength={160} className="mt-2 w-full border border-ink-white/20 bg-ink-black px-3 py-3 text-sm text-ink-white" placeholder="Np. ornament na przedramię" /></label><label className="block text-sm text-ink-grey">OPIS / POMYSŁ<textarea required value={data.description} onChange={(event) => setData({ ...data, description: event.target.value })} minLength={12} maxLength={5000} rows={7} className="mt-2 w-full border border-ink-white/20 bg-ink-black px-3 py-3 text-sm text-ink-white" placeholder="Co chcesz zrobić i co jest dla Ciebie ważne?" /></label><label className="block text-sm text-ink-grey">DODATKOWE INFORMACJE (OPCJONALNIE)<textarea value={data.notes} onChange={(event) => setData({ ...data, notes: event.target.value })} maxLength={1000} rows={3} className="mt-2 w-full border border-ink-white/20 bg-ink-black px-3 py-3 text-sm text-ink-white" /></label></div>
        <div className="space-y-4"><div className="grid gap-4 sm:grid-cols-2"><label className="text-sm text-ink-grey">MIEJSCE<select value={data.placement} onChange={(event) => setData({ ...data, placement: event.target.value })} className="mt-2 w-full border border-ink-white/20 bg-ink-black px-3 py-3 text-sm text-ink-white"><option value="">Wybierz</option>{placements.map((item) => <option key={item}>{item}</option>)}</select></label><label className="text-sm text-ink-grey">ORIENTACYJNY ROZMIAR<input value={data.size} onChange={(event) => setData({ ...data, size: event.target.value })} maxLength={120} className="mt-2 w-full border border-ink-white/20 bg-ink-black px-3 py-3 text-sm text-ink-white" placeholder="Np. 15 cm" /></label></div><div><p className="text-sm text-ink-grey">STYL (OPCJONALNIE)</p><div className="mt-2 flex flex-wrap gap-2">{tattooStyles.map((style) => <button key={style} type="button" onClick={() => toggle(style)} className={`border px-3 py-2 text-xs ${data.styles.includes(style) ? "border-ink-gold bg-ink-gold/10 text-ink-gold" : "border-ink-white/20 text-ink-grey"}`}>{style}</button>)}</div></div>{uploadBox}</div>
      </section>}

      {error && <p role="alert" className="border border-red-400/40 bg-red-400/10 p-3 text-sm text-red-300">{error}</p>}
      <div className="flex justify-end gap-3"><AppButton type="button" variant="ghost" onClick={onClose} disabled={saving}>ANULUJ</AppButton><AppButton type="submit" variant="primary" disabled={saving}>{saving ? "WYSYŁANIE…" : consultation ? "WYŚLIJ PROŚBĘ O KONSULTACJĘ" : "WYŚLIJ PROŚBĘ O WIZYTĘ"}</AppButton></div>
    </form>}
  </AppModal>;
}
