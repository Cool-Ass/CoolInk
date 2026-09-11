"use client";
import { useRef, useState, type FormEvent } from "react";
import { ImagePlus, LoaderCircle, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/admin/ToastProvider";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { ADMIN_STATUS_LABEL, DEPOSIT_STATUS } from "@/lib/projectWorkflow";
import AdminProposalCalendarPicker from "@/components/admin/AdminProposalCalendarPicker";
import { LEAD_SOURCES } from "@/lib/leadSource";
import { imageSource } from "@/lib/imageSource";

const OPTIONS = Object.entries(ADMIN_STATUS_LABEL);

export default function ProjectManager({
  id,
  clientId,
  initialTitle,
  initialDescription,
  initialKind,
  consultationMode,
  initialStatus,
  initialLeadSource,
  initialNotes,
  estimatedPrice,
  estimatedPriceMax,
  finalPrice,
  initialDepositStatus,
  depositAmount,
  depositPaymentMethod,
  initialNextAction,
  initialNextActionDueAt,
  canManageFinance,
  canDeleteProject,
  initialImages,
}: {
  id: string;
  clientId: string;
  initialTitle: string;
  initialDescription: string;
  initialKind: string;
  consultationMode: string | null;
  initialStatus: string;
  initialLeadSource: string | null;
  initialNotes: string | null;
  estimatedPrice: number | null;
  estimatedPriceMax: number | null;
  finalPrice: number | null;
  initialDepositStatus: string;
  depositAmount: number | null;
  depositPaymentMethod: string | null;
  initialNextAction: string | null;
  initialNextActionDueAt: string | null;
  canManageFinance: boolean;
  canDeleteProject: boolean;
  initialImages: { id: string; url: string; caption: string | null }[];
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [status, setStatus] = useState(initialStatus);
  const [projectTitle, setProjectTitle] = useState(initialTitle);
  const [projectDescription, setProjectDescription] = useState(initialDescription);
  const [leadSource, setLeadSource] = useState(initialLeadSource ?? "");
  const [kind, setKind] = useState(initialKind);
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [estimate, setEstimate] = useState(estimatedPrice?.toString() ?? "");
  const [estimateMax, setEstimateMax] = useState(estimatedPriceMax?.toString() ?? "");
  const [final, setFinal] = useState(finalPrice?.toString() ?? "");
  const [depositStatus, setDepositStatus] = useState(initialDepositStatus);
  const [deposit, setDeposit] = useState(depositAmount?.toString() ?? "");
  const [depositMethod, setDepositMethod] = useState(
    depositPaymentMethod ?? "",
  );
  const [nextAction, setNextAction] = useState(initialNextAction ?? "");
  const [nextActionDueAt, setNextActionDueAt] = useState(initialNextActionDueAt?.slice(0, 16) ?? "");
  const [saving, setSaving] = useState(false);
  const [proposalOpen, setProposalOpen] = useState(false);
  const [proposal, setProposal] = useState({
    startsAt: "",
    duration: "60",
    note: "",
  });
  const [proposing, setProposing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [images, setImages] = useState(initialImages);
  const [uploading, setUploading] = useState(false);
  const [imageError, setImageError] = useState("");
  const imageInput = useRef<HTMLInputElement>(null);
  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/projects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: projectTitle,
          description: projectDescription,
          status,
          leadSource,
          internalNotes: notes,
          nextAction,
          nextActionDueAt,
          ...(canManageFinance ? { estimatedPrice: estimate, estimatedPriceMax: estimateMax, finalPrice: final, depositStatus, depositAmount: deposit, depositPaymentMethod: depositMethod } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast("Projekt zaktualizowany.");
      router.refresh();
    } catch (e) {
      showToast(
        e instanceof Error ? e.message : "Nie udało się zapisać.",
        "error",
      );
    } finally {
      setSaving(false);
    }
  }
  async function uploadInspiration(file?: File) {
    if (!file || uploading) return;
    setUploading(true); setImageError("");
    try {
      const form = new FormData(); form.set("file", file); form.set("caption", file.name.replace(/\.[^.]+$/, "").slice(0, 120));
      const response = await fetch(`/api/admin/projects/${id}/images`, { method: "POST", body: form });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.image) throw new Error(data.error || "Nie udało się dodać inspiracji.");
      setImages((current) => [...current, data.image]);
      showToast("Inspiracja została dodana.");
    } catch (error) { setImageError(error instanceof Error ? error.message : "Nie udało się dodać inspiracji."); }
    finally { setUploading(false); if (imageInput.current) imageInput.current.value = ""; }
  }
  async function removeInspiration(imageId: string) {
    if (!window.confirm("Usunąć tę inspirację z projektu?")) return;
    const response = await fetch(`/api/admin/projects/${id}/images?imageId=${encodeURIComponent(imageId)}`, { method: "DELETE" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) { setImageError(data.error || "Nie udało się usunąć inspiracji."); return; }
    setImages((current) => current.filter((image) => image.id !== imageId));
  }
  async function convertConsultation() {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/projects/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ convertConsultation: true, status: "reviewing", nextAction: "Uzupełnij zakres projektu i zaproponuj kolejny krok", nextActionDueAt }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setKind("tattoo");
      setStatus("reviewing");
      setNextAction("Uzupełnij zakres projektu i zaproponuj kolejny krok");
      showToast("Konsultacja została przekształcona w projekt. Historia i zdjęcia zostały zachowane.");
      router.refresh();
    } catch (error) { showToast(error instanceof Error ? error.message : "Nie udało się przekształcić konsultacji.", "error"); }
    finally { setSaving(false); }
  }
  async function propose(event: FormEvent) {
    event.preventDefault();
    const startsAt = new Date(proposal.startsAt);
    const endsAt = new Date(startsAt);
    endsAt.setMinutes(endsAt.getMinutes() + Number(proposal.duration));
    setProposing(true);
    try {
      const res = await fetch(
        `/api/admin/projects/${id}/proposed-appointment`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ startsAt, endsAt, note: proposal.note }),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast("Propozycja terminu jest widoczna na koncie klienta.");
      setProposalOpen(false);
      setProposal({ startsAt: "", duration: "60", note: "" });
      router.refresh();
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Nie udało się zaproponować terminu.",
        "error",
      );
    } finally {
      setProposing(false);
    }
  }
  async function remove() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/projects/${id}`, {
          method: "DELETE",
        }),
        data = await res.json();
      if (!res.ok) throw Error(data.error);
      showToast("Projekt został całkowicie usunięty.");
      setDeleteOpen(false);
      router.push(`/admin/clients/${clientId}`);
      router.refresh();
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Nie udało się usunąć projektu.",
        "error",
      );
      setDeleting(false);
      setDeleteOpen(false);
    }
  }
  return (
    <section className="border border-ink-white/15 bg-ink-charcoal/40 p-4 sm:p-5">
      <p className="text-xs tracking-[0.14em] text-ink-gold">
        {kind === "consultation" ? "ZARZĄDZANIE KONSULTACJĄ" : "ZARZĄDZANIE PROJEKTEM"}
      </p>
      {kind === "consultation" && <div className="mt-4 border border-blue-400/35 bg-blue-400/5 p-4"><p className="text-sm text-blue-100">Konsultacja · {({ studio: "w studiu", phone: "telefonicznie", video: "rozmowa wideo" } as Record<string, string>)[consultationMode ?? ""] || "forma do ustalenia"}</p><p className="mt-2 text-sm leading-relaxed text-ink-grey">Po rozmowie możesz zamienić ją w projekt bez kopiowania wiadomości, zdjęć ani notatek.</p><button type="button" onClick={convertConsultation} disabled={saving} className="mt-3 border border-blue-300 px-4 py-2.5 text-xs text-blue-100 hover:bg-blue-400/10 disabled:opacity-50">PRZEKSZTAŁĆ W PROJEKT TATUAŻU</button></div>}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-[10px] tracking-[0.1em] text-ink-grey">TYTUŁ PROJEKTU<input value={projectTitle} maxLength={160} onChange={(event) => setProjectTitle(event.target.value)} className="border border-ink-white/20 bg-transparent px-3 py-2 text-sm normal-case tracking-normal text-ink-white outline-none focus:border-ink-gold" /></label>
        <label className="flex flex-col gap-1.5 text-[10px] tracking-[0.1em] text-ink-grey">OPIS PROJEKTU<textarea value={projectDescription} maxLength={5000} rows={2} onChange={(event) => setProjectDescription(event.target.value)} className="border border-ink-white/20 bg-transparent px-3 py-2 text-sm normal-case tracking-normal text-ink-white outline-none focus:border-ink-gold" /></label>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <label className="flex flex-col gap-2 text-[11px] tracking-[0.1em] text-ink-grey">
          STATUS
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="border border-ink-white/20 bg-ink-black px-3 py-2.5 text-sm normal-case tracking-normal text-ink-white outline-none focus:border-ink-gold"
          >
            {OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-2 text-[11px] tracking-[0.1em] text-ink-grey">
          ŹRÓDŁO ZGŁOSZENIA
          <select
            value={leadSource}
            onChange={(event) => setLeadSource(event.target.value)}
            className="border border-ink-white/20 bg-ink-black px-3 py-2.5 text-sm normal-case tracking-normal text-ink-white outline-none focus:border-ink-gold"
          >
            <option value="">Nie podano</option>
            {LEAD_SOURCES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-2 text-[11px] tracking-[0.1em] text-ink-grey">
          WYCENA OD (PLN)
          <input
            disabled={!canManageFinance}
            inputMode="numeric"
            value={estimate}
            onChange={(e) => setEstimate(e.target.value)}
            className="border border-ink-white/20 bg-transparent px-3 py-2.5 text-sm normal-case tracking-normal text-ink-white outline-none focus:border-ink-gold"
          />
        </label>
        <label className="flex flex-col gap-2 text-[11px] tracking-[0.1em] text-ink-grey">
          WYCENA DO (PLN)
          <input disabled={!canManageFinance} inputMode="numeric" value={estimateMax} onChange={(e) => setEstimateMax(e.target.value)} className="border border-ink-white/20 bg-transparent px-3 py-2.5 text-sm normal-case tracking-normal text-ink-white outline-none focus:border-ink-gold" />
        </label>
        <label className="flex flex-col gap-2 text-[11px] tracking-[0.1em] text-ink-grey">
          CENA KOŃCOWA (PLN)
          <input
            disabled={!canManageFinance}
            inputMode="numeric"
            value={final}
            onChange={(e) => setFinal(e.target.value)}
            className="border border-ink-white/20 bg-transparent px-3 py-2.5 text-sm normal-case tracking-normal text-ink-white outline-none focus:border-ink-gold"
          />
        </label>
      </div>
      <section className="mt-4 border-t border-ink-white/10 pt-4">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-[10px] tracking-[0.12em] text-ink-gold">INSPIRACJE</p><p className="mt-1 text-[11px] text-ink-grey">Widoczne tylko dla klienta i studia · JPG, PNG lub WEBP do 10 MB</p></div><div><input ref={imageInput} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => void uploadInspiration(event.target.files?.[0])} /><button type="button" disabled={uploading} onClick={() => imageInput.current?.click()} className="inline-flex min-h-9 items-center gap-2 border border-ink-gold/60 px-3 py-2 text-[10px] text-ink-gold disabled:opacity-50">{uploading ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />}{uploading ? "DODAWANIE…" : "DODAJ INSPIRACJĘ"}</button></div></div>
        {images.length > 0 && <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-7">{images.map((image) => { const source = imageSource(image.url); return source ? <div key={image.id} className="group relative aspect-square overflow-hidden border border-ink-white/15"><img src={source} alt={image.caption || "Inspiracja projektu"} className="h-full w-full object-cover" /><button type="button" onClick={() => void removeInspiration(image.id)} aria-label="Usuń inspirację" className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center border border-red-400/60 bg-ink-black/85 text-red-300 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100"><Trash2 className="h-3.5 w-3.5" /></button></div> : null; })}</div>}
        {images.length === 0 && <p className="mt-3 border border-dashed border-ink-white/15 px-3 py-4 text-center text-xs text-ink-grey">Brak inspiracji. Możesz dodać je tutaj lub poczekać na zdjęcia klienta.</p>}
        {imageError && <p role="alert" className="mt-2 text-xs text-red-300">{imageError}</p>}
      </section>
      <div className="mt-4 grid gap-4 border-t border-ink-white/10 pt-4 sm:grid-cols-[1fr_220px]">
        <label className="flex flex-col gap-2 text-xs tracking-[0.08em] text-ink-grey">NASTĘPNE DZIAŁANIE<input value={nextAction} onChange={(event) => setNextAction(event.target.value)} maxLength={500} placeholder="Np. oddzwonić i potwierdzić termin" className="border border-ink-white/20 bg-transparent px-3 py-2.5 text-sm normal-case tracking-normal text-ink-white outline-none focus:border-ink-gold" /></label>
        <label className="flex flex-col gap-2 text-xs tracking-[0.08em] text-ink-grey">TERMIN DZIAŁANIA<input type="datetime-local" value={nextActionDueAt} onChange={(event) => setNextActionDueAt(event.target.value)} className="border border-ink-white/20 bg-ink-black px-3 py-2.5 text-sm normal-case tracking-normal text-ink-white outline-none focus:border-ink-gold" /></label>
      </div>
      <div className="mt-4 grid gap-4 border-t border-ink-white/10 pt-4 sm:grid-cols-3">
        <label className="flex flex-col gap-2 text-[11px] tracking-[0.1em] text-ink-grey">
          ZADATEK
          <select
            disabled={!canManageFinance}
            value={depositStatus}
            onChange={(e) => setDepositStatus(e.target.value)}
            className="border border-ink-white/20 bg-ink-black px-3 py-2.5 text-sm text-ink-white"
          >
            {DEPOSIT_STATUS.map((value) => (
              <option key={value} value={value}>
                {
                  (
                    {
                      not_required: "Niewymagany",
                      awaiting: "Oczekuje",
                      paid: "Opłacony",
                      refunded: "Zwrócony",
                      forfeited: "Utracony",
                    } as Record<string, string>
                  )[value]
                }
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-2 text-[11px] tracking-[0.1em] text-ink-grey">
          KWOTA ZADATKU (PLN)
          <input
            disabled={!canManageFinance}
            inputMode="numeric"
            value={deposit}
            onChange={(e) => setDeposit(e.target.value)}
            className="border border-ink-white/20 bg-transparent px-3 py-2.5 text-sm text-ink-white"
          />
        </label>
        <label className="flex flex-col gap-2 text-[11px] tracking-[0.1em] text-ink-grey">
          METODA PŁATNOŚCI
          <input
            disabled={!canManageFinance}
            value={depositMethod}
            onChange={(e) => setDepositMethod(e.target.value)}
            placeholder="np. przelew, gotówka"
            className="border border-ink-white/20 bg-transparent px-3 py-2.5 text-sm text-ink-white"
          />
        </label>
      </div>
      <label className="mt-4 flex flex-col gap-2 text-[11px] tracking-[0.1em] text-ink-grey">
        NOTATKI WEWNĘTRZNE
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={5}
          className="border border-ink-white/20 bg-transparent px-3 py-2.5 text-sm normal-case tracking-normal text-ink-white outline-none focus:border-ink-gold"
        />
      </label>
      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="border border-ink-gold px-4 py-2.5 text-xs tracking-[0.08em] text-ink-gold hover:bg-ink-gold hover:text-ink-black disabled:opacity-50"
        >
          {saving ? "ZAPISYWANIE…" : "ZAPISZ ZMIANY"}
        </button>
        <button
          type="button"
          onClick={() => setProposalOpen((value) => !value)}
          className="border border-emerald-500/50 px-4 py-2.5 text-xs tracking-[0.08em] text-emerald-300 hover:bg-emerald-500/10"
        >
          ZAPROPONUJ TERMIN
        </button>
        {canDeleteProject && <button
          type="button"
          onClick={() => setDeleteOpen(true)}
          className="inline-flex items-center gap-2 border border-red-500/60 px-4 py-2.5 text-xs tracking-[0.08em] text-red-300 hover:bg-red-500/10"
        >
          <Trash2 className="h-3.5 w-3.5" />USUŃ PROJEKT
        </button>}
      </div>
      {proposalOpen && (
        <form
          onSubmit={propose}
          className="mt-5 border border-emerald-500/25 bg-emerald-500/5 p-4"
        >
          <p className="text-xs text-emerald-200">
            Klient zobaczy proponowany termin na swoim koncie.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2"><p className="text-[11px] tracking-[0.1em] text-ink-grey">WYBIERZ WOLNY TERMIN</p><div className="mt-2 border border-ink-white/15 bg-ink-black/20 p-3"><AdminProposalCalendarPicker value={proposal.startsAt} durationMinutes={Number(proposal.duration)} onChange={(startsAt) => setProposal({ ...proposal, startsAt })} /></div></div>
            <label className="flex flex-col gap-2 text-[11px] tracking-[0.1em] text-ink-grey">
              GODZINA
              <input required type="time" step="1800" value={proposal.startsAt ? proposal.startsAt.slice(11, 16) : ""} onChange={(event) => proposal.startsAt && setProposal({ ...proposal, startsAt: `${proposal.startsAt.slice(0, 10)}T${event.target.value}` })} className="border border-ink-white/20 bg-ink-black px-3 py-2.5 text-sm normal-case tracking-normal text-ink-white" />
            </label>
            <label className="flex flex-col gap-2 text-[11px] tracking-[0.1em] text-ink-grey">
              CZAS TRWANIA
              <select
                value={proposal.duration}
                onChange={(event) =>
                  setProposal({ ...proposal, duration: event.target.value, startsAt: "" })
                }
                className="border border-ink-white/20 bg-ink-black px-3 py-2.5 text-sm text-ink-white"
              >
                {[30, 60, 90, 120, 180, 240, 300, 360, 480, 600, 720].map(
                  (minutes) => (
                    <option key={minutes} value={minutes}>
                      {minutes < 60 ? "30 min" : `${minutes / 60} h`}
                    </option>
                  ),
                )}
              </select>
            </label>
          </div>
          <label className="mt-4 flex flex-col gap-2 text-[11px] tracking-[0.1em] text-ink-grey">
            WIADOMOŚĆ (OPCJONALNIE)
            <textarea
              value={proposal.note}
              onChange={(event) =>
                setProposal({ ...proposal, note: event.target.value })
              }
              rows={2}
              className="border border-ink-white/20 bg-transparent px-3 py-2.5 text-sm normal-case tracking-normal text-ink-white"
            />
          </label>
          <div className="mt-4 flex gap-3">
            <button
              disabled={proposing}
              className="border border-emerald-400 px-4 py-2 text-xs text-emerald-200 disabled:opacity-50"
            >
              {proposing ? "WYSYŁANIE…" : "WYŚLIJ PROPOZYCJĘ"}
            </button>
            <button
              type="button"
              onClick={() => setProposalOpen(false)}
              className="text-xs text-ink-grey"
            >
              Anuluj
            </button>
          </div>
        </form>
      )}
      {deleteOpen && (
        <ConfirmModal
          message="Usunąć cały projekt? Zostaną trwale usunięte jego wizyty, historia, wiadomości i inspiracje."
          onCancel={() => setDeleteOpen(false)}
          onConfirm={remove}
          pending={deleting}
          pendingLabel="USUWANIE…"
        />
      )}
    </section>
  );
}
