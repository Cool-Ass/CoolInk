"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import AppModal from "@/components/ui/AppModal";
import EmptyState from "@/components/ui/EmptyState";
import StatusBadge from "@/components/ui/StatusBadge";
import InspirationPreview from "@/components/client/InspirationPreview";
import ClientAppointmentModal from "@/components/client/ClientAppointmentModal";
import ConfirmModal from "@/components/ui/ConfirmModal";
import AppButton from "@/components/ui/AppButton";
import ActionIcon from "@/components/ui/ActionIcon";
import { imageSource } from "@/lib/imageSource";

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
  return (
    <section id="projekty" className="scroll-mt-6">
      <header>
        <p className="studio-eyebrow">PROJEKTY / ZGŁOSZENIA</p>
        <h1 className="studio-page-title">Twoje projekty</h1>
      </header>
      {visibleProjects.length === 0 ? (
        <div className="mt-5">
          <EmptyState
            title="Nie masz jeszcze projektu"
            description="Wybierz zielony wolny termin na ekranie Start, aby wysłać prośbę o wizytę."
          />
        </div>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {visibleProjects.map((project) => {
            const previewSource = imageSource(project.images[0]?.url);
            return <article key={project.id} className="studio-panel relative overflow-hidden p-0 transition-colors hover:border-ink-gold">
              <button
                type="button"
                onClick={() => setSelected(project)}
                className="block h-full w-full text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-gold"
              >
              {previewSource && (
                <img
                  src={previewSource}
                  alt="Inspiracja projektu"
                  className="aspect-[16/5] max-h-28 w-full object-cover"
                />
              )}
              <div className="p-3 pr-12">
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
                {project.kind !== "consultation" && <p className="mt-1 line-clamp-1 text-[11px] text-ink-grey">{project.finalPrice ? `Cena końcowa: ${project.finalPrice} zł` : project.estimatedPrice ? `Wycena: ${project.estimatedPrice} zł` : "Wycena w trakcie ustalania"}</p>}
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
              <p className="text-[10px] tracking-widest text-ink-gold">
                PODSUMOWANIE WIZYTY
              </p>
              <div className="mt-2">
                <StatusBadge status={selected.status} />
              </div>
              <p className="mt-3 text-sm text-ink-grey">{selected.next}</p>
            </section>
            {selected.kind !== "consultation" && <section className="border-y border-ink-white/10 py-5"><p className="text-xs tracking-widest text-ink-gold">FINANSE</p><div className="mt-3 grid gap-3 sm:grid-cols-3"><div><p className="text-xs text-ink-grey">WYCENA</p><p className="mt-1 text-sm text-ink-white">{selected.estimatedPrice ? `${selected.estimatedPrice} zł` : "W trakcie ustalania"}</p></div><div><p className="text-xs text-ink-grey">CENA KOŃCOWA</p><p className="mt-1 text-sm text-ink-white">{selected.finalPrice ? `${selected.finalPrice} zł` : "Jeszcze nieustalona"}</p></div><div><p className="text-xs text-ink-grey">ZADATEK</p><p className="mt-1 text-sm text-ink-white">{selected.depositStatus === "not_required" && !selected.depositAmount ? "Jeszcze nieustalony" : selected.depositStatus === "not_required" ? "Zadatek niewymagany" : `${selected.depositAmount ?? 0} zł · ${({ awaiting: "Do zapłaty", paid: "Opłacony", refunded: "Zwrócony", forfeited: "Utracony" } as Record<string, string>)[selected.depositStatus] || "Jeszcze nieustalony"}`}</p></div></div></section>}
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
                        {new Date(item.startsAt).toLocaleString("pl-PL")}
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
              <p className="text-[10px] tracking-widest text-ink-gold">
                INSPIRACJE
              </p>
              <div className="mt-3">
                <InspirationPreview images={selected.images} />
              </div>
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
