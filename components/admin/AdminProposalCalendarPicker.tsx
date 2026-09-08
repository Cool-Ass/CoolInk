"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, LoaderCircle } from "lucide-react";

type Range = { startsAt: string; endsAt: string };
type Snapshot = { appointments: Range[]; blocks: Range[]; slots: Range[]; googleBusy: Range[]; bufferMinutes: number };
const EMPTY: Snapshot = { appointments: [], blocks: [], slots: [], googleBusy: [], bufferMinutes: 0 };
const months = ["styczeń", "luty", "marzec", "kwiecień", "maj", "czerwiec", "lipiec", "sierpień", "wrzesień", "październik", "listopad", "grudzień"];
const key = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const localValue = (date: Date) => `${key(date)}T${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
const dayStart = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const overlaps = (start: Date, end: Date, range: Range, bufferMinutes = 0) => start < new Date(new Date(range.endsAt).getTime() + bufferMinutes * 60_000) && end > new Date(new Date(range.startsAt).getTime() - bufferMinutes * 60_000);

export default function AdminProposalCalendarPicker({ value, onChange, durationMinutes = 60 }: { value: string; onChange: (value: string) => void; durationMinutes?: number }) {
  const today = dayStart(new Date());
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDay, setSelectedDay] = useState(value ? value.slice(0, 10) : "");
  const [data, setData] = useState<Snapshot>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/admin/calendar-snapshot", { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Nie udało się pobrać dostępności.");
        return response.json();
      })
      .then((result) => setData({ ...EMPTY, ...result }))
      .catch((reason) => {
        if (reason instanceof Error && reason.name !== "AbortError") setError(reason.message);
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  const freeStarts = (date: Date) => {
    const dayKey = key(date);
    const now = new Date();
    const result: Date[] = [];
    for (const slot of data.slots) {
      const slotStart = new Date(slot.startsAt);
      const slotEnd = new Date(slot.endsAt);
      if (key(slotStart) !== dayKey && key(new Date(slotEnd.getTime() - 1)) !== dayKey) continue;
      const selectedDayStart = dayStart(date);
      const selectedDayEnd = new Date(selectedDayStart); selectedDayEnd.setDate(selectedDayEnd.getDate() + 1);
      const effectiveEnd = new Date(Math.min(slotEnd.getTime(), selectedDayEnd.getTime()));
      const cursorDate = new Date(Math.max(slotStart.getTime(), selectedDayStart.getTime()));
      cursorDate.setMinutes(Math.ceil(cursorDate.getMinutes() / 30) * 30, 0, 0);
      while (cursorDate.getTime() + durationMinutes * 60_000 <= effectiveEnd.getTime()) {
        const end = new Date(cursorDate.getTime() + durationMinutes * 60_000);
        const appointmentConflict = data.appointments.some((range) => overlaps(cursorDate, end, range, data.bufferMinutes));
        const otherConflict = [...data.blocks, ...data.googleBusy].some((range) => overlaps(cursorDate, end, range));
        if (cursorDate >= now && !appointmentConflict && !otherConflict) result.push(new Date(cursorDate));
        cursorDate.setMinutes(cursorDate.getMinutes() + 30);
      }
    }
    return Array.from(new Map(result.map((dateValue) => [dateValue.getTime(), dateValue])).values()).sort((a, b) => a.getTime() - b.getTime());
  };

  const days = useMemo(() => {
    const start = new Date(cursor);
    start.setDate(1 - ((start.getDay() + 6) % 7));
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      return date;
    });
  }, [cursor]);
  const selectedDate = selectedDay ? new Date(`${selectedDay}T12:00:00`) : null;
  const selectedStarts = selectedDate ? freeStarts(selectedDate) : [];

  return <div>
    <div className="mb-3 flex items-center justify-between">
      <button type="button" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))} className="flex h-8 w-8 items-center justify-center border border-ink-white/15 text-sm hover:border-ink-gold hover:text-ink-gold">←</button>
      <p className="font-display text-xl">{months[cursor.getMonth()]} {cursor.getFullYear()}</p>
      <button type="button" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))} className="flex h-8 w-8 items-center justify-center border border-ink-white/15 text-sm hover:border-ink-gold hover:text-ink-gold">→</button>
    </div>
    {loading ? <div className="flex min-h-52 items-center justify-center gap-2 border border-ink-white/10 text-xs text-ink-grey"><LoaderCircle className="h-4 w-4 animate-spin" />Sprawdzam wolne terminy…</div> : error ? <p className="border border-red-400/30 p-4 text-xs text-red-200">{error}</p> : <>
      <div className="grid grid-cols-7 border-l border-t border-ink-white/10">
        {["PN", "WT", "ŚR", "CZ", "PT", "SB", "ND"].map((day) => <span key={day} className="border-b border-r border-ink-white/10 py-1 text-center text-[9px] text-ink-grey">{day}</span>)}
        {days.map((date) => {
          const available = freeStarts(date);
          const muted = date.getMonth() !== cursor.getMonth();
          const past = date < today;
          const selected = selectedDay === key(date);
          return <button key={date.toISOString()} type="button" disabled={past || !available.length} onClick={() => { setSelectedDay(key(date)); onChange(localValue(available[0])); }} className={`min-h-12 border-b border-r border-ink-white/10 p-1 text-left text-xs transition-colors ${selected ? "bg-ink-gold/15 ring-1 ring-inset ring-ink-gold" : available.length ? "bg-emerald-500/12 text-emerald-200 hover:bg-emerald-500/20" : "bg-ink-white/[0.02] text-ink-grey/45"} ${muted ? "opacity-35" : ""} disabled:cursor-not-allowed`}><b>{date.getDate()}</b><span className="mt-1 block text-[7px]">{available.length ? `${available.length} WOLNYCH` : "BRAK"}</span></button>;
        })}
      </div>
      <div className="mt-3 border border-ink-white/10 bg-ink-black/25 p-3">
        <div className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-ink-gold" /><p className="text-[10px] tracking-[.1em] text-ink-grey">{selectedDate ? `WOLNE GODZINY · ${selectedDate.toLocaleDateString("pl-PL", { day: "numeric", month: "long" })}` : "WYBIERZ ZIELONY DZIEŃ"}</p></div>
        {selectedDate && <div className="mt-3 flex flex-wrap gap-2">{selectedStarts.length ? selectedStarts.map((start) => {
          const option = localValue(start);
          return <button key={option} type="button" onClick={() => onChange(option)} className={`border px-3 py-2 text-xs ${value === option ? "border-ink-gold bg-ink-gold text-ink-black" : "border-emerald-400/35 text-emerald-200 hover:border-emerald-300"}`}>{start.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" })}</button>;
        }) : <p className="text-xs text-ink-grey">Brak zakresu mieszczącego wybrany czas wizyty.</p>}</div>}
      </div>
      <p className="mt-2 text-[10px] leading-relaxed text-ink-grey">Pokazuję wyłącznie godziny mieszczące się w oznaczonych wolnych terminach, bez kolizji z wizytami, blokadami i kalendarzem Google. Uwzględniam bufor {data.bufferMinutes} min.</p>
    </>}
  </div>;
}
