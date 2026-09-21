"use client";
import { prepareBrowserImage } from "@/lib/prepareBrowserImage";

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import DocumentFields from "@/components/client/DocumentFields";
import { parseDocumentFields, validateDocumentAnswers, type DocumentAnswers } from "@/lib/documentForms";
import AppButton from "@/components/ui/AppButton";
import AppModal from "@/components/ui/AppModal";
import InspirationUpload from "@/components/client/InspirationUpload";
import { LEAD_SOURCES } from "@/lib/leadSource";
import { formatCoolinkDateTime, formatCoolinkTime } from "@/lib/dateTime";
import { sanitizeRichText } from "@/lib/richText";

const styles = ["Realizm", "Black & Grey", "Fine Line", "Lettering", "Neo Traditional", "Inny"];
const placements = ["Ramię", "Przedramię", "Bark", "Klatka piersiowa", "Plecy", "Żebra", "Udo", "Łydka", "Dłoń", "Szyja", "Inne"];

export type BookingConsent = { id: string; title: string; version: number; content: string; formFields?: string; answers?: DocumentAnswers; accepted: boolean };

export default function BookingRequestForm({
  startsAt,
  endsAt,
  projectId: initialProjectId,
  projects = [],
  serviceType = "tattoo",
  rescheduleAppointmentId,
  onClose,
  tattooStyles = styles,
  consents = [],
  intro,
}: {
  startsAt: string;
  endsAt: string;
  projectId?: string;
  projects?: { id: string; title: string }[];
  serviceType?: "tattoo" | "consultation";
  rescheduleAppointmentId?: string;
  onClose: () => void;
  tattooStyles?: string[];
  consents?: BookingConsent[];
  intro?: ReactNode;
}) {
  const router = useRouter();
  const consultation = serviceType === "consultation";
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [completionWarning, setCompletionWarning] = useState("");
  const [done, setDone] = useState(false);
  const [createdProjectId, setCreatedProjectId] = useState<string | null>(null);
  const [projectId, setProjectId] = useState(initialProjectId ?? "");
  const [inspirations, setInspirations] = useState<File[]>([]);
  const [consentAnswers, setConsentAnswers] = useState<Record<string, DocumentAnswers>>(() => Object.fromEntries(consents.map((item) => [item.id, item.answers ?? {}])));
  const [acceptedConsentIds, setAcceptedConsentIds] = useState(() => new Set(consents.filter((item) => item.accepted).map((item) => item.id)));
  const [confirmationAcknowledged, setConfirmationAcknowledged] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const inspirationInput = useRef<HTMLInputElement>(null);
  const [data, setData] = useState({ title: "", description: "", placement: "", size: "", styles: [] as string[], notes: "", consultationMode: "studio", leadSource: "" });
  const [loyaltyRequested, setLoyaltyRequested] = useState(false);
  const [draftBusy, setDraftBusy] = useState(false);
  const [draftMessage, setDraftMessage] = useState("");
  const [savedData, setSavedData] = useState(JSON.stringify(data));
  const dirty = !done && (JSON.stringify(data) !== savedData || inspirations.length > 0 || loyaltyRequested);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  function closeForm() {
    if (saving || draftBusy) return;
    if (!dirty || window.confirm("Niezapisane informacje i wybrane zdjęcia zostaną utracone. Zamknąć formularz?")) onClose();
  }
  async function draftAction(action: "save" | "load" | "delete") {
    if (draftBusy) return;
    if (action !== "save" && dirty && !window.confirm("Zastąpić niezapisane dane formularza?")) return;
    setDraftBusy(true); setDraftMessage("");
    const snapshot = JSON.stringify(data);
    try {
      const response = await fetch("/api/client/booking-draft", action === "load" ? { cache: "no-store" } : { method: "PUT", headers: { "Content-Type": "application/json" }, body: action === "delete" ? "null" : snapshot });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Nie udało się zapisać szkicu.");
      if (action === "load") {
        if (!result.draft) { setDraftMessage("Brak zapisanego szkicu."); return; }
        setData(result.draft); setSavedData(JSON.stringify(result.draft)); setProjectId(""); setStep(1); setConfirmationAcknowledged(false);
        setAcceptedConsentIds(new Set(consents.filter((item) => item.accepted).map((item) => item.id)));
      } else if (action === "save") setSavedData(snapshot);
      setDraftMessage(action === "delete" ? "Usunięto szkic z konta." : action === "load" ? "Wczytano treść. Sprawdź termin i ponownie potwierdź zgody." : "Szkic zapisany na koncie. Zdjęcia, termin i zgody nie są zapisywane w szkicu.");
    } catch (error) { setDraftMessage(error instanceof Error ? error.message : "Błąd połączenia."); }
    finally { setDraftBusy(false); }
  }
  const range = `${formatCoolinkDateTime(startsAt, { dateStyle: "long", timeStyle: "short" })}–${formatCoolinkTime(endsAt)}`;
  const toggle = (style: string) => setData((value) => ({ ...value, styles: value.styles.includes(style) ? value.styles.filter((item) => item !== style) : [...value.styles, style] }));

  function advance() {
    setError("");
    if (step === 1 && (!projectId || consultation) && data.description.trim().length < (consultation ? 5 : 12)) { setError(consultation ? "Napisz krótko, co chcesz omówić." : "Opisz swój pomysł w co najmniej 12 znakach."); return; }
    if (step === 3 && consents.some((item) => !acceptedConsentIds.has(item.id))) { setError("Zaakceptuj aktualne zgody wymagane do wysłania prośby."); return; }
    if (step === 3) { try { for (const consent of consents.filter((item) => !item.accepted)) validateDocumentAnswers(parseDocumentFields(consent.formFields), consentAnswers[consent.id] ?? {}); } catch (error) { setError(error instanceof Error ? error.message : "Uzupełnij formularz."); return; } }
    setStep((current) => Math.min(4, current + 1) as 1 | 2 | 3 | 4);
  }

  function selectInspirations(event: ChangeEvent<HTMLInputElement>) {
    const next = Array.from(event.target.files ?? []).filter((file) => ["image/jpeg", "image/png", "image/webp"].includes(file.type) && file.size <= 8 * 1024 * 1024);
    setInspirations((current) => [...current, ...next].slice(0, 8));
    if (inspirationInput.current) inspirationInput.current.value = "";
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const minimum = consultation ? 5 : 12;
    if ((!projectId || consultation) && data.description.trim().length < minimum) return setError(consultation ? "Napisz krótko, co chcesz omówić." : "Opisz swój pomysł w co najmniej 12 znakach.");
    if (consents.some((item) => !acceptedConsentIds.has(item.id))) return setError("Zaakceptuj aktualne zgody wymagane do wysłania prośby.");
    if (!confirmationAcknowledged) return setError("Potwierdź poprawność projektu, terminu i zgód.");
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/client/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: consultation ? undefined : projectId || undefined, startsAt, endsAt, serviceType, consents: consents.map(({ id, version }) => ({ id, version, answers: consentAnswers[id] ?? {} })), confirmationAcknowledged, loyaltyRequested, ...data }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Nie udało się wysłać prośby.");
      const nextProjectId = result.projectId || null;
      if (nextProjectId && inspirations.length) {
        const uploads = await Promise.allSettled(inspirations.map(async (file) => {
          const upload = new FormData();
          upload.set("file", await prepareBrowserImage(file));
          const uploaded = await fetch(`/api/client/projects/${nextProjectId}/images`, { method: "POST", body: upload });
          if (!uploaded.ok) throw new Error("upload_failed");
        }));
        if (uploads.some((upload) => upload.status === "rejected")) setCompletionWarning("Prośba została wysłana, ale części zdjęć nie udało się dodać. Możesz przesłać je ponownie poniżej bez tworzenia drugiej wizyty.");
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

  if (rescheduleAppointmentId) return <AppModal title="Przełóż wizytę" subtitle="Studio potwierdzi wybrany przez Ciebie nowy termin." size="md" onClose={closeForm}>
    {done ? <div className="py-7 text-center"><p className="text-sm tracking-[.14em] text-ink-gold">PROŚBA WYSŁANA</p><h2 className="mt-3 font-display text-3xl">Nowy termin czeka na potwierdzenie.</h2><p className="mt-3 text-sm leading-relaxed text-ink-grey">Poprzedni termin został zastąpiony nową prośbą. Studio otrzymało powiadomienie.</p><AppButton className="mt-6" onClick={() => { onClose(); router.push(`/app/portal/projects?project=${createdProjectId || ""}`); }}>WRÓĆ DO PROJEKTÓW</AppButton></div> : <div className="space-y-5"><section className="border border-emerald-500/35 bg-emerald-500/5 p-4"><p className="text-xs tracking-[.14em] text-emerald-300">NOWY TERMIN</p><p className="mt-2 font-display text-2xl">{range}</p></section><label className="block text-sm text-ink-grey">WIADOMOŚĆ DLA STUDIA (OPCJONALNIE)<textarea value={data.notes} onChange={(event) => setData({ ...data, notes: event.target.value })} maxLength={1000} rows={3} className="mt-2 w-full border border-ink-white/20 bg-ink-black px-3 py-3 text-sm text-ink-white" placeholder="Np. krótka informacja, dlaczego zmieniasz termin" /></label>{error && <p role="alert" className="border border-red-400/40 bg-red-400/10 p-3 text-sm text-red-300">{error}</p>}<div className="flex justify-end gap-3"><AppButton type="button" variant="ghost" onClick={closeForm} disabled={saving}>WRÓĆ</AppButton><AppButton type="button" onClick={() => void confirmReschedule()} disabled={saving}>{saving ? "ZAPISYWANIE…" : "POTWIERDŹ NOWY TERMIN"}</AppButton></div></div>}
  </AppModal>;

  const uploadBox = <div className="border border-ink-white/10 p-4">
    <p className="text-sm text-ink-grey">ZDJĘCIA LUB INSPIRACJE (OPCJONALNIE)</p>
    <input ref={inspirationInput} onChange={selectInspirations} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" multiple />
    <button type="button" onClick={() => inspirationInput.current?.click()} className="mt-3 border border-ink-white/25 px-3 py-2.5 text-xs tracking-[.09em] text-ink-grey hover:border-ink-gold hover:text-ink-gold">+ DODAJ ZDJĘCIA</button>
    <p className="mt-2 text-xs text-ink-grey/75">JPG, PNG lub WEBP · maks. 8 MB na plik.</p>
    {inspirations.length > 0 && <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">{inspirations.map((file, index) => <div key={`${file.name}-${index}`} className="border border-ink-white/10 p-2"><p className="line-clamp-2 text-xs text-ink-grey">{file.name}</p><button type="button" aria-label={`Usuń ${file.name}`} onClick={() => setInspirations((items) => items.filter((_, itemIndex) => itemIndex !== index))} className="mt-2 text-xs text-red-300">USUŃ</button></div>)}</div>}
  </div>;

  return <AppModal title={consultation ? "Umów konsultację" : "Umów wizytę"} subtitle={consultation ? "Krótka rozmowa przed podjęciem decyzji o projekcie." : "Studio najpierw sprawdzi szczegóły i potwierdzi termin."} size="lg" onClose={closeForm}>
    {done ? <div className="py-7 text-center"><p className="text-sm tracking-[.16em] text-ink-gold">{consultation ? "KONSULTACJA ZGŁOSZONA" : "PROŚBA O WIZYTĘ WYSŁANA"}</p><h2 className="mt-3 font-display text-3xl">Dziękujemy.</h2><p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-ink-grey">{consultation ? "Studio potwierdzi termin konsultacji. Wszystkie informacje znajdziesz w swoim koncie." : "Studio odpowie po sprawdzeniu szczegółów oraz terminu."}</p>{completionWarning && <p role="alert" className="mx-auto mt-4 max-w-md border border-amber-400/40 bg-amber-400/10 p-3 text-left text-sm text-amber-200">{completionWarning}</p>}{createdProjectId && (inspirations.length === 0 || completionWarning) && <div className="mx-auto mt-5 max-w-md text-left"><p className="text-sm text-ink-grey">Zdjęcia możesz uzupełnić później:</p><InspirationUpload projectId={createdProjectId} /></div>}<AppButton className="mt-6" onClick={closeForm}>PRZEJDŹ DO PROJEKTÓW</AppButton></div> : <form onSubmit={submit} className="space-y-5">
      <div className="flex flex-wrap gap-3 text-xs"><button type="button" disabled={draftBusy || saving} onClick={() => void draftAction("save")}>Zapisz szkic</button><button type="button" disabled={draftBusy || saving} onClick={() => void draftAction("load")}>Wczytaj szkic</button><button type="button" disabled={draftBusy || saving} onClick={() => void draftAction("delete")}>Usuń zapisany szkic</button></div>
      {draftMessage && <p role="status" className="text-xs text-ink-gold">{draftMessage}</p>}
      {!consultation && <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={loyaltyRequested} onChange={(event) => setLoyaltyRequested(event.target.checked)} /><span>Chcę wykorzystać nagrodę lojalnościową<span className="block text-xs text-ink-grey">To tylko zgłoszenie. Studio sprawdzi pieczątki i potwierdzi rabat przy rozliczeniu.</span></span></label>}
      {intro && <div className="mb-5">{intro}</div>}
      <ol aria-label="Etapy rezerwacji" className="grid grid-cols-4 gap-1 text-center text-[9px] tracking-[.08em] text-ink-grey sm:text-[10px]">{["PROJEKT", "TERMIN", "ZGODY", "POTWIERDZENIE"].map((label, index) => { const number = index + 1; return <li key={label} aria-current={number === step ? "step" : undefined} className={`border-b pb-2 ${number === step ? "border-ink-gold text-ink-gold" : number < step ? "border-emerald-400 text-emerald-300" : "border-ink-white/20"}`}>{number} {label}</li>; })}</ol>

      {step === 1 && <div className="space-y-5">
        {!consultation && <label className="block text-sm text-ink-grey">PROJEKT<select value={projectId} onChange={(event) => { setProjectId(event.target.value); setError(""); }} className="mt-2 w-full border border-ink-white/20 bg-ink-black px-3 py-3 text-sm text-ink-white"><option value="">+ Utwórz nowy projekt dla tej wizyty</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.title}</option>)}</select><span className="mt-2 block text-xs leading-relaxed text-ink-grey/80">Utwórz nowy projekt albo dopisz wizytę do istniejącego — bez opuszczania kreatora.</span></label>}
        {consultation ? <section className="grid gap-5 md:grid-cols-2"><div className="space-y-4"><label className="block text-sm text-ink-grey">TEMAT ROZMOWY (OPCJONALNIE)<input value={data.title} onChange={(event) => setData({ ...data, title: event.target.value })} maxLength={160} className="mt-2 w-full border border-ink-white/20 bg-ink-black px-3 py-3 text-sm text-ink-white" placeholder="Np. cover-up starego tatuażu" /></label><label className="block text-sm text-ink-grey">CO CHCESZ OMÓWIĆ?<textarea value={data.description} onChange={(event) => setData({ ...data, description: event.target.value })} minLength={5} maxLength={5000} rows={6} className="mt-2 w-full border border-ink-white/20 bg-ink-black px-3 py-3 text-sm text-ink-white" placeholder="Napisz krótko, z czym przychodzisz i czego potrzebujesz." /></label></div><div className="space-y-4"><fieldset><legend className="text-sm text-ink-grey">FORMA KONSULTACJI</legend><div className="mt-2 grid gap-2">{[["studio", "W studiu"], ["phone", "Telefonicznie"], ["video", "Rozmowa wideo"]].map(([value, label]) => <label key={value} className={`flex cursor-pointer items-center gap-3 border p-3 text-sm ${data.consultationMode === value ? "border-emerald-400 bg-emerald-400/10 text-emerald-100" : "border-ink-white/15 text-ink-grey"}`}><input type="radio" name="consultationMode" value={value} checked={data.consultationMode === value} onChange={() => setData({ ...data, consultationMode: value })} />{label}</label>)}</div></fieldset>{uploadBox}</div></section> : <section className="grid gap-5 md:grid-cols-2"><div className="space-y-4">{projectId ? <div className="border-l-2 border-ink-gold bg-ink-gold/5 p-4"><p className="text-[10px] tracking-[.12em] text-ink-gold">WIZYTA W ISTNIEJĄCYM PROJEKCIE</p><p className="mt-2 text-sm text-ink-white">{projects.find((project) => project.id === projectId)?.title}</p><p className="mt-1 text-xs text-ink-grey">Opis i dotychczasowe materiały projektu pozostają bez zmian.</p></div> : <><label className="block text-sm text-ink-grey">NAZWA / KRÓTKI TEMAT (OPCJONALNIE)<input value={data.title} onChange={(event) => setData({ ...data, title: event.target.value })} maxLength={160} className="mt-2 w-full border border-ink-white/20 bg-ink-black px-3 py-3 text-sm text-ink-white" placeholder="Np. ornament na przedramię" /></label><label className="block text-sm text-ink-grey">OPIS / POMYSŁ<textarea value={data.description} onChange={(event) => setData({ ...data, description: event.target.value })} minLength={12} maxLength={5000} rows={7} className="mt-2 w-full border border-ink-white/20 bg-ink-black px-3 py-3 text-sm text-ink-white" placeholder="Co chcesz zrobić i co jest dla Ciebie ważne?" /></label></>}<label className="block text-sm text-ink-grey">DODATKOWE INFORMACJE (OPCJONALNIE)<textarea value={data.notes} onChange={(event) => setData({ ...data, notes: event.target.value })} maxLength={1000} rows={3} className="mt-2 w-full border border-ink-white/20 bg-ink-black px-3 py-3 text-sm text-ink-white" /></label></div><div className="space-y-4">{!projectId && <><div className="grid gap-4 sm:grid-cols-2"><label className="text-sm text-ink-grey">MIEJSCE<select value={data.placement} onChange={(event) => setData({ ...data, placement: event.target.value })} className="mt-2 w-full border border-ink-white/20 bg-ink-black px-3 py-3 text-sm text-ink-white"><option value="">Wybierz</option>{placements.map((item) => <option key={item}>{item}</option>)}</select></label><label className="text-sm text-ink-grey">ORIENTACYJNY ROZMIAR<input value={data.size} onChange={(event) => setData({ ...data, size: event.target.value })} maxLength={120} className="mt-2 w-full border border-ink-white/20 bg-ink-black px-3 py-3 text-sm text-ink-white" placeholder="Np. 15 cm" /></label></div><div><p className="text-sm text-ink-grey">STYL (OPCJONALNIE)</p><div className="mt-2 flex flex-wrap gap-2">{tattooStyles.map((style) => <button key={style} type="button" onClick={() => toggle(style)} className={`border px-3 py-2 text-xs ${data.styles.includes(style) ? "border-ink-gold bg-ink-gold/10 text-ink-gold" : "border-ink-white/20 text-ink-grey"}`}>{style}</button>)}</div></div></>}{uploadBox}</div></section>}
        {!projectId && <label className="block text-sm text-ink-grey">SKĄD O MNIE WIESZ? (OPCJONALNIE)<select value={data.leadSource} onChange={(event) => setData({ ...data, leadSource: event.target.value })} className="mt-2 w-full border border-ink-white/20 bg-ink-black px-3 py-3 text-sm text-ink-white"><option value="">Nie podano</option>{LEAD_SOURCES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>}
      </div>}

      {step === 2 && <section className="border border-emerald-500/35 bg-emerald-500/5 p-4"><p className="text-sm tracking-[.12em] text-emerald-300">{consultation ? "WYBRANA KONSULTACJA" : "WYBRANY TERMIN"}</p><p className="mt-2 font-display text-2xl">{range}</p><p className="mt-2 text-sm text-ink-grey">{consultation ? "Po konsultacji notatki i zdjęcia można zachować jako projekt tatuażu." : "Studio sprawdzi zakres projektu i ostatecznie potwierdzi długość sesji."}</p></section>}

      {step === 3 && (consents.length > 0 ? <fieldset className="border border-ink-white/15 p-4"><legend className="px-2 text-xs tracking-[.12em] text-ink-gold">WYMAGANE ZGODY</legend><div className="space-y-3">{consents.map((consent) => <div key={consent.id} className="border border-ink-white/10 p-3"><label className="flex cursor-pointer items-start gap-3 text-sm text-ink-white"><input type="checkbox" className="mt-1" checked={acceptedConsentIds.has(consent.id)} disabled={consent.accepted} onChange={(event) => setAcceptedConsentIds((current) => { const next = new Set(current); if (event.target.checked) next.add(consent.id); else next.delete(consent.id); return next; })} /><span>{consent.title} <span className="text-xs text-ink-grey">· wersja {consent.version}{consent.accepted ? " · zaakceptowana" : ""}</span></span></label><details className="mt-2 text-xs text-ink-grey"><summary className="cursor-pointer text-ink-gold">Pokaż treść</summary><div className="document-rich-text mt-3 max-h-48 overflow-y-auto pr-2" dangerouslySetInnerHTML={{ __html: sanitizeRichText(consent.content) }} /></details><DocumentFields fields={consent.formFields ?? "[]"} answers={consentAnswers[consent.id] ?? {}} onChange={(answers) => setConsentAnswers({ ...consentAnswers, [consent.id]: answers })} disabled={consent.accepted} /></div>)}</div></fieldset> : <p className="border border-ink-white/15 p-5 text-sm text-ink-grey">Studio nie wymaga obecnie dodatkowych zgód na tym etapie.</p>)}

      {step === 4 && <div className="space-y-4"><section className="grid gap-3 border border-ink-white/15 p-4 sm:grid-cols-2"><div><p className="text-[10px] tracking-[.12em] text-ink-gold">PROJEKT</p><p className="mt-1 text-sm text-ink-white">{consultation ? data.title || "Konsultacja tatuażu" : projectId ? projects.find((project) => project.id === projectId)?.title : data.title || "Nowy projekt tatuażu"}</p></div><div><p className="text-[10px] tracking-[.12em] text-ink-gold">TERMIN</p><p className="mt-1 text-sm text-ink-white">{range}</p></div><div><p className="text-[10px] tracking-[.12em] text-ink-gold">ZGODY</p><p className="mt-1 text-sm text-ink-white">{consents.length ? `${consents.length} zaakceptowane` : "Brak wymaganych"}</p></div><div><p className="text-[10px] tracking-[.12em] text-ink-gold">STATUS</p><p className="mt-1 text-sm text-ink-white">Oczekuje na potwierdzenie studia</p></div></section><label className="flex cursor-pointer items-start gap-3 border border-ink-gold/30 bg-ink-gold/5 p-4 text-sm text-ink-white"><input type="checkbox" className="mt-1" checked={confirmationAcknowledged} onChange={(event) => setConfirmationAcknowledged(event.target.checked)} /><span>Potwierdzam poprawność projektu, terminu i zaakceptowanych wersji zgód.</span></label></div>}

      {error && <p role="alert" className="border border-red-400/40 bg-red-400/10 p-3 text-sm text-red-300">{error}</p>}
      <div className="flex flex-wrap justify-between gap-3"><AppButton type="button" variant="ghost" onClick={closeForm} disabled={saving}>ANULUJ</AppButton><div className="flex gap-3">{step > 1 && <AppButton type="button" variant="ghost" onClick={() => { setError(""); setStep((current) => Math.max(1, current - 1) as 1 | 2 | 3 | 4); }} disabled={saving}>WSTECZ</AppButton>}{step < 4 ? <AppButton type="button" variant="primary" onClick={advance}>DALEJ</AppButton> : <AppButton type="submit" variant="primary" disabled={saving}>{saving ? "WYSYŁANIE…" : consultation ? "WYŚLIJ PROŚBĘ O KONSULTACJĘ" : "WYŚLIJ PROŚBĘ O WIZYTĘ"}</AppButton>}</div></div>
    </form>}
  </AppModal>;
}
