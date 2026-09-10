"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus } from "lucide-react";
import { useToast } from "@/components/admin/ToastProvider";
import AppModal from "@/components/ui/AppModal";
import AdminProposalCalendarPicker from "@/components/admin/AdminProposalCalendarPicker";
import { formatCoolinkDateTime, localDateTimeToIso } from "@/lib/dateTime";

const durations = [30, 60, 90, 120, 180, 240, 300, 360, 480, 600, 720];
const NEW_PROJECT = "__new_project__";
const emptyValues = { projectChoice: "", clientId: "", projectTitle: "", projectDescription: "", startsAt: "", endsAt: "", notes: "", duration: 60 };

type ProjectOption = { id: string; title: string; client: { id?: string; firstName: string; lastName: string } };
type ClientOption = { id: string; firstName: string; lastName: string };

export default function NewAppointmentForm({ projects, clients = [], fixedClient, label = "+ ZAPLANUJ WIZYTĘ" }: { projects: ProjectOption[]; clients?: ClientOption[]; fixedClient?: ClientOption; label?: string }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [values, setValues] = useState(() => ({ ...emptyValues, clientId: fixedClient?.id ?? "", projectChoice: fixedClient && projects.length === 0 ? NEW_PROJECT : "" }));
  const projectsForClient = fixedClient ? projects : projects.filter((project) => project.client.id === values.clientId);
  const creatingProject = values.projectChoice === NEW_PROJECT;

  useEffect(() => {
    const openFromCalendar = () => setOpen(true);
    window.addEventListener("coolink:new-appointment", openFromCalendar);
    return () => window.removeEventListener("coolink:new-appointment", openFromCalendar);
  }, []);

  function selectStart(startsAt: string) {
    const end = new Date(startsAt);
    end.setMinutes(end.getMinutes() + values.duration);
    const pad = (number: number) => String(number).padStart(2, "0");
    const endsAt = `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}T${pad(end.getHours())}:${pad(end.getMinutes())}`;
    setValues((current) => ({ ...current, startsAt, endsAt }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await fetch("/api/admin/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: creatingProject ? "" : values.projectChoice,
          clientId: values.clientId,
          projectTitle: creatingProject ? values.projectTitle : undefined,
          projectDescription: creatingProject ? values.projectDescription : undefined,
          startsAt: localDateTimeToIso(values.startsAt),
          endsAt: localDateTimeToIso(values.endsAt),
          notes: values.notes,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      showToast("Wizyta została zaplanowana.");
      setValues({ ...emptyValues, clientId: fixedClient?.id ?? "", projectChoice: fixedClient && projects.length === 0 ? NEW_PROJECT : "" });
      setOpen(false);
      router.refresh();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Nie udało się zaplanować wizyty.", "error");
    } finally {
      setSaving(false);
    }
  }

  const validProject = creatingProject ? Boolean(values.clientId && values.projectTitle.trim() && values.projectDescription.trim()) : Boolean(values.projectChoice);

  return <><button type="button" disabled={!fixedClient && !clients.length && !projects.length} onClick={() => setOpen(true)} className="inline-flex min-h-10 items-center gap-2 border border-ink-gold px-4 py-2 text-xs tracking-[0.08em] text-ink-gold hover:bg-ink-gold hover:text-ink-black disabled:opacity-40"><CalendarPlus className="h-4 w-4" />{label}</button>
    {open && <AppModal title="Projekt i wizyta" subtitle="Wybierz istniejący projekt albo utwórz nowy i od razu zaplanuj jego pierwszą wizytę." size="xl" onClose={saving ? () => undefined : () => setOpen(false)} closeOnBackdrop={!saving}>
      <form onSubmit={submit} className="grid gap-4">
        {!fixedClient && <label className="flex flex-col gap-2 text-[11px] tracking-[0.1em] text-ink-grey">KLIENT<select required value={values.clientId} onChange={(event) => { const clientId = event.target.value; const hasProjects = projects.some((project) => project.client.id === clientId); setValues({ ...values, clientId, projectChoice: hasProjects ? "" : clientId ? NEW_PROJECT : "", projectTitle: "", projectDescription: "", startsAt: "", endsAt: "" }); }} className="border border-ink-white/20 bg-ink-black px-3 py-2.5 text-sm normal-case tracking-normal text-ink-white outline-none focus:border-ink-gold"><option value="">Wybierz klienta</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.firstName} {client.lastName}</option>)}</select></label>}
        <label className="flex flex-col gap-2 text-[11px] tracking-[0.1em] text-ink-grey">PROJEKT<select required disabled={!values.clientId} value={values.projectChoice} onChange={(event) => setValues({ ...values, projectChoice: event.target.value })} className="border border-ink-white/20 bg-ink-black px-3 py-2.5 text-sm normal-case tracking-normal text-ink-white outline-none focus:border-ink-gold disabled:opacity-40"><option value="">Wybierz projekt</option>{projectsForClient.map((project) => <option key={project.id} value={project.id}>{project.title}</option>)}<option value={NEW_PROJECT}>+ Utwórz nowy projekt</option></select></label>
        {creatingProject && <section className="grid gap-4 border-l-2 border-ink-gold bg-ink-gold/5 p-4"><label className="flex flex-col gap-2 text-[11px] tracking-[0.1em] text-ink-grey">NAZWA PROJEKTU<input required maxLength={160} value={values.projectTitle} onChange={(event) => setValues({ ...values, projectTitle: event.target.value })} placeholder="Np. ornament na przedramię" className="border border-ink-white/20 bg-ink-black px-3 py-2.5 text-sm normal-case tracking-normal text-ink-white outline-none focus:border-ink-gold" /></label><label className="flex flex-col gap-2 text-[11px] tracking-[0.1em] text-ink-grey">OPIS PROJEKTU<textarea required maxLength={5000} rows={3} value={values.projectDescription} onChange={(event) => setValues({ ...values, projectDescription: event.target.value })} placeholder="Najważniejsze informacje o projekcie" className="border border-ink-white/20 bg-ink-black px-3 py-2.5 text-sm normal-case tracking-normal text-ink-white outline-none focus:border-ink-gold" /></label></section>}
        <label className="flex flex-col gap-2 text-[11px] tracking-[0.1em] text-ink-grey">CZAS WIZYTY<select value={values.duration} onChange={(event) => setValues({ ...values, duration: Number(event.target.value), startsAt: "", endsAt: "" })} className="border border-ink-white/20 bg-ink-black px-3 py-2.5 text-sm normal-case tracking-normal text-ink-white outline-none focus:border-ink-gold">{durations.map((minutes) => <option key={minutes} value={minutes}>{minutes < 60 ? `${minutes} min` : `${minutes / 60} h`}</option>)}</select></label>
        <div><p className="mb-2 text-[11px] tracking-[0.1em] text-ink-grey">WOLNY TERMIN</p><div className="border border-ink-white/15 bg-ink-black/20 p-3"><AdminProposalCalendarPicker value={values.startsAt} durationMinutes={values.duration} onChange={selectStart} /></div></div>
        {values.startsAt && <p className="border border-emerald-400/30 bg-emerald-400/5 px-3 py-2 text-xs text-emerald-200">Wybrano: {formatCoolinkDateTime(localDateTimeToIso(values.startsAt), { dateStyle: "full", timeStyle: "short" })} · {values.duration} min</p>}
        <label className="flex flex-col gap-2 text-[11px] tracking-[0.1em] text-ink-grey">NOTATKA (OPCJONALNIE)<textarea value={values.notes} onChange={(event) => setValues({ ...values, notes: event.target.value })} rows={3} className="border border-ink-white/20 bg-transparent px-3 py-2.5 text-sm normal-case tracking-normal text-ink-white outline-none focus:border-ink-gold" /></label>
        <div className="flex gap-3"><button disabled={saving || !values.startsAt || !validProject} className="border border-ink-gold px-4 py-2.5 text-xs text-ink-gold disabled:opacity-40">{saving ? "ZAPISYWANIE…" : creatingProject ? "UTWÓRZ PROJEKT I WIZYTĘ" : "ZAPLANUJ WIZYTĘ"}</button><button type="button" onClick={() => setOpen(false)} className="text-xs text-ink-grey hover:text-ink-white">Anuluj</button></div>
      </form>
    </AppModal>}
  </>;
}
