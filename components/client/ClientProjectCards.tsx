"use client";

import { useState } from "react";
import AppModal from "@/components/ui/AppModal";
import EmptyState from "@/components/ui/EmptyState";
import StatusBadge from "@/components/ui/StatusBadge";
import InspirationPreview from "@/components/client/InspirationPreview";
import ClientAppointmentModal from "@/components/client/ClientAppointmentModal";
import ConfirmModal from "@/components/ui/ConfirmModal";
import AppButton from "@/components/ui/AppButton";
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
  const [visibleProjects, setVisibleProjects] = useState(projects);
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
  return (
    <section id="projekty" className="mt-2 scroll-mt-6">
      <p className="text-[11px] tracking-[.18em] text-ink-gold">
        PROJEKTY / ZGŁOSZENIA
      </p>
      <h2 className="mt-2 font-display text-3xl">Twoje projekty.</h2>
      {visibleProjects.length === 0 ? (
        <div className="mt-5">
          <EmptyState
            title="Nie masz jeszcze projektu"
            description="Wybierz zielony wolny termin na ekranie Start, aby wysłać prośbę o wizytę."
          />
        </div>
      ) : (
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {visibleProjects.map((project) => {
            const previewSource = imageSource(project.images[0]?.url);
            return <button
              key={project.id}
              type="button"
              onClick={() => setSelected(project)}
              className="overflow-hidden border border-ink-white/15 bg-ink-charcoal/30 text-left transition-colors hover:border-ink-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-gold"
            >
              {previewSource && (
                <img
                  src={previewSource}
                  alt="Inspiracja projektu"
                  className="aspect-[2/1] w-full object-cover"
                />
              )}
              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-display text-2xl">{project.title}</h3>
                  <StatusBadge status={project.status} />
                </div>
                <p className="mt-3 line-clamp-2 text-sm text-ink-grey">
                  {project.next}
                </p>
                <p className="mt-4 text-xs text-ink-gold">
                  {project.appointments.length}{" "}
                  {project.appointments.length === 1 ? "sesja" : "sesje"}
                </p>
                <p className="mt-2 text-xs text-ink-grey">{project.finalPrice ? `Cena końcowa: ${project.finalPrice} zł` : project.estimatedPrice ? `Wycena: ${project.estimatedPrice} zł` : "Wycena w trakcie ustalania"}</p>
              </div>
            </button>;
          })}
        </div>
      )}
      {selected && (
        <AppModal
          title={selected.title}
          subtitle="Szczegóły projektu"
          size="lg"
          onClose={() => setSelected(null)}
        >
          <div className="space-y-6">
            <section>
              <p className="text-[10px] tracking-widest text-ink-gold">
                PODSUMOWANIE WIZYTY
              </p>
              <div className="mt-2">
                <StatusBadge status={selected.status} />
              </div>
              <p className="mt-3 text-sm text-ink-grey">{selected.next}</p>
            </section>
            <section className="border-y border-ink-white/10 py-5"><p className="text-[10px] tracking-widest text-ink-gold">FINANSE</p><div className="mt-3 grid gap-3 sm:grid-cols-3"><div><p className="text-xs text-ink-grey">WYCENA</p><p className="mt-1 text-sm text-ink-white">{selected.estimatedPrice ? `${selected.estimatedPrice} zł` : "W trakcie ustalania"}</p></div><div><p className="text-xs text-ink-grey">CENA KOŃCOWA</p><p className="mt-1 text-sm text-ink-white">{selected.finalPrice ? `${selected.finalPrice} zł` : "Jeszcze nieustalona"}</p></div><div><p className="text-xs text-ink-grey">ZADEK</p><p className="mt-1 text-sm text-ink-white">{selected.depositStatus === "not_required" && !selected.depositAmount ? "Jeszcze nieustalony" : selected.depositStatus === "not_required" ? "Zadatek niewymagany" : `${selected.depositAmount ?? 0} zł · ${({ awaiting: "Do zapłaty", paid: "Opłacony", refunded: "Zwrócony", forfeited: "Utracony" } as Record<string, string>)[selected.depositStatus] || "Jeszcze nieustalony"}`}</p></div></div></section>
            <section>
              <p className="text-[10px] tracking-widest text-ink-gold">SESJE</p>
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
      {appointment && (
        <ClientAppointmentModal
          appointment={appointment.item}
          projectTitle={appointment.title}
          onClose={() => setAppointment(null)}
        />
      )}
    </section>
  );
}
