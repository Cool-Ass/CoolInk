"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ImagePlus, LoaderCircle, Pencil, Trash2 } from "lucide-react";
import AppModal from "@/components/ui/AppModal";
import StatusBadge from "@/components/ui/StatusBadge";
import InspirationPreview from "@/components/client/InspirationPreview";
import ClientAppointmentModal from "@/components/client/ClientAppointmentModal";
import ConfirmModal from "@/components/ui/ConfirmModal";
import AppButton from "@/components/ui/AppButton";
import ActionIcon from "@/components/ui/ActionIcon";
import { imageSource } from "@/lib/imageSource";
import { formatCoolinkDateTime } from "@/lib/dateTime";

type Appointment = {
  id: string;
  startsAt: string;
  endsAt: string;
  status: string;
  price: number | null;
};
type Project = {
  id: string;
  kind: string;
  title: string;
  description: string;
  status: string;
  next: string;
  estimatedPrice: number | null;
  estimatedPriceMax: number | null;
  finalPrice: number | null;
  depositStatus: string;
  depositAmount: number | null;
  appointments: Appointment[];
  images: { id: string; url: string; caption: string | null }[];
  messages: {
    id: string;
    author: string;
    body: string;
    createdAt: string;
    readAt: string | null;
    attachment: { id: string; caption: string | null; url: string } | null;
  }[];
};

