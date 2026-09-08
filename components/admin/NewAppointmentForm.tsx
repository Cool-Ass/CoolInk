"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus } from "lucide-react";
import { useToast } from "@/components/admin/ToastProvider";
import AppModal from "@/components/ui/AppModal";
import AdminProposalCalendarPicker from "@/components/admin/AdminProposalCalendarPicker";

const durations = [30, 60, 90, 120, 180, 240, 300, 360, 480, 600, 720];
const emptyValues = { projectId: "", startsAt: "", endsAt: "", notes: "", duration: 60 };

export default function NewAppointmentForm({ projects, label = "+ ZAPLANUJ WIZYTĘ" }: { projects: { id: string; title: string; client: { firstName: string; lastName: string } }[]; label?: string }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [values, setValues] = useState(emptyValues);

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
      const response = await fetch("/api/admin/appointments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      showToast("Wizyta została zaplanowana.");
      setValues(emptyValues);
      setOpen(false);
      router.refresh();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Nie udało się zaplanować wizyty.", "error");
    } finally {
      setSaving(false);
    }
  }

  return <><button type="button" disabled={!projects.length} onClick={() => setOpen(true)} className="inline-flex min-h-10 items-center gap-2 border border-ink-gold px-4 py-2 text-xs tracking-[0.08em] text-ink-gold hover:bg-ink-gold hover:text-ink-black disabled:opacity-40"><CalendarPlus className="h-4 w-4" />{label}</button>
    {open && <AppModal title="Zaplanuj wizytę" subtitle="Kalendarz pokazuje wyłącznie faktycznie wolne godziny." size="xl" onClose={saving ? () => undefined : () => setOpen(false)} closeOnBackdrop={!saving}>
      <form onSubmit={submit} className="grid gap-4">
        <label className="flex flex-col gap-2 text-[11px] tracking-[0.1em] text-ink-grey">PROJEKT<select required value={values.projectId} onChange={(event) => setValues({ ...values, projectId: event.target.value })} className="border border-ink-white/20 bg-ink-black px-3 py-2.5 text-sm normal-case tracking-normal text-ink-white outline-none focus:border-ink-gold"><option value="">Wybierz projekt</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.client.firstName} {project.client.lastName} — {project.title}</option>)}</select></label>
        <label className="flex flex-col gap-2 text-[11px] tracking-[0.1em] text-ink-grey">CZAS WIZYTY<select value={values.duration} onChange={(event) => setValues({ ...values, duration: Number(event.target.value), startsAt: "", endsAt: "" })} className="border border-ink-white/20 bg-ink-black px-3 py-2.5 text-sm normal-case tracking-normal text-ink-white outline-none focus:border-ink-gold">{durations.map((minutes) => <option key={minutes} value={minutes}>{minutes < 60 ? `${minutes} min` : `${minutes / 60} h`}</option>)}</select></label>
        <div><p className="mb-2 text-[11px] tracking-[0.1em] text-ink-grey">WOLNY TERMIN</p><div className="border border-ink-white/15 bg-ink-black/20 p-3"><AdminProposalCalendarPicker value={values.startsAt} durationMinutes={values.duration} onChange={selectStart} /></div></div>
        {values.startsAt && <p className="border border-emerald-400/30 bg-emerald-400/5 px-3 py-2 text-xs text-emerald-200">Wybrano: {new Date(values.startsAt).toLocaleString("pl-PL", { dateStyle: "full", timeStyle: "short" })} · {values.duration} min</p>}
        <label className="flex flex-col gap-2 text-[11px] tracking-[0.1em] text-ink-grey">NOTATKA (OPCJONALNIE)<textarea value={values.notes} onChange={(event) => setValues({ ...values, notes: event.target.value })} rows={3} className="border border-ink-white/20 bg-transparent px-3 py-2.5 text-sm normal-case tracking-normal text-ink-white outline-none focus:border-ink-gold" /></label>
        <div className="flex gap-3"><button disabled={saving || !values.startsAt || !values.projectId} className="border border-ink-gold px-4 py-2.5 text-xs text-ink-gold disabled:opacity-40">{saving ? "ZAPISYWANIE…" : "ZAPLANUJ"}</button><button type="button" onClick={() => setOpen(false)} className="text-xs text-ink-grey hover:text-ink-white">Anuluj</button></div>
      </form>
    </AppModal>}
  </>;
}
