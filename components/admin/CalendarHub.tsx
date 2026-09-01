"use client";

import { useEffect, useMemo, useState, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import CalendarItemEditor, { type CalendarEditorItem } from "@/components/admin/calendar/CalendarItemEditor";
import CalendarSettingsEditor from "@/components/admin/calendar/CalendarSettingsEditor";
import AppModal from "@/components/ui/AppModal";
import { isOperationalCalendarAppointment, localDateKey, mergeSelectedDates, startOfLocalDay } from "@/lib/calendarHub";

type Appointment = { id: string; startsAt: string; endsAt: string; status: string; price: number | null; notes: string | null; clientId: string; clientName: string; projectTitle: string };
type Block = { id: string; startsAt: string; endsAt: string; reason: string | null };
type Override = { id: string; date: string; enabled: boolean; startsAt: string; endsAt: string; breakStart?: string | null; breakEnd?: string | null };
type Slot = { id: string; startsAt: string; endsAt: string; title: string | null; description: string | null; color: string; icon: string | null; isPublic: boolean };
type Promotion = { id: string; title: string; description: string | null; badge: string | null; startsAt: string; endsAt: string; color: string; icon: string | null; isPublic: boolean; active: boolean };
type Event = { id: string; title: string; description: string | null; startsAt: string; endsAt: string; color: string; icon: string | null; label: string | null; isPublic: boolean; allDay: boolean; google?: boolean; syncStatus?: string | null };

const DAYS = ["PN", "WT", "ŚR", "CZ", "PT", "SB", "ND"];
const MONTHS = ["styczeń", "luty", "marzec", "kwiecień", "maj", "czerwiec", "lipiec", "sierpień", "wrzesień", "październik", "listopad", "grudzień"];
const endOfDay = (value: Date) => { const end = startOfLocalDay(value); end.setDate(end.getDate() + 1); return end; };
const inDay = (item: { startsAt: string; endsAt: string }, date: Date) => new Date(item.startsAt) < endOfDay(date) && new Date(item.endsAt) > startOfLocalDay(date);
const sameDay = (a: Date, b: Date) => localDateKey(a) === localDateKey(b);
// The studio operates in Warsaw time.  Relying on a browser's implicit
// timezone made imported Google events appear one hour off in remote/admin
// environments even though their persisted UTC range was correct.
const time = (value: string) => new Date(value).toLocaleTimeString("pl-PL", { timeZone: "Europe/Warsaw", hour: "2-digit", minute: "2-digit" });

export default function CalendarHub({ appointments, blocks, slots, promotions, events, bufferMinutes, visibleMonths, defaultFreeStart, defaultFreeEnd, stats }: { appointments: Appointment[]; blocks: Block[]; slots: Slot[]; promotions: Promotion[]; events: Event[]; bufferMinutes: number; visibleMonths: number; defaultFreeStart: string; defaultFreeEnd: string; stats: { appointments: number; blocks: number; newProjects: number } }) {
  const router = useRouter();
  const today = startOfLocalDay(new Date());
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDays, setSelectedDays] = useState<Date[]>([]);
  const [rangeStart, setRangeStart] = useState<Date | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [editor, setEditor] = useState<CalendarEditorItem | null>(null);
  const [dayMenuOpen, setDayMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [clearing, setClearing] = useState(false);
  const selected = selectedDays[0] ?? today;
  const selectedKeys = new Set(selectedDays.map(localDateKey));
  const dates = useMemo(() => { const start = new Date(cursor); start.setDate(start.getDate() - ((start.getDay() + 6) % 7)); return Array.from({ length: 42 }, (_, index) => { const date = new Date(start); date.setDate(start.getDate() + index); return date; }); }, [cursor]);
  const matching = <T extends { startsAt: string; endsAt: string }>(items: T[], date: Date) => items.filter((item) => inDay(item, date));
  const activeAppointments = (date: Date) => appointments.filter((item) => isOperationalCalendarAppointment(item.status) && sameDay(new Date(item.startsAt), date));
  const itemDates = selectedDays.length > 1 ? selectedDays.map((date) => date.toISOString()) : undefined;

  useEffect(() => {
    const showPendingMenu = () => {
      if (selectedDays.length > 1 && !selectMode) setDayMenuOpen(true);
    };
    window.addEventListener("keyup", showPendingMenu);
    return () => window.removeEventListener("keyup", showPendingMenu);
  }, [selectedDays.length, selectMode]);
  const create = (kind: CalendarEditorItem["kind"]) => {
    const startsAt = new Date(selected); const endsAt = new Date(selected);
    const [defaultStartHour, defaultStartMinute] = defaultFreeStart.split(":").map(Number);
    const [defaultEndHour, defaultEndMinute] = defaultFreeEnd.split(":").map(Number);
    startsAt.setHours(kind === "freeTerm" ? defaultStartHour : 0, kind === "freeTerm" ? defaultStartMinute : 0, 0, 0);
    endsAt.setHours(kind === "freeTerm" ? defaultEndHour : 23, kind === "freeTerm" ? defaultEndMinute : 59, 0, 0);
    setEditor({ kind, startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString(), dates: itemDates, ...(kind === "dayOff" ? { reason: "Niedostępny" } : {}), ...(kind === "freeTerm" ? { color: "#10B981", isPublic: true } : {}), ...(kind === "promotion" ? { title: "", badge: "PROMO", color: "#C99A4A", active: true, isPublic: true } : {}), ...(kind === "event" ? { title: "", color: "#6B7280", isPublic: false } : {}) });
  };
  const selectDay = (date: Date, event: MouseEvent<HTMLButtonElement>) => {
    const additive = selectMode || event.ctrlKey || event.metaKey;
    const hasModifier = event.ctrlKey || event.metaKey || event.shiftKey;
    const hasRange = event.shiftKey && rangeStart !== null;
    setSelectedDays((current) => hasModifier ? mergeSelectedDates(current, date, { additive, rangeFrom: hasRange ? rangeStart : null }) : [startOfLocalDay(date)]);
    if (event.shiftKey && !rangeStart) { setRangeStart(startOfLocalDay(date)); setDayMenuOpen(false); }
    else if (!event.shiftKey) setRangeStart(startOfLocalDay(date));
    if (!selectMode && !hasModifier) setDayMenuOpen(true);
    if (selectMode) setDayMenuOpen(false);
    if (date.getMonth() !== cursor.getMonth()) setCursor(new Date(date.getFullYear(), date.getMonth(), 1));
  };
  async function clearStatus() {
    setClearing(true);
    try {
      const query = new URLSearchParams({ kind: "clearStatus" });
      selectedDays.forEach((date) => query.append("date", date.toISOString()));
      const response = await fetch(`/api/admin/calendar-items?${query}`, { method: "DELETE" });
      const data = await response.json(); if (!response.ok) throw new Error(data.error);
      setDayMenuOpen(false); router.refresh();
    } finally { setClearing(false); }
  }

  return <section className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3 border border-ink-white/10 bg-ink-charcoal/35 px-4 py-3"><p className="text-xs text-ink-grey"><strong className="font-medium text-ink-white">{stats.appointments} wizyty</strong> · {stats.blocks} niedostępne dni · {stats.newProjects} nowe zgłoszenia</p><button type="button" onClick={() => setSettingsOpen(true)} className="px-3 py-2 text-[11px] text-ink-grey hover:text-ink-gold">USTAWIENIA KALENDARZA</button></div>
    <div className="flex items-center justify-end"><button type="button" onClick={() => { if (selectMode && selectedDays.length) setDayMenuOpen(true); setSelectMode((value) => !value); }} className={`border px-3 py-2 text-[10px] tracking-[.1em] ${selectMode ? "border-ink-gold bg-ink-gold/10 text-ink-gold" : "border-ink-white/15 text-ink-grey"}`}>{selectMode ? "GOTOWE" : "ZAZNACZ"}</button></div>
    <div className="border border-ink-white/10 bg-ink-charcoal/30 p-3 sm:p-6"><div className="mb-5 flex items-center justify-between gap-3"><button type="button" aria-label="Poprzedni miesiąc" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))} className="border border-ink-white/15 px-3 py-2 hover:border-ink-gold">←</button><h2 className="font-display text-2xl">{MONTHS[cursor.getMonth()]} {cursor.getFullYear()}</h2><button type="button" aria-label="Następny miesiąc" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))} className="border border-ink-white/15 px-3 py-2 hover:border-ink-gold">→</button></div>
      <div className="grid grid-cols-7 border-l border-t border-ink-white/10">{DAYS.map((day) => <div key={day} className="border-b border-r border-ink-white/10 py-2 text-center text-[10px] text-ink-grey">{day}</div>)}{dates.map((date) => { const dayBlocks = matching(blocks, date), daySlots = matching(slots, date), dayPromos = matching(promotions.filter((item) => item.active), date), dayEvents = matching(events, date), dayAppointments = activeAppointments(date); const explicit = dayBlocks.length ? { name: "NIEDOSTĘPNY", className: "bg-red-500/15" } : daySlots.length ? { name: "WOLNY", className: "bg-emerald-500/15" } : date.getDay() === 0 ? { name: "NIEDZIELA", className: "bg-red-500/10" } : { name: "NIEOZNACZONY", className: "bg-ink-white/[0.035]" }; const eventColor = !daySlots.length && !dayBlocks.length ? (dayEvents[0]?.color ?? dayPromos[0]?.color) : undefined; return <div key={date.toISOString()} style={eventColor ? { backgroundColor: `${eventColor}26` } : undefined} className={`min-h-24 border-b border-r border-ink-white/10 p-1.5 sm:min-h-32 sm:p-2 ${explicit.className} ${selectedKeys.has(localDateKey(date)) ? "ring-1 ring-inset ring-ink-gold" : ""} ${date.getMonth() !== cursor.getMonth() ? "opacity-35" : ""}`}><button type="button" onClick={(event) => selectDay(date, event)} className="w-full text-left"><b className="text-sm sm:text-base">{date.getDate()}</b><span className={`mt-1 block text-[7px] tracking-wide sm:text-[8px] ${dayBlocks.length || date.getDay() === 0 ? "text-red-200" : daySlots.length ? "text-emerald-200" : "text-ink-grey"}`}>{explicit.name}</span></button><div className="mt-1 space-y-1">{daySlots.slice(0, 1).map((item) => <button key={item.id} type="button" onClick={() => setEditor({ ...item, kind: "freeTerm" })} className="block w-full truncate px-1 text-left text-[8px] text-ink-black" style={{ backgroundColor: item.color }}>WOLNY · {time(item.startsAt)}–{time(item.endsAt)}</button>)}{dayBlocks.slice(0, 1).map((item) => <button key={item.id} type="button" onClick={() => setEditor({ ...item, kind: "dayOff" })} className="block w-full truncate bg-red-500/25 px-1 text-left text-[8px] text-red-100">◆ NIEDOSTĘPNY</button>)}{dayPromos.slice(0, 1).map((item) => <button key={item.id} type="button" onClick={() => setEditor({ ...item, kind: "promotion" })} className="block w-full truncate px-1 text-left text-[8px] text-ink-black" style={{ backgroundColor: item.color }}>{item.badge || "PROMO"}</button>)}{dayEvents.slice(0, 2).map((item) => <button key={item.id} type="button" onClick={() => item.google ? undefined : setEditor({ ...item, kind: "event" })} className="block w-full truncate px-1 text-left text-[8px] text-ink-black" style={{ backgroundColor: item.color }}>{item.google ? `${time(item.startsAt)} ${item.title} · Google` : item.label || "EVENT"}</button>)}{dayAppointments.slice(0, 1).map((item) => <button type="button" key={item.id} onClick={() => setEditor({ ...item, kind: "appointment" })} className="block w-full truncate bg-ink-black/30 px-1 text-left text-[8px] text-ink-white">{item.clientName} · {time(item.startsAt)}</button>)}</div></div>; })}</div>
    </div>
    {dayMenuOpen && selectedDays.length > 0 && <AppModal title={selectedDays.length === 1 ? "Ustaw dzień" : `Ustaw dla ${selectedDays.length} dni`} size="sm" onClose={() => setDayMenuOpen(false)}><div className="grid gap-2"><button type="button" onClick={() => { setDayMenuOpen(false); create("freeTerm"); }} className="border border-emerald-400/70 px-3 py-3 text-left text-sm text-emerald-300">WOLNY</button><button type="button" onClick={() => { setDayMenuOpen(false); create("dayOff"); }} className="border border-red-400/70 px-3 py-3 text-left text-sm text-red-200">NIEDOSTĘPNY</button><button type="button" onClick={() => { setDayMenuOpen(false); create("event"); }} className="border border-ink-white/20 px-3 py-3 text-left text-sm">EVENT</button><button type="button" onClick={() => { setDayMenuOpen(false); create("promotion"); }} className="border border-ink-gold/70 px-3 py-3 text-left text-sm text-ink-gold">PROMO</button><button type="button" disabled={clearing} onClick={clearStatus} className="px-3 py-3 text-left text-sm text-ink-grey hover:text-ink-white">{clearing ? "CZYSZCZENIE…" : "WYCZYŚĆ"}</button></div></AppModal>}
    {editor && <CalendarItemEditor item={editor} onClose={() => setEditor(null)} />}
    {settingsOpen && <AppModal title="Ustawienia kalendarza" onClose={() => setSettingsOpen(false)}><CalendarSettingsEditor bufferMinutes={bufferMinutes} visibleMonths={visibleMonths} defaultFreeStart={defaultFreeStart} defaultFreeEnd={defaultFreeEnd} /></AppModal>}
  </section>;
}