export default function ClientProjectCards({
  projects,
}: {
  projects: Project[];
}) {
  const [selected, setSelected] = useState<Project | null>(null);
  const [appointment, setAppointment] = useState<{
    item: Appointment;
    title: string;
  } | null>(null);
  const [cancelProject, setCancelProject] = useState<Project | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [deleteProject, setDeleteProject] = useState<Project | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [visibleProjects, setVisibleProjects] = useState(projects);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [editingDetails, setEditingDetails] = useState(false);
  const [details, setDetails] = useState({ title: "", description: "" });
  const [savingDetails, setSavingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState("");
  const inspirationInput = useRef<HTMLInputElement>(null);
  function markAppointmentCancelled(appointmentId: string, projectStatus: string) {
    const update = (project: Project) => ({
      ...project,
      status: project.appointments.some((item) => item.id === appointmentId)
        ? projectStatus
        : project.status,
      appointments: project.appointments.map((item) =>
        item.id === appointmentId ? { ...item, status: "cancelled" } : item
      ),
    });
    setVisibleProjects((items) => items.map(update));
    setSelected((project) => project ? update(project) : null);
    setAppointment(null);
  }
  async function cancelSelectedProject() {
    if (!cancelProject) return;
    setCancelling(true);
    try {
      const response = await fetch(`/api/client/projects/${cancelProject.id}/cancel`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Nie udało się anulować projektu.");
      setVisibleProjects((items) => items.map((item) => item.id === cancelProject.id ? { ...item, status: "cancelled", appointments: item.appointments.map((session) => ["requested", "proposed", "confirmed"].includes(session.status) ? { ...session, status: "cancelled" } : session) } : item));
      setSelected(null); setCancelProject(null);
    } catch { /* the existing project remains visible if the request fails */ } finally { setCancelling(false); }
  }
  async function deleteSelectedProject() {
    if (!deleteProject) return;
    setDeleting(true);
    setDeleteError("");
    try {
      const response = await fetch(`/api/client/projects/${deleteProject.id}`, { method: "DELETE" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Nie udało się usunąć projektu.");
      setVisibleProjects((items) => items.filter((item) => item.id !== deleteProject.id));
      if (selected?.id === deleteProject.id) setSelected(null);
      setDeleteProject(null);
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : "Nie udało się usunąć projektu.");
    } finally {
      setDeleting(false);
    }
  }
  async function uploadInspiration(file?: File) {
    if (!selected || !file || uploading) return;
    setUploading(true);
    setUploadError("");
    try {
      const form = new FormData();
      form.set("file", file);
      form.set("caption", file.name.replace(/\.[^.]+$/, "").slice(0, 120));
      const response = await fetch(`/api/client/projects/${selected.id}/images`, { method: "POST", body: form });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.image) throw new Error(result.error || "Nie udało się dodać inspiracji.");
      const update = (project: Project) => project.id === selected.id ? { ...project, images: [...project.images, result.image] } : project;
      setVisibleProjects((items) => items.map(update));
      setSelected((project) => project ? update(project) : null);
      if (inspirationInput.current) inspirationInput.current.value = "";
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Nie udało się dodać inspiracji.");
    } finally {
      setUploading(false);
    }
  }
  function openProject(project: Project) {
    setSelected(project);
    setDetails({ title: project.title, description: project.description });
    setEditingDetails(false); setDetailsError(""); setUploadError("");
  }
  async function saveDetails() {
    if (!selected || savingDetails) return;
    setSavingDetails(true); setDetailsError("");
    try {
      const response = await fetch(`/api/client/projects/${selected.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(details) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.project) throw new Error(result.error || "Nie udało się zapisać projektu.");
      const update = (project: Project) => project.id === selected.id ? { ...project, title: result.project.title, description: result.project.description } : project;
      setVisibleProjects((items) => items.map(update)); setSelected((project) => project ? update(project) : null); setEditingDetails(false);
    } catch (error) { setDetailsError(error instanceof Error ? error.message : "Nie udało się zapisać projektu."); }
    finally { setSavingDetails(false); }
  }
  return (
    <section id="projekty" className="scroll-mt-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div><p className="studio-eyebrow">PROJEKTY / ZGŁOSZENIA</p><h1 className="studio-page-title">Twoje projekty</h1></div>
        <Link href="/app/portal/calendar" className="inline-flex min-h-9 items-center border border-ink-gold px-3 py-2 text-[10px] tracking-[.08em] text-ink-gold hover:bg-ink-gold hover:text-ink-black">+ PROJEKT</Link>
      </header>
      {visibleProjects.length === 0 ? (
        <div className="mt-4 border border-dashed border-ink-white/15 px-4 py-5"><p className="text-sm text-ink-white">Nie masz jeszcze projektu.</p><p className="mt-1 text-xs leading-relaxed text-ink-grey">Wybierz wolny termin w kalendarzu. Utworzysz i opiszesz nowy projekt albo dodasz wizytę do istniejącego.</p></div>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {visibleProjects.map((project) => {
            const previewSource = imageSource(project.images[0]?.url);
            return <article key={project.id} className="studio-panel relative overflow-hidden p-0 transition-colors hover:border-ink-gold">
              <button
                type="button"
                onClick={() => openProject(project)}
                className="block h-full w-full text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-gold"
              >
              {previewSource && (
                <img
                  src={previewSource}
                  alt="Inspiracja projektu"
                  className="aspect-[16/5] max-h-28 w-full object-cover"
                />
              )}
              <div className="p-3 pr-10">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">{project.kind === "consultation" && <span className="mb-1 inline-block border border-blue-400/40 px-1.5 py-0.5 text-[9px] text-blue-200">KONSULTACJA</span>}<h3 className="truncate font-display text-lg">{project.title}</h3></div>
                  <StatusBadge status={project.status} />
                </div>
                <p className="mt-1.5 line-clamp-1 text-[11px] text-ink-grey">
                  {project.next}
                </p>
                <p className="mt-2 text-[10px] text-ink-gold">
                  {project.appointments.length}{" "}
                  {project.kind === "consultation" ? "termin konsultacji" : project.appointments.length === 1 ? "sesja" : "sesje"}
                </p>
                {project.kind !== "consultation" && <p className="mt-1 line-clamp-1 text-[11px] text-ink-grey">{project.finalPrice ? `Cena końcowa: ${project.finalPrice} zł` : project.estimatedPrice && project.estimatedPriceMax ? `Wycena: ${project.estimatedPrice}–${project.estimatedPriceMax} zł` : project.estimatedPrice ? `Wycena od ${project.estimatedPrice} zł` : project.estimatedPriceMax ? `Wycena do ${project.estimatedPriceMax} zł` : "Wycena w trakcie ustalania"}</p>}
              </div>
              </button>
              <ActionIcon icon={Trash2} label={`Usuń projekt ${project.title}`} tone="destructive" className="absolute right-2 top-2 z-10" onClick={() => setDeleteProject(project)} />
            </article>;
          })}
        </div>
      )}
      {deleteError && <p role="alert" className="mt-3 text-xs text-red-300">{deleteError}</p>}
      {selected && (
        <AppModal
          title={selected.title}
          subtitle="Szczegóły projektu"
          size="lg"
          onClose={() => setSelected(null)}
        >
          <div className="space-y-4">
            <section>
              <div className="flex items-center justify-between gap-3"><p className="text-[10px] tracking-widest text-ink-gold">SZCZEGÓŁY PROJEKTU</p><button type="button" onClick={() => setEditingDetails((value) => !value)} className="inline-flex items-center gap-1.5 text-[10px] text-ink-grey hover:text-ink-gold"><Pencil className="h-3 w-3" />{editingDetails ? "ZAMKNIJ EDYCJĘ" : "EDYTUJ"}</button></div>
              <div className="mt-2">
                <StatusBadge status={selected.status} />
              </div>
              {editingDetails ? <div className="mt-3 grid gap-3"><label className="text-[10px] tracking-[.1em] text-ink-grey">TYTUŁ<input value={details.title} maxLength={160} onChange={(event) => setDetails({ ...details, title: event.target.value })} className="mt-1.5 w-full border border-ink-white/20 bg-ink-black px-3 py-2 text-sm text-ink-white" /></label><label className="text-[10px] tracking-[.1em] text-ink-grey">OPIS<textarea value={details.description} maxLength={5000} rows={3} onChange={(event) => setDetails({ ...details, description: event.target.value })} className="mt-1.5 w-full border border-ink-white/20 bg-ink-black px-3 py-2 text-sm text-ink-white" /></label><div className="flex items-center gap-3"><AppButton type="button" disabled={savingDetails} onClick={() => void saveDetails()}>{savingDetails ? "ZAPISYWANIE…" : "ZAPISZ"}</AppButton><button type="button" onClick={() => { setEditingDetails(false); setDetails({ title: selected.title, description: selected.description }); }} className="text-xs text-ink-grey">ANULUJ</button></div>{detailsError && <p role="alert" className="text-xs text-red-300">{detailsError}</p>}</div> : <><p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-ink-grey">{selected.description}</p><p className="mt-2 text-xs text-ink-gold">{selected.next}</p></>}
            </section>
            {selected.kind !== "consultation" && <section className="border-y border-ink-white/10 py-4"><p className="text-xs tracking-widest text-ink-gold">FINANSE</p><div className="mt-3 grid gap-3 sm:grid-cols-3"><div><p className="text-xs text-ink-grey">WYCENA</p><p className="mt-1 text-sm text-ink-white">{selected.estimatedPrice && selected.estimatedPriceMax ? `${selected.estimatedPrice}–${selected.estimatedPriceMax} zł` : selected.estimatedPrice ? `od ${selected.estimatedPrice} zł` : selected.estimatedPriceMax ? `do ${selected.estimatedPriceMax} zł` : "W trakcie ustalania"}</p></div><div><p className="text-xs text-ink-grey">CENA KOŃCOWA</p><p className="mt-1 text-sm text-ink-white">{selected.finalPrice ? `${selected.finalPrice} zł` : "Jeszcze nieustalona"}</p></div><div><p className="text-xs text-ink-grey">ZADATEK</p><p className="mt-1 text-sm text-ink-white">{selected.depositStatus === "not_required" && !selected.depositAmount ? "Jeszcze nieustalony" : selected.depositStatus === "not_required" ? "Zadatek niewymagany" : `${selected.depositAmount ?? 0} zł · ${({ awaiting: "Do zapłaty", paid: "Opłacony", refunded: "Zwrócony", forfeited: "Utracony" } as Record<string, string>)[selected.depositStatus] || "Jeszcze nieustalony"}`}</p></div></div></section>}
            <section>
              <p className="text-xs tracking-widest text-ink-gold">{selected.kind === "consultation" ? "TERMIN KONSULTACJI" : "SESJE"}</p>
              {selected.appointments.length ? (
                <div className="mt-3 space-y-2">
                  {selected.appointments.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() =>
                        setAppointment({ item, title: selected.title })
                      }
                      className="flex w-full flex-wrap items-center justify-between gap-3 border border-ink-white/10 p-3 text-left text-sm transition-colors hover:border-ink-gold"
                    >
                      <span>
                        {formatCoolinkDateTime(item.startsAt)}
                      </span>
                      <StatusBadge status={item.status} />
                    </button>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm text-ink-grey">
                  Termin sesji nie został jeszcze ustalony.
                </p>
              )}
            </section>
            <section>
              <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-[10px] tracking-widest text-ink-gold">INSPIRACJE</p><p className="mt-1 text-[11px] text-ink-grey">JPG, PNG lub WEBP · maks. 10 MB</p></div><><input ref={inspirationInput} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => { void uploadInspiration(event.target.files?.[0]); }} /><AppButton type="button" variant="secondary" disabled={uploading} onClick={() => inspirationInput.current?.click()}>{uploading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}{uploading ? " DODAWANIE…" : " DODAJ INSPIRACJĘ"}</AppButton></></div>
              <div className="mt-3">
                <InspirationPreview images={selected.images} />
              </div>
              {uploadError && <p role="alert" className="mt-2 text-xs text-red-300">{uploadError}</p>}
            </section>
            {selected.status !== "cancelled" && <div className="border-t border-ink-white/10 pt-5"><AppButton type="button" variant="destructive" onClick={() => setCancelProject(selected)}>ANULUJ PROJEKT</AppButton></div>}
          </div>
        </AppModal>
      )}
      {cancelProject && <ConfirmModal message="Anulować projekt? Aktywne terminy zostaną anulowane. Historia, dokumenty i inspiracje pozostaną zachowane." onConfirm={() => { void cancelSelectedProject(); }} onCancel={() => { if (!cancelling) setCancelProject(null); }} pending={cancelling} pendingLabel="ANULOWANIE…" />}
      {deleteProject && <ConfirmModal message={`Usunąć projekt „${deleteProject.title}” na stałe? Znikną także jego wizyty, rozmowa i inspiracje.`} onConfirm={() => { void deleteSelectedProject(); }} onCancel={() => { if (!deleting) setDeleteProject(null); }} pending={deleting} pendingLabel="USUWANIE…" />}
      {appointment && (
        <ClientAppointmentModal
          appointment={appointment.item}
          projectTitle={appointment.title}
          onClose={() => setAppointment(null)}
          onCancelled={markAppointmentCancelled}
        />
      )}
    </section>
  );
}
