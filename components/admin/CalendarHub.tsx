"use client";

import { useEffect, useMemo, useState, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import CalendarItemEditor, { type CalendarEditorItem } from "@/components/admin/calendar/CalendarItemEditor";
import CalendarSettingsEditor from "@/components/admin/calendar/CalendarSettingsEditor";
import CalendarMonthGrid, { calendarEntryClassName } from "@/components/calendar/CalendarMonthGrid";
import AppModal from "@/components/ui/AppModal";
import { CALENDAR_AVAILABLE_COLOR, CONSULTATION_SLOT_TITLE, isConsultationSlot, isOperationalCalendarAppointment, localDateKey, mergeSelectedDates, resolveAvailableRanges, resolveCalendarDayAppearance, startOfLocalDay } from "@/lib/calendarHub";

type Appointment = { id: string; startsAt: string; endsAt: string; status: string; price: number | null; notes: string | null; clientId: string; clientName: string; projectTitle: string };
type Block = { id: string; startsAt: string; endsAt: string; reason: string | null };
type Override = { id: string; date: string; enabled: boolean; startsAt: string; endsAt: string; breakStart?: string | null; breakEnd?: string | null };
type Slot = { id: string; startsAt: string; endsAt: string; title: string | null; description: string | null; color: string; icon: string | null; isPublic: boolean };
type Promotion = { id: string; title: string; description: string | null; badge: string | null; startsAt: string; endsAt: string; color: string; icon: string | null; isPublic: boolean; active: boolean };
type Event = { id: string; title: string; description: string | null; startsAt: string; endsAt: string; color: string; icon: string | null; label: string | null; isPublic: boolean; allDay: boolean; google?: boolean; syncStatus?: string | null };

const endOfDay = (value: Date) => { const end = startOfLocalDay(value); end.setDate(end.getDate() + 1); return end; };
const inDay = (item: { startsAt: string; endsAt: string }, date: Date) => new Date(item.startsAt) < endOfDay(date) && new Date(item.endsAt) > startOfLocalDay(date);
const isOccupiedBlock = (item: { reason?: string | null }) => item.reason?.trim().toLocaleUpperCase("pl-PL").startsWith("ZAJĘTY") ?? false;
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
  const itemDates = selectedDays.length > 1 ? selectedDays.map((date) => date.toISOString()) : undefined;
  const dayModels = useMemo(() => {
    const normalizedBlocks = blocks.map((item) => ({ startsAt: new Date(item.startsAt), endsAt: new Date(item.endsAt) }));
    const normalizedAppointments = appointments.map((item) => ({ startsAt: new Date(item.startsAt), endsAt: new Date(item.endsAt), status: item.status }));
    return new Map(dates.map((date) => {
      const dayBlocks = blocks.filter((item) => inDay(item, date));
      const daySlots = slots.filter((item) => inDay(item, date));
      const availableRanges = resolveAvailableRanges({
        date,
        recurring: [],
        overrides: [],
        slots: daySlots.map((item) => ({ startsAt: new Date(item.startsAt), endsAt: new Date(item.endsAt), isPublic: item.isPublic })),
        blocks: normalizedBlocks,
        appointments: normalizedAppointments,
        bufferMinutes,
      }).map((range) => ({ ...range, source: daySlots.find((item) => new Date(item.startsAt) <= range.startsAt && new Date(item.endsAt) >= range.endsAt) }));
      const dayPromos = promotions.filter((item) => item.active && inDay(item, date));
      const dayEvents = events.filter((item) => inDay(item, date));
      const dayAppointments = appointments.filter((item) => isOperationalCalendarAppointment(item.status) && inDay(item, date));
      const hasUnavailable = dayBlocks.length > 0 || dayAppointments.length > 0 || date.getDay() === 0;
      const customColor = dayEvents[0]?.color ?? dayPromos[0]?.color;
      const appearance = resolveCalendarDayAppearance({ hasAvailability: availableRanges.length > 0, hasUnavailable, customColor });
      return [localDateKey(date), { dayBlocks, availableRanges, dayPromos, dayEvents, dayAppointments, appearance }] as const;
    }));
  }, [appointments, blocks, bufferMinutes, dates, events, promotions, slots]);
  const dayFor = (date: Date) => dayModels.get(localDateKey(date))!;

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
    const isFreeTerm = kind === "freeTerm";
    const isConsultation = kind === "consultation";
    startsAt.setHours(isConsultation ? 9 : isFreeTerm ? defaultStartHour : 0, isConsultation ? 0 : isFreeTerm ? defaultStartMinute : 0, 0, 0);
    endsAt.setHours(isConsultation ? 9 : isFreeTerm ? defaultEndHour : 23, isConsultation ? 30 : isFreeTerm ? defaultEndMinute : 59, 0, 0);
    setEditor({ kind, startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString(), dates: itemDates, ...(kind === "dayOff" ? { reason: "Niedostępny" } : {}), ...(kind === "occupied" ? { reason: "ZAJĘTY" } : {}), ...(isFreeTerm ? { color: CALENDAR_AVAILABLE_COLOR, isPublic: true } : {}), ...(isConsultation ? { title: CONSULTATION_SLOT_TITLE, color: CALENDAR_AVAILABLE_COLOR, isPublic: true } : {}), ...(kind === "promotion" ? { title: "", badge: "PROMO", color: "#C99A4A", active: true, isPublic: true } : {}), ...(kind === "event" ? { title: "", color: "#6B7280", isPublic: false } : {}) });
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

  return <section className="space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-3 border border-ink-white/10 bg-ink-charcoal/35 px-3 py-2.5 sm:px-4"><p className="text-xs text-ink-grey"><strong className="font-medium text-ink-white">{stats.appointments} wizyty</strong> · {stats.blocks} niedostępne dni · {stats.newProjects} nowe zgłoszenia</p><div className="flex items-center gap-1"><button type="button" onClick={() => { if (selectMode && selectedDays.length) setDayMenuOpen(true); setSelectMode((value) => !value); }} className={`min-h-9 border px-3 py-2 text-[10px] tracking-[.1em] ${selectMode ? "border-ink-gold bg-ink-gold/10 text-ink-gold" : "border-ink-white/15 text-ink-grey"}`}>{selectMode ? "GOTOWE" : "ZAZNACZ WIELE"}</button><button type="button" onClick={() => setSettingsOpen(true)} className="min-h-9 px-3 py-2 text-[10px] tracking-[.08em] text-ink-grey hover:text-ink-gold">USTAWIENIA</button></div></div>
    <div className="border border-ink-white/10 bg-ink-charcoal/30 p-2.5 sm:p-4">
      <CalendarMonthGrid
        cursor={cursor}
        dates={dates}
        selectedKeys={selectedKeys}
        onPrevious={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
        onNext={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
        onDayClick={selectDay}
        appearanceFor={(date) => dayFor(date).appearance}
        renderDayContent={(date) => {
          const { dayBlocks, availableRanges, dayPromos, dayEvents, dayAppointments } = dayFor(date);
          return <>
            {availableRanges.map((item) => {
              const source = item.source;
              if (!source) return null;
              const consultation = isConsultationSlot(source);
              return <button key={`${source.id}-${item.startsAt.toISOString()}-${item.endsAt.toISOString()}`} type="button" onClick={() => setEditor({ ...source, kind: consultation ? "consultation" : "freeTerm" })} className={calendarEntryClassName("available")}>{consultation ? CONSULTATION_SLOT_TITLE : "WOLNY"} · {time(item.startsAt.toISOString())}–{time(item.endsAt.toISOString())}</button>;
            })}
            {dayBlocks.map((item) => { const occupied = isOccupiedBlock(item); return <button key={item.id} type="button" onClick={() => setEditor({ ...item, kind: occupied ? "occupied" : "dayOff" })} className={calendarEntryClassName("unavailable")}>{occupied ? "ZAJĘTY" : "NIEDOSTĘPNY"}</button>; })}
            {dayPromos.map((item) => <button key={item.id} type="button" onClick={() => setEditor({ ...item, kind: "promotion" })} className={calendarEntryClassName("custom")} style={{ backgroundColor: item.color }}>{item.badge || "PROMO"}</button>)}
            {dayEvents.map((item) => <button key={item.id} type="button" onClick={() => item.google ? undefined : setEditor({ ...item, kind: "event" })} className={calendarEntryClassName("custom")} style={{ backgroundColor: item.color }}>{item.google ? `${time(item.startsAt)} ${item.title} · Google` : item.label || "EVENT"}</button>)}
            {dayAppointments.map((item) => <button type="button" key={item.id} onClick={() => setEditor({ ...item, kind: "appointment" })} className={calendarEntryClassName("unavailable")}>{item.clientName} · {time(item.startsAt)}</button>)}
          </>;
        }}
      />
    </div>
    {dayMenuOpen && selectedDays.length > 0 && <AppModal title={selectedDays.length === 1 ? "Ustaw dzień" : `Ustaw dla ${selectedDays.length} dni`} size="sm" onClose={() => setDayMenuOpen(false)}><div className="grid gap-2"><button type="button" onClick={() => { setDayMenuOpen(false); create("freeTerm"); }} className="border border-emerald-400/70 px-3 py-3 text-left text-sm text-emerald-300">WOLNY TERMIN</button><button type="button" onClick={() => { setDayMenuOpen(false); create("consultation"); }} className="border border-emerald-400/70 px-3 py-3 text-left text-sm text-emerald-300">KONSULTACJA <span className="ml-2 text-xs text-ink-grey">09:00–09:30</span></button><button type="button" onClick={() => { setDayMenuOpen(false); create("occupied"); }} className="border border-red-400/70 px-3 py-3 text-left text-sm text-red-200">ZAJĘTY</button><button type="button" onClick={() => { setDayMenuOpen(false); create("dayOff"); }} className="border border-red-400/70 px-3 py-3 text-left text-sm text-red-200">NIEDOSTĘPNE</button><button type="button" onClick={() => { setDayMenuOpen(false); create("promotion"); }} className="border border-ink-gold/70 px-3 py-3 text-left text-sm text-ink-gold">PROMO</button><button type="button" onClick={() => { setDayMenuOpen(false); create("event"); }} className="border border-ink-white/20 px-3 py-3 text-left text-sm">EVENT</button><button type="button" disabled={clearing} onClick={clearStatus} className="px-3 py-3 text-left text-sm text-ink-grey hover:text-ink-white">{clearing ? "CZYSZCZENIE…" : "WYCZYŚĆ"}</button></div></AppModal>}
    {editor && <CalendarItemEditor item={editor} onClose={() => setEditor(null)} />}
    {settingsOpen && <AppModal title="Ustawienia kalendarza" onClose={() => setSettingsOpen(false)}><CalendarSettingsEditor bufferMinutes={bufferMinutes} visibleMonths={visibleMonths} defaultFreeStart={defaultFreeStart} defaultFreeEnd={defaultFreeEnd} /></AppModal>}
  </section>;
}
