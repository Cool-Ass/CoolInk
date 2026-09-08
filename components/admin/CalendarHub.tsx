"use client";

import { useEffect, useMemo, useState, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import CalendarItemEditor, { type CalendarEditorItem } from "@/components/admin/calendar/CalendarItemEditor";
import CalendarSettingsEditor from "@/components/admin/calendar/CalendarSettingsEditor";
import AppModal from "@/components/ui/AppModal";
import { CONSULTATION_SLOT_TITLE, isConsultationSlot, isOperationalCalendarAppointment, localDateKey, mergeSelectedDates, resolveAvailableRanges, startOfLocalDay } from "@/lib/calendarHub";

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
    const isFreeTerm = kind === "freeTerm";
    const isConsultation = kind === "consultation";
    startsAt.setHours(isConsultation ? 9 : isFreeTerm ? defaultStartHour : 0, isConsultation ? 0 : isFreeTerm ? defaultStartMinute : 0, 0, 0);
    endsAt.setHours(isConsultation ? 9 : isFreeTerm ? defaultEndHour : 23, isConsultation ? 30 : isFreeTerm ? defaultEndMinute : 59, 0, 0);
    setEditor({ kind, startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString(), dates: itemDates, ...(kind === "dayOff" ? { reason: "Niedostępny" } : {}), ...(isFreeTerm ? { color: "#10B981", isPublic: true } : {}), ...(isConsultation ? { title: CONSULTATION_SLOT_TITLE, color: "#60A5FA", isPublic: true } : {}), ...(kind === "promotion" ? { title: "", badge: "PROMO", color: "#C99A4A", active: true, isPublic: true } : {}), ...(kind === "event" ? { title: "", color: "#6B7280", isPublic: false } : {}) });
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
    <div className="border border-ink-white/10 bg-ink-charcoal/30 p-2.5 sm:p-4"><div className="mb-3 flex items-center justify-between gap-3"><button type="button" aria-label="Poprzedni miesiąc" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))} className="flex h-9 w-9 items-center justify-center border border-ink-white/15 hover:border-ink-gold">←</button><h2 className="font-display text-xl sm:text-2xl">{MONTHS[cursor.getMonth()]} {cursor.getFullYear()}</h2><button type="button" aria-label="Następny miesiąc" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))} className="flex h-9 w-9 items-center justify-center border border-ink-white/15 hover:border-ink-gold">→</button></div>
      <div className="grid grid-cols-7 border-l border-t border-ink-white/10">
        {DAYS.map((day) => <div key={day} className="border-b border-r border-ink-white/10 py-2 text-center text-[10px] text-ink-grey">{day}</div>)}
        {dates.map((date) => {
          const dayBlocks = matching(blocks, date);
          const daySlots = matching(slots, date);
          const availableRanges = resolveAvailableRanges({
            date,
            recurring: [],
            overrides: [],
            slots: daySlots.map((item) => ({ startsAt: new Date(item.startsAt), endsAt: new Date(item.endsAt), isPublic: item.isPublic })),
            blocks: blocks.map((item) => ({ startsAt: new Date(item.startsAt), endsAt: new Date(item.endsAt) })),
            appointments: appointments.map((item) => ({ startsAt: new Date(item.startsAt), endsAt: new Date(item.endsAt), status: item.status })),
            bufferMinutes,
          }).map((range) => ({
            ...range,
            source: daySlots.find((item) => new Date(item.startsAt) <= range.startsAt && new Date(item.endsAt) >= range.endsAt),
          }));
          const consultationSlots = availableRanges.filter((item) => item.source && isConsultationSlot(item.source));
          const dayPromos = matching(promotions.filter((item) => item.active), date);
          const dayEvents = matching(events, date);
          const dayAppointments = activeAppointments(date);
          const explicit = dayBlocks.length
            ? { name: "NIEDOSTĘPNY", className: "bg-red-500/15", textClassName: "text-red-200" }
            : consultationSlots.length
              ? { name: CONSULTATION_SLOT_TITLE, className: "bg-blue-500/15", textClassName: "text-blue-200" }
              : availableRanges.length
                ? { name: "WOLNY", className: "bg-emerald-500/15", textClassName: "text-emerald-200" }
                : date.getDay() === 0
                  ? { name: "NIEDZIELA", className: "bg-red-500/10", textClassName: "text-red-200" }
                  : { name: "NIEOZNACZONY", className: "bg-ink-white/[0.035]", textClassName: "text-ink-grey" };
          const eventColor = !availableRanges.length && !dayBlocks.length ? (dayEvents[0]?.color ?? dayPromos[0]?.color) : undefined;
          return <div key={date.toISOString()} style={eventColor ? { backgroundColor: `${eventColor}26` } : undefined} className={`min-h-20 border-b border-r border-ink-white/10 p-1 sm:min-h-28 sm:p-1.5 ${explicit.className} ${selectedKeys.has(localDateKey(date)) ? "ring-1 ring-inset ring-ink-gold" : ""} ${date.getMonth() !== cursor.getMonth() ? "opacity-35" : ""}`}>
            <button type="button" onClick={(event) => selectDay(date, event)} className="w-full text-left"><b className="text-sm sm:text-base">{date.getDate()}</b><span className={`mt-1 block text-[7px] tracking-wide sm:text-[8px] ${explicit.textClassName}`}>{explicit.name}</span></button>
            <div className="mt-1 space-y-1">
              {availableRanges.slice(0, 2).map((item) => {
                const source = item.source;
                if (!source) return null;
                const consultation = isConsultationSlot(source);
                return <button key={`${source.id}-${item.startsAt.toISOString()}-${item.endsAt.toISOString()}`} type="button" onClick={() => setEditor({ ...source, kind: consultation ? "consultation" : "freeTerm" })} className="block w-full truncate px-1 text-left text-[8px] text-ink-black" style={{ backgroundColor: source.color }}>{consultation ? CONSULTATION_SLOT_TITLE : "WOLNY"} · {time(item.startsAt.toISOString())}–{time(item.endsAt.toISOString())}</button>;
              })}
              {dayBlocks.slice(0, 1).map((item) => <button key={item.id} type="button" onClick={() => setEditor({ ...item, kind: "dayOff" })} className="block w-full truncate bg-red-500/25 px-1 text-left text-[8px] text-red-100">◆ NIEDOSTĘPNY</button>)}
              {dayPromos.slice(0, 1).map((item) => <button key={item.id} type="button" onClick={() => setEditor({ ...item, kind: "promotion" })} className="block w-full truncate px-1 text-left text-[8px] text-ink-black" style={{ backgroundColor: item.color }}>{item.badge || "PROMO"}</button>)}
              {dayEvents.slice(0, 2).map((item) => <button key={item.id} type="button" onClick={() => item.google ? undefined : setEditor({ ...item, kind: "event" })} className="block w-full truncate px-1 text-left text-[8px] text-ink-black" style={{ backgroundColor: item.color }}>{item.google ? `${time(item.startsAt)} ${item.title} · Google` : item.label || "EVENT"}</button>)}
              {dayAppointments.slice(0, 1).map((item) => <button type="button" key={item.id} onClick={() => setEditor({ ...item, kind: "appointment" })} className="block w-full truncate bg-ink-black/30 px-1 text-left text-[8px] text-ink-white">{item.clientName} · {time(item.startsAt)}</button>)}
            </div>
          </div>;
        })}
      </div>
    </div>
    {dayMenuOpen && selectedDays.length > 0 && <AppModal title={selectedDays.length === 1 ? "Ustaw dzień" : `Ustaw dla ${selectedDays.length} dni`} size="sm" onClose={() => setDayMenuOpen(false)}><div className="grid gap-2"><button type="button" onClick={() => { setDayMenuOpen(false); create("freeTerm"); }} className="border border-emerald-400/70 px-3 py-3 text-left text-sm text-emerald-300">WOLNY TERMIN</button><button type="button" onClick={() => { setDayMenuOpen(false); create("consultation"); }} className="border border-blue-400/70 px-3 py-3 text-left text-sm text-blue-200">KONSULTACJA <span className="ml-2 text-xs text-ink-grey">09:00–09:30</span></button><button type="button" onClick={() => { setDayMenuOpen(false); create("dayOff"); }} className="border border-red-400/70 px-3 py-3 text-left text-sm text-red-200">NIEDOSTĘPNE</button><button type="button" onClick={() => { setDayMenuOpen(false); create("promotion"); }} className="border border-ink-gold/70 px-3 py-3 text-left text-sm text-ink-gold">PROMO</button><button type="button" onClick={() => { setDayMenuOpen(false); create("event"); }} className="border border-ink-white/20 px-3 py-3 text-left text-sm">EVENT</button><button type="button" disabled={clearing} onClick={clearStatus} className="px-3 py-3 text-left text-sm text-ink-grey hover:text-ink-white">{clearing ? "CZYSZCZENIE…" : "WYCZYŚĆ"}</button></div></AppModal>}
    {editor && <CalendarItemEditor item={editor} onClose={() => setEditor(null)} />}
    {settingsOpen && <AppModal title="Ustawienia kalendarza" onClose={() => setSettingsOpen(false)}><CalendarSettingsEditor bufferMinutes={bufferMinutes} visibleMonths={visibleMonths} defaultFreeStart={defaultFreeStart} defaultFreeEnd={defaultFreeEnd} /></AppModal>}
  </section>;
}
