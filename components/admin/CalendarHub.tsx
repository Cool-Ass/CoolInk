"use client";

import { useMemo, useState, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import CalendarItemEditor, { type CalendarEditorItem } from "@/components/admin/calendar/CalendarItemEditor";
import RecurringHoursEditor, { type RecurringHours } from "@/components/admin/calendar/RecurringHoursEditor";
import AppModal from "@/components/ui/AppModal";
import { isOperationalCalendarAppointment, localDateKey, mergeSelectedDates, startOfLocalDay } from "@/lib/calendarHub";

type Appointment = { id: string; startsAt: string; endsAt: string; status: string; price: number | null; notes: string | null; clientId: string; clientName: string; projectTitle: string };
type Block = { id: string; startsAt: string; endsAt: string; reason: string | null };
type Override = { id: string; date: string; enabled: boolean; startsAt: string; endsAt: string; breakStart?: string | null; breakEnd?: string | null };
type Slot = { id: string; startsAt: string; endsAt: string; title: string | null; description: string | null; color: string; icon: string | null; isPublic: boolean };
type Promotion = { id: string; title: string; description: string | null; badge: string | null; startsAt: string; endsAt: string; color: string; icon: string | null; isPublic: boolean; active: boolean };
type Event = { id: string; title: string; description: string | null; startsAt: string; endsAt: string; color: string; icon: string | null; label: string | null; isPublic: boolean; allDay: boolean };
type Filter = "appointments" | "freeTerms" | "promotions" | "daysOff" | "events";

const DAYS = ["PN", "WT", "ŚR", "CZ", "PT", "SB", "ND"];
const MONTHS = ["styczeń", "luty", "marzec", "kwiecień", "maj", "czerwiec", "lipiec", "sierpień", "wrzesień", "październik", "listopad", "grudzień"];
const FILTERS: Record<Filter, string> = { appointments: "Wizyty", freeTerms: "Wolne", promotions: "Promocje", daysOff: "Niedostępne", events: "Eventy" };
const endOfDay = (value: Date) => { const end = startOfLocalDay(value); end.setDate(end.getDate() + 1); return end; };
const inDay = (item: { startsAt: string; endsAt: string }, date: Date) => new Date(item.startsAt) < endOfDay(date) && new Date(item.endsAt) > startOfLocalDay(date);
const sameDay = (a: Date, b: Date) => localDateKey(a) === localDateKey(b);
const time = (value: string) => new Date(value).toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" });

export default function CalendarHub({ appointments, blocks, workingHours, overrides: _overrides, slots, promotions, events, bufferMinutes, stats }: { appointments: Appointment[]; blocks: Block[]; workingHours: RecurringHours[]; overrides: Override[]; slots: Slot[]; promotions: Promotion[]; events: Event[]; bufferMinutes: number; stats: { appointments: number; blocks: number; newProjects: number } }) {
  const router = useRouter();
  const today = startOfLocalDay(new Date());
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDays, setSelectedDays] = useState<Date[]>([today]);
  const [rangeStart, setRangeStart] = useState<Date | null>(today);
  const [selectMode, setSelectMode] = useState(false);
  const [filters, setFilters] = useState<Record<Filter, boolean>>({ appointments: true, freeTerms: true, promotions: true, daysOff: true, events: true });
  const [editor, setEditor] = useState<CalendarEditorItem | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [clearing, setClearing] = useState(false);
  const selected = selectedDays[0] ?? today;
  const selectedKeys = new Set(selectedDays.map(localDateKey));
  const dates = useMemo(() => { const start = new Date(cursor); start.setDate(start.getDate() - ((start.getDay() + 6) % 7)); return Array.from({ length: 42 }, (_, index) => { const date = new Date(start); date.setDate(start.getDate() + index); return date; }); }, [cursor]);
  const matching = <T extends { startsAt: string; endsAt: string }>(items: T[], date: Date, filter: Filter) => filters[filter] ? items.filter((item) => inDay(item, date)) : [];
  const activeAppointments = (date: Date) => filters.appointments ? appointments.filter((item) => isOperationalCalendarAppointment(item.status) && sameDay(new Date(item.startsAt), date)) : [];
  const itemDates = selectedDays.length > 1 ? selectedDays.map((date) => date.toISOString()) : undefined;

  const create = (kind: CalendarEditorItem["kind"]) => {
    const startsAt = new Date(selected); const endsAt = new Date(selected);
    startsAt.setHours(kind === "freeTerm" ? 10 : 0, 0, 0, 0);
    endsAt.setHours(kind === "freeTerm" ? 18 : 23, kind === "freeTerm" ? 0 : 59, 0, 0);
    setEditor({ kind, startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString(), dates: itemDates, ...(kind === "dayOff" ? { reason: "Niedostępny" } : {}), ...(kind === "freeTerm" ? { color: "#10B981", isPublic: true } : {}), ...(kind === "promotion" ? { title: "", badge: "PROMO", color: "#C99A4A", active: true, isPublic: true } : {}), ...(kind === "event" ? { title: "", color: "#6B7280", isPublic: false } : {}) });
  };
  const selectDay = (date: Date, event: MouseEvent<HTMLButtonElement>) => {
    const additive = selectMode || event.ctrlKey || event.metaKey;
    setSelectedDays((current) => mergeSelectedDates(current, date, { additive, rangeFrom: event.shiftKey ? rangeStart : null }));
    if (!event.shiftKey) setRangeStart(startOfLocalDay(date));
    if (date.getMonth() !== cursor.getMonth()) setCursor(new Date(date.getFullYear(), date.getMonth(), 1));
  };
  async function clearStatus() {
    setClearing(true);
    try {
      const query = new URLSearchParams({ kind: "clearStatus" });
      selectedDays.forEach((date) => query.append("date", date.toISOString()));
      const response = await fetch(`/api/admin/calendar-items?${query}`, { method: "DELETE" });
      const data = await response.json(); if (!response.ok) throw new Error(data.error);
      router.refresh();
    } finally { setClearing(false); }
  }

  return <section className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3 border border-ink-white/10 bg-ink-charcoal/35 px-4 py-3"><p className="text-xs text-ink-grey"><strong className="font-medium text-ink-white">{stats.appointments} wizyty</strong> · {stats.blocks} niedostępne dni · {stats.newProjects} nowe zgłoszenia</p><button type="button" onClick={() => setSettingsOpen(true)} className="px-3 py-2 text-[11px] text-ink-grey hover:text-ink-gold">USTAWIENIA KALENDARZA</button></div>
    <div className="flex flex-wrap items-center gap-2 border border-ink-white/10 bg-ink-charcoal/20 p-3"><button type="button" onClick={() => setSelectMode((value) => !value)} className={`border px-3 py-2 text-[10px] tracking-[.1em] ${selectMode ? "border-ink-gold bg-ink-gold/10 text-ink-gold" : "border-ink-white/15 text-ink-grey"}`}>{selectMode ? "ZAZNACZANIE: WŁ." : "ZAZNACZ"}</button><span className="hidden text-[10px] text-ink-grey sm:inline">{selectMode ? "Dotknij dni, aby zaznaczyć wiele." : "CTRL/CMD dodaje · SHIFT zaznacza zakres."}</span><span className="ml-auto text-[10px] text-ink-grey">{selectedDays.length ? `Zaznaczono: ${selectedDays.length}` : "Brak zaznaczenia"}</span></div>
    <div className="flex flex-wrap items-center gap-2 border border-ink-white/10 bg-ink-charcoal/20 p-3"><span className="mr-1 text-[10px] tracking-[.12em] text-ink-grey">FILTRY</span>{(Object.keys(FILTERS) as Filter[]).map((filter) => <button type="button" key={filter} onClick={() => setFilters((current) => ({ ...current, [filter]: !current[filter] }))} className={`border px-2.5 py-1.5 text-[10px] ${filters[filter] ? "border-ink-gold/70 bg-ink-gold/10 text-ink-gold" : "border-ink-white/15 text-ink-grey"}`}>{FILTERS[filter]}</button>)}</div>
    <div className="border border-ink-white/10 bg-ink-charcoal/30 p-3 sm:p-6"><div className="mb-5 flex items-center justify-between gap-3"><button type="button" aria-label="Poprzedni miesiąc" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))} className="border border-ink-white/15 px-3 py-2 hover:border-ink-gold">←</button><div className="text-center"><h2 className="font-display text-2xl">{MONTHS[cursor.getMonth()]} {cursor.getFullYear()}</h2><p className="mt-1 text-[10px] tracking-widest text-ink-grey">ZAZNACZ DZIEŃ I USTAW JEGO STATUS</p></div><button type="button" aria-label="Następny miesiąc" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))} className="border border-ink-white/15 px-3 py-2 hover:border-ink-gold">→</button></div>
      <div className="grid grid-cols-7 border-l border-t border-ink-white/10">{DAYS.map((day) => <div key={day} className="border-b border-r border-ink-white/10 py-2 text-center text-[10px] text-ink-grey">{day}</div>)}{dates.map((date) => { const dayBlocks = matching(blocks, date, "daysOff"), daySlots = matching(slots, date, "freeTerms"), dayPromos = matching(promotions.filter((item) => item.active), date, "promotions"), dayEvents = matching(events, date, "events"), dayAppointments = activeAppointments(date); const explicit = dayBlocks.length ? { name: "NIEDOSTĘPNY", className: "bg-red-500/15" } : daySlots.length ? { name: "WOLNY", className: "bg-emerald-500/15" } : date.getDay() === 0 ? { name: "NIEDZIELA", className: "bg-red-500/10" } : { name: "NIEOZNACZONY", className: "bg-ink-white/[0.035]" }; const eventColor = !daySlots.length && !dayBlocks.length ? (dayEvents[0]?.color ?? dayPromos[0]?.color) : undefined; return <div key={date.toISOString()} style={eventColor ? { backgroundColor: `${eventColor}26` } : undefined} className={`min-h-24 border-b border-r border-ink-white/10 p-1.5 sm:min-h-32 sm:p-2 ${explicit.className} ${selectedKeys.has(localDateKey(date)) ? "ring-1 ring-inset ring-ink-gold" : ""} ${date.getMonth() !== cursor.getMonth() ? "opacity-35" : ""}`}><button type="button" onClick={(event) => selectDay(date, event)} className="w-full text-left"><b className="text-sm sm:text-base">{date.getDate()}</b><span className={`mt-1 block text-[7px] tracking-wide sm:text-[8px] ${dayBlocks.length || date.getDay() === 0 ? "text-red-200" : daySlots.length ? "text-emerald-200" : "text-ink-grey"}`}>{explicit.name}</span></button><div className="mt-1 space-y-1">{daySlots.slice(0, 1).map((item) => <button key={item.id} type="button" onClick={() => setEditor({ ...item, kind: "freeTerm" })} className="block w-full truncate px-1 text-left text-[8px] text-ink-black" style={{ backgroundColor: item.color }}>WOLNY · {time(item.startsAt)}–{time(item.endsAt)}</button>)}{dayBlocks.slice(0, 1).map((item) => <button key={item.id} type="button" onClick={() => setEditor({ ...item, kind: "dayOff" })} className="block w-full truncate bg-red-500/25 px-1 text-left text-[8px] text-red-100">◆ NIEDOSTĘPNY</button>)}{dayPromos.slice(0, 1).map((item) => <button key={item.id} type="button" onClick={() => setEditor({ ...item, kind: "promotion" })} className="block w-full truncate px-1 text-left text-[8px] text-ink-black" style={{ backgroundColor: item.color }}>{item.badge || "PROMO"}</button>)}{dayEvents.slice(0, 1).map((item) => <button key={item.id} type="button" onClick={() => setEditor({ ...item, kind: "event" })} className="block w-full truncate px-1 text-left text-[8px] text-ink-black" style={{ backgroundColor: item.color }}>{item.label || "EVENT"}</button>)}{dayAppointments.slice(0, 1).map((item) => <button type="button" key={item.id} onClick={() => setEditor({ ...item, kind: "appointment" })} className="block w-full truncate bg-ink-black/30 px-1 text-left text-[8px] text-ink-white">{item.clientName} · {time(item.startsAt)}</button>)}</div></div>; })}</div>
      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-[10px] text-ink-grey"><span>■ SZARY — brak oznaczenia</span><span className="text-emerald-300">■ ZIELONY — wolny</span><span className="text-red-300">■ CZERWONY — niedostępny</span><span>■ kolor — event/promo</span></div>
    </div>
    {selectedDays.length > 0 && <div className="sticky bottom-3 z-20 flex flex-wrap items-center gap-2 border border-ink-gold/50 bg-ink-charcoal p-3 shadow-2xl"><p className="mr-2 text-xs text-ink-grey">USTAW DLA {selectedDays.length} {selectedDays.length === 1 ? "DNIA" : "DNI"}</p><button type="button" onClick={() => create("freeTerm")} className="border border-emerald-400/70 px-3 py-2 text-xs text-emerald-300 hover:bg-emerald-500/10">WOLNY</button><button type="button" onClick={() => create("dayOff")} className="border border-red-400/70 px-3 py-2 text-xs text-red-200 hover:bg-red-500/10">NIEDOSTĘPNY</button><button type="button" onClick={() => create("event")} className="border border-ink-white/20 px-3 py-2 text-xs">EVENT</button><button type="button" onClick={() => create("promotion")} className="border border-ink-gold/70 px-3 py-2 text-xs text-ink-gold">PROMO</button><button type="button" disabled={clearing} onClick={clearStatus} className="ml-auto px-3 py-2 text-xs text-ink-grey hover:text-ink-white">{clearing ? "CZYSZCZENIE…" : "WYCZYŚĆ OZNACZENIE"}</button></div>}
    {editor && <CalendarItemEditor item={editor} onClose={() => setEditor(null)} />}
    {settingsOpen && <AppModal title="Ustawienia kalendarza" subtitle="Godziny pracy są ustawieniem wewnętrznym. Nie publikują wolnych terminów." onClose={() => setSettingsOpen(false)}><RecurringHoursEditor initialHours={workingHours} bufferMinutes={bufferMinutes} /></AppModal>}
  </section>;
}
