"use client";

import { useMemo, useState } from "react";

export type CalendarAppointment = {
  id: string;
  startsAt: string;
  endsAt: string;
  status: string;
  notes: string | null;
  clientName: string;
  projectTitle: string;
};

export type CalendarBlock = { id: string; startsAt: string; endsAt: string; reason: string | null };

const DAYS = ["PN", "WT", "ŚR", "CZ", "PT", "SB", "ND"];
const MONTHS = ["styczeń", "luty", "marzec", "kwiecień", "maj", "czerwiec", "lipiec", "sierpień", "wrzesień", "październik", "listopad", "grudzień"];
type WorkingDay = { weekday: number; enabled: boolean; startsAt: string; endsAt: string };

function startOfDay(date: Date) { const value = new Date(date); value.setHours(0, 0, 0, 0); return value; }
function sameDay(a: Date, b: Date) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }
function isWeekend(date: Date) { return date.getDay() === 0; }

export default function AdminCalendar({ appointments, blocks, workingHours }: { appointments: CalendarAppointment[]; blocks: CalendarBlock[]; workingHours: WorkingDay[] }) {
  const today = startOfDay(new Date());
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDay, setSelectedDay] = useState(today);

  const weeks = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const firstWeekday = (first.getDay() + 6) % 7;
    const gridStart = new Date(first);
    gridStart.setDate(first.getDate() - firstWeekday);
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(gridStart);
      date.setDate(gridStart.getDate() + index);
      return date;
    });
  }, [cursor]);

  const appointmentsForDay = appointments.filter((appointment) => sameDay(new Date(appointment.startsAt), selectedDay));
  const blocksForDay = blocks.filter((block) => sameDay(new Date(block.startsAt), selectedDay));
  const selectedRule = workingHours.find((item) => item.weekday === selectedDay.getDay());
  const isWorkingDay = selectedRule ? selectedRule.enabled : !isWeekend(selectedDay);
  const startHour = Number((selectedRule?.startsAt || "10:00").split(":")[0]);
  const endHour = Number((selectedRule?.endsAt || "19:00").split(":")[0]);
  const hours = Array.from({ length: Math.max(endHour - startHour, 0) }, (_, index) => startHour + index);

  function previousMonth() { setCursor((value) => new Date(value.getFullYear(), value.getMonth() - 1, 1)); }
  function nextMonth() { setCursor((value) => new Date(value.getFullYear(), value.getMonth() + 1, 1)); }
  function selectDay(date: Date) { setSelectedDay(startOfDay(date)); if (date.getMonth() !== cursor.getMonth()) setCursor(new Date(date.getFullYear(), date.getMonth(), 1)); }

  return (
    <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="border border-ink-white/10 bg-ink-charcoal/30 p-4 sm:p-6">
        <div className="mb-6 flex items-center justify-between gap-4">
          <button type="button" onClick={previousMonth} aria-label="Poprzedni miesiąc" className="h-10 w-10 border border-ink-white/15 text-ink-grey hover:border-ink-gold hover:text-ink-gold">←</button>
          <div className="text-center"><p className="font-display text-2xl text-ink-white">{MONTHS[cursor.getMonth()]} {cursor.getFullYear()}</p><p className="mt-1 text-[11px] tracking-[0.12em] text-ink-grey">KLIKNIJ DZIEŃ, ABY ZOBACZYĆ GODZINY</p></div>
          <button type="button" onClick={nextMonth} aria-label="Następny miesiąc" className="h-10 w-10 border border-ink-white/15 text-ink-grey hover:border-ink-gold hover:text-ink-gold">→</button>
        </div>
        <div className="grid grid-cols-7 border-l border-t border-ink-white/10">
          {DAYS.map((day) => <div key={day} className="border-b border-r border-ink-white/10 bg-ink-black/30 px-2 py-3 text-center text-[10px] font-semibold tracking-[0.12em] text-ink-grey">{day}</div>)}
          {weeks.map((date) => {
            const dayAppointments = appointments.filter((appointment) => sameDay(new Date(appointment.startsAt), date));
            const dayBlocks = blocks.filter((block) => sameDay(new Date(block.startsAt), date));
            const muted = date.getMonth() !== cursor.getMonth();
            const rule = workingHours.find((item) => item.weekday === date.getDay());
            const working = rule ? rule.enabled : !isWeekend(date);
            const available = working && dayBlocks.length === 0;
            return <button key={date.toISOString()} type="button" onClick={() => selectDay(date)} className={`min-h-24 border-b border-r border-ink-white/10 p-2 text-left transition-colors sm:min-h-28 ${sameDay(date, selectedDay) ? "bg-ink-gold/10 ring-1 ring-inset ring-ink-gold" : "hover:bg-ink-white/5"} ${muted ? "opacity-35" : ""}`}>
              <span className={`inline-flex h-6 w-6 items-center justify-center text-xs ${sameDay(date, today) ? "rounded-full bg-ink-gold text-ink-black" : "text-ink-white"}`}>{date.getDate()}</span>
              <div className="mt-2 flex flex-col gap-1">
                {dayAppointments.slice(0, 2).map((appointment) => <span key={appointment.id} className="truncate bg-red-500/15 px-1.5 py-1 text-[10px] text-red-200">{appointment.clientName} · {new Date(appointment.startsAt).toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" })}</span>)}
                {dayAppointments.length > 2 && <span className="text-[10px] text-ink-grey">+{dayAppointments.length - 2} wizyty</span>}
                {dayBlocks.length > 0 && <span className="truncate bg-ink-white/10 px-1.5 py-1 text-[10px] text-ink-grey">NIEDOSTĘPNY</span>}
                {available && <span className="truncate bg-emerald-500/15 px-1.5 py-1 text-[10px] text-emerald-300">{dayAppointments.length ? "WOLNE GODZINY" : "WOLNY TERMIN"}</span>}
              </div>
            </button>;
          })}
        </div>
      </div>

      <aside className="border border-ink-white/10 bg-ink-charcoal/40 p-5">
        <p className="text-[11px] tracking-[0.15em] text-ink-gold">PLAN DNIA</p>
        <h2 className="mt-2 font-display text-2xl text-ink-white">{selectedDay.toLocaleDateString("pl-PL", { weekday: "long", day: "numeric", month: "long" })}</h2>
        {!isWorkingDay ? <p className="mt-5 border border-ink-white/10 p-4 text-sm text-ink-grey">Ten dzień jest oznaczony jako wolny. Godziny pracy zmienisz w dostępności.</p> : (
          <div className="mt-5 flex flex-col gap-2">
            {hours.map((hour) => {
              const slotStart = new Date(selectedDay); slotStart.setHours(hour, 0, 0, 0);
              const slotEnd = new Date(slotStart); slotEnd.setHours(hour + 1);
              const appointment = appointmentsForDay.find((item) => new Date(item.startsAt) < slotEnd && new Date(item.endsAt) > slotStart);
              const blocked = blocksForDay.find((item) => new Date(item.startsAt) < slotEnd && new Date(item.endsAt) > slotStart);
              return <div key={hour} className={`flex min-h-12 items-center gap-3 border px-3 py-2 ${appointment ? "border-red-500/30 bg-red-500/10" : blocked ? "border-ink-white/10 bg-ink-black/20" : "border-emerald-500/20 bg-emerald-500/5"}`}>
                <time className="w-11 text-xs text-ink-grey">{String(hour).padStart(2, "0")}:00</time>
                {appointment ? <div className="min-w-0"><p className="truncate text-sm text-ink-white">{appointment.clientName}</p><p className="truncate text-[11px] text-red-200">{appointment.projectTitle}</p></div> : blocked ? <p className="text-xs text-ink-grey">{blocked.reason || "Niedostępny"}</p> : <p className="text-xs tracking-[0.08em] text-emerald-300">WOLNY TERMIN</p>}
              </div>;
            })}
          </div>
        )}
        <p className="mt-5 text-xs leading-relaxed text-ink-grey">Klient zobaczy wyłącznie wolny termin albo czerwony znacznik zajętości — bez danych innych osób.</p>
      </aside>
    </section>
  );
}
