"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, LoaderCircle } from "lucide-react";
import CalendarItemEditor, { type CalendarEditorItem, type CalendarEditorKind } from "@/components/admin/calendar/CalendarItemEditor";
import CalendarMonthGrid, { calendarEntryClassName } from "@/components/calendar/CalendarMonthGrid";
import AppModal from "@/components/ui/AppModal";
import { CALENDAR_AVAILABLE_COLOR, CALENDAR_UNAVAILABLE_COLOR, CONSULTATION_SLOT_TITLE, calendarAvailabilityEntries, localDateKey, resolveAvailableRanges, resolveCalendarDayAppearance } from "@/lib/calendarHub";
import { formatCoolinkTime } from "@/lib/dateTime";

type Range = { startsAt: string; endsAt: string };
type AppointmentRange = Range & { id: string; label?: string; status?: string; notes?: string | null; price?: number | null; clientId?: string; clientName?: string; projectTitle?: string };
type BlockRange = Range & { id: string; reason?: string | null };
type SlotRange = Range & { id: string; title?: string | null; description?: string | null; color?: string | null; icon?: string | null; isPublic?: boolean };
type GoogleRange = Range & { title?: string; color?: string };
type Snapshot = { appointments: AppointmentRange[]; blocks: BlockRange[]; slots: SlotRange[]; googleBusy: GoogleRange[]; bufferMinutes: number };
const EMPTY: Snapshot = { appointments: [], blocks: [], slots: [], googleBusy: [], bufferMinutes: 0 };
const localValue = (date: Date) => `${localDateKey(date)}T${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
const dayStart = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const dayEnd = (date: Date) => { const end = dayStart(date); end.setDate(end.getDate() + 1); return end; };
const overlaps = (start: Date, end: Date, range: Range, bufferMinutes = 0) => start < new Date(new Date(range.endsAt).getTime() + bufferMinutes * 60_000) && end > new Date(new Date(range.startsAt).getTime() - bufferMinutes * 60_000);
const overlapsDay = (range: Range, date: Date) => new Date(range.startsAt) < dayEnd(date) && new Date(range.endsAt) > dayStart(date);
const formatRangeTime = (range: { startsAt: string | Date; endsAt: string | Date }, date: Date) => {
  const startsAt = new Date(range.startsAt);
  const endsAt = new Date(range.endsAt);
  if (startsAt <= dayStart(date) && endsAt >= dayEnd(date)) return "";
  return `${formatCoolinkTime(startsAt)}–${formatCoolinkTime(endsAt)}`;
};

export default function AdminProposalCalendarPicker({ value, onChange, durationMinutes = 60 }: { value: string; onChange: (value: string) => void; durationMinutes?: number }) {
  const today = dayStart(new Date());
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDay, setSelectedDay] = useState(value ? value.slice(0, 10) : "");
  const [data, setData] = useState<Snapshot>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dayMenuOpen, setDayMenuOpen] = useState(false);
  const [editor, setEditor] = useState<CalendarEditorItem | null>(null);

  const refreshData = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/calendar-snapshot", { cache: "no-store" });
      if (!response.ok) throw new Error("Nie udało się pobrać dostępności.");
      setData({ ...EMPTY, ...(await response.json()) });
      setError("");
    } catch (reason) {
      if (reason instanceof Error && reason.name !== "AbortError") setError(reason.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/admin/calendar-snapshot", { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Nie udało się pobrać dostępności.");
        return response.json();
      })
      .then((result) => { setData({ ...EMPTY, ...result }); setError(""); })
      .catch((reason) => {
        if (reason instanceof Error && reason.name !== "AbortError") setError(reason.message);
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  const normalizedSlots = useMemo(() => data.slots.map((item) => ({ ...item, startsAt: new Date(item.startsAt), endsAt: new Date(item.endsAt) })), [data.slots]);
  const normalizedBlocks = useMemo(() => [...data.blocks, ...data.googleBusy].map((item) => ({ startsAt: new Date(item.startsAt), endsAt: new Date(item.endsAt) })), [data.blocks, data.googleBusy]);
  const normalizedAppointments = useMemo(() => data.appointments.map((item) => ({ startsAt: new Date(item.startsAt), endsAt: new Date(item.endsAt), status: "confirmed" })), [data.appointments]);

  const freeStarts = (date: Date) => {
    const dayKey = localDateKey(date);
    const now = new Date();
    const result: Date[] = [];
    for (const slot of data.slots) {
      const slotStart = new Date(slot.startsAt);
      const slotEnd = new Date(slot.endsAt);
      if (localDateKey(slotStart) !== dayKey && localDateKey(new Date(slotEnd.getTime() - 1)) !== dayKey) continue;
      const selectedDayStart = dayStart(date);
      const selectedDayEnd = dayEnd(date);
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

  function dayFor(date: Date) {
    const ranges = resolveAvailableRanges({ date, recurring: [], overrides: [], slots: normalizedSlots, blocks: normalizedBlocks, appointments: normalizedAppointments, bufferMinutes: data.bufferMinutes });
    const availability = calendarAvailabilityEntries(ranges, normalizedSlots);
    const blocks = data.blocks.filter((item) => overlapsDay(item, date));
    const appointments = data.appointments.filter((item) => overlapsDay(item, date));
    const googleBusy = data.googleBusy.filter((item) => overlapsDay(item, date));
    const appearance = resolveCalendarDayAppearance({ hasAvailability: availability.length > 0, hasUnavailable: Boolean(blocks.length || appointments.length), customColor: googleBusy[0]?.color });
    const entries = [
      ...availability.map((item) => {
        const source = data.slots.find((slot) => new Date(slot.startsAt) <= item.startsAt && new Date(slot.endsAt) >= item.endsAt);
        return { key: `available-${item.startsAt.toISOString()}-${item.endsAt.toISOString()}`, startsAt: item.startsAt, endsAt: item.endsAt, label: item.consultation ? "KONSULTACJA" : "WOLNY", color: CALENDAR_AVAILABLE_COLOR, kind: "available" as const, editor: source ? { id: source.id, kind: item.consultation ? "consultation" as const : "freeTerm" as const, title: source.title, description: source.description, startsAt: source.startsAt, endsAt: source.endsAt, color: source.color ?? CALENDAR_AVAILABLE_COLOR, icon: source.icon, isPublic: source.isPublic } : undefined };
      }),
      ...blocks.map((item) => ({ key: `block-${item.startsAt}-${item.endsAt}`, startsAt: item.startsAt, endsAt: item.endsAt, label: item.reason?.trim() || "NIEDOSTĘPNY", color: CALENDAR_UNAVAILABLE_COLOR, kind: "unavailable" as const, editor: { id: item.id, kind: item.reason?.trim().toLocaleUpperCase("pl-PL").startsWith("ZAJĘTY") ? "occupied" as const : "dayOff" as const, startsAt: item.startsAt, endsAt: item.endsAt, reason: item.reason } })),
      ...appointments.map((item) => ({ key: `appointment-${item.startsAt}-${item.endsAt}`, startsAt: item.startsAt, endsAt: item.endsAt, label: item.label || "ZAJĘTY", color: CALENDAR_UNAVAILABLE_COLOR, kind: "unavailable" as const, editor: { id: item.id, kind: "appointment" as const, startsAt: item.startsAt, endsAt: item.endsAt, status: item.status, notes: item.notes, price: item.price, clientId: item.clientId, clientName: item.clientName, projectTitle: item.projectTitle } })),
      ...googleBusy.map((item) => ({ key: `google-${item.startsAt}-${item.endsAt}`, startsAt: item.startsAt, endsAt: item.endsAt, label: item.title || "GOOGLE", color: item.color || "#9CA3AF", kind: "custom" as const })),
    ].sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
    return { appearance, entries };
  }

  const selectedDate = selectedDay ? new Date(`${selectedDay}T12:00:00`) : null;
  const selectedStarts = selectedDate ? freeStarts(selectedDate) : [];
  const selectedKeys = selectedDay ? new Set([selectedDay]) : undefined;
  const firstVisibleMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastVisibleMonth = new Date(today.getFullYear(), today.getMonth() + 3, 1);

  function create(kind: Exclude<CalendarEditorKind, "appointment" | "workingHours">) {
    if (!selectedDate) return;
    const startsAt = dayStart(selectedDate);
    let endsAt = dayEnd(selectedDate);
    if (kind === "freeTerm") { startsAt.setHours(10, 0, 0, 0); endsAt = new Date(startsAt); endsAt.setHours(18, 0, 0, 0); }
    if (kind === "consultation") { startsAt.setHours(9, 0, 0, 0); endsAt = new Date(startsAt); endsAt.setHours(9, 30, 0, 0); }
    setEditor({ kind, startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString(), ...(kind === "dayOff" ? { reason: "Niedostępny" } : {}), ...(kind === "occupied" ? { reason: "ZAJĘTY" } : {}), ...(kind === "freeTerm" ? { color: CALENDAR_AVAILABLE_COLOR, isPublic: true } : {}), ...(kind === "consultation" ? { title: CONSULTATION_SLOT_TITLE, color: CALENDAR_AVAILABLE_COLOR, isPublic: true } : {}), ...(kind === "promotion" ? { title: "", badge: "PROMO", color: "#C99A4A", active: true, isPublic: true } : {}), ...(kind === "event" ? { title: "", color: "#6B7280", isPublic: false } : {}) });
  }

  return <><div>
    {loading ? <div className="flex min-h-52 items-center justify-center gap-2 border border-ink-white/10 text-xs text-ink-grey"><LoaderCircle className="h-4 w-4 animate-spin" />Sprawdzam wolne terminy…</div> : error ? <p className="border border-red-400/30 p-4 text-xs text-red-200">{error}</p> : <>
      <CalendarMonthGrid
        cursor={cursor}
        dates={days}
        selectedKeys={selectedKeys}
        onPrevious={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
        onNext={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
        previousDisabled={cursor <= firstVisibleMonth}
        nextDisabled={cursor >= lastVisibleMonth}
        appearanceFor={(date) => dayFor(date).appearance}
        onDayClick={(date) => {
          if (date < today) return;
          const available = freeStarts(date);
          setSelectedDay(localDateKey(date));
          onChange(available.length ? localValue(available[0]) : "");
        }}
        ariaLabelFor={(date) => {
          const entries = dayFor(date).entries.map((item) => `${formatRangeTime(item, date)} ${item.label}`.trim()).join(", ");
          return `${date.toLocaleDateString("pl-PL", { day: "numeric", month: "long", year: "numeric" })}${entries ? `: ${entries}` : ""}`;
        }}
        renderDayContent={(date) => dayFor(date).entries.map((item) => {
          const time = formatRangeTime(item, date);
          const content = <>{item.label}{time ? ` · ${time}` : ""}</>;
          const itemEditor = "editor" in item ? item.editor : undefined;
          return itemEditor ? <button key={item.key} type="button" title={`Edytuj: ${time} ${item.label}`.trim()} onClick={(event) => { event.stopPropagation(); setEditor(itemEditor); }} className={calendarEntryClassName(item.kind)}>{content}</button> : <span key={item.key} title={`${time} ${item.label}`.trim()} className={calendarEntryClassName(item.kind)} style={item.kind === "custom" ? { backgroundColor: item.color } : undefined}>{content}</span>;
        })}
      />
      {selectedDate && <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border border-ink-white/10 bg-ink-black/20 px-3 py-2"><p className="text-[10px] text-ink-grey">{selectedDate.toLocaleDateString("pl-PL", { weekday: "long", day: "numeric", month: "long" })}</p><button type="button" onClick={() => setDayMenuOpen(true)} className="border border-ink-gold/60 px-3 py-2 text-[10px] tracking-[.08em] text-ink-gold hover:bg-ink-gold hover:text-ink-black">+ USTAW / EDYTUJ DZIEŃ</button></div>}
      <div className="mt-3 border border-ink-white/10 bg-ink-black/25 p-3">
        <div className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-ink-gold" /><p className="text-[10px] tracking-[.1em] text-ink-grey">{selectedDate ? `WOLNE GODZINY · ${selectedDate.toLocaleDateString("pl-PL", { day: "numeric", month: "long" })}` : "WYBIERZ ZIELONY DZIEŃ"}</p></div>
        {selectedDate && <div className="mt-3 flex flex-wrap gap-2">{selectedStarts.length ? selectedStarts.map((start) => {
          const option = localValue(start);
          return <button key={option} type="button" onClick={() => onChange(option)} className={`border px-3 py-2 text-xs ${value === option ? "border-ink-gold bg-ink-gold text-ink-black" : "border-emerald-400/35 text-emerald-200 hover:border-emerald-300"}`}>{formatCoolinkTime(start)}</button>;
        }) : <p className="text-xs text-ink-grey">Brak zakresu mieszczącego wybrany czas wizyty.</p>}</div>}
      </div>
      <p className="mt-2 text-[10px] leading-relaxed text-ink-grey">Wolne godziny są liczone po odjęciu wizyt, blokad, wpisów Google Calendar i bufora {data.bufferMinutes} min.</p>
    </>}
  </div>
  {dayMenuOpen && selectedDate && <AppModal title="Ustaw dzień" subtitle={selectedDate.toLocaleDateString("pl-PL", { weekday: "long", day: "numeric", month: "long" })} size="sm" onClose={() => setDayMenuOpen(false)}><div className="grid gap-2"><button type="button" onClick={() => { setDayMenuOpen(false); create("freeTerm"); }} className="border border-emerald-400/70 px-3 py-3 text-left text-sm text-emerald-300">WOLNY TERMIN</button><button type="button" onClick={() => { setDayMenuOpen(false); create("consultation"); }} className="border border-emerald-400/70 px-3 py-3 text-left text-sm text-emerald-300">KONSULTACJA <span className="ml-2 text-xs text-ink-grey">09:00–09:30</span></button><button type="button" onClick={() => { setDayMenuOpen(false); create("occupied"); }} className="border border-red-400/70 px-3 py-3 text-left text-sm text-red-200">ZAJĘTY</button><button type="button" onClick={() => { setDayMenuOpen(false); create("dayOff"); }} className="border border-red-400/70 px-3 py-3 text-left text-sm text-red-200">NIEDOSTĘPNE</button><button type="button" onClick={() => { setDayMenuOpen(false); create("promotion"); }} className="border border-ink-gold/70 px-3 py-3 text-left text-sm text-ink-gold">PROMO</button><button type="button" onClick={() => { setDayMenuOpen(false); create("event"); }} className="border border-ink-white/20 px-3 py-3 text-left text-sm">EVENT</button></div></AppModal>}
  {editor && <CalendarItemEditor item={editor} onClose={() => { setEditor(null); void refreshData(); }} />}
  </>;
}
