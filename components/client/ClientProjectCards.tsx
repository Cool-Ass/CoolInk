"use client";

import { useState } from "react";
import AppModal from "@/components/ui/AppModal";
import EmptyState from "@/components/ui/EmptyState";
import StatusBadge from "@/components/ui/StatusBadge";
import InspirationPreview from "@/components/client/InspirationPreview";
import ClientAppointmentModal from "@/components/client/ClientAppointmentModal";
import ProjectChat from "@/components/projects/ProjectChat";

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
  return (
    <section id="wizyty" className="mt-2 scroll-mt-6">
      <p className="text-[11px] tracking-[.18em] text-ink-gold">
        MOJE WIZYTY
      </p>
      <h2 className="mt-2 font-display text-3xl">Wszystko o Twoich wizytach.</h2>
      {projects.length === 0 ? (
        <div className="mt-5">
          <EmptyState
            title="Nie masz jeszcze wizyty"
            description="Wybierz zielony wolny termin na ekranie Start, aby wysłać prośbę o wizytę."
          />
        </div>
      ) : (
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {projects.map((project) => (
            <button
              key={project.id}
              type="button"
              onClick={() => setSelected(project)}
              className="overflow-hidden border border-ink-white/15 bg-ink-charcoal/30 text-left transition-colors hover:border-ink-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-gold"
            >
              {project.images[0] && (
                <img
                  src={project.images[0].url}
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
              </div>
            </button>
          ))}
        </div>
      )}
      {selected && (
        <AppModal
          title={selected.title}
          subtitle="Szczegóły wizyty i tatuażu"
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
            <ProjectChat
              projectId={selected.id}
              initial={selected.messages}
              role="client"
            />
          </div>
        </AppModal>
      )}
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
