"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import CalendarMonthGrid, { calendarEntryClassName } from "@/components/calendar/CalendarMonthGrid";
import { CALENDAR_AVAILABLE_COLOR, CALENDAR_UNAVAILABLE_COLOR, calendarAvailabilityEntries, isConsultationSlot, localDateKey, resolveAvailableRanges, resolveCalendarDayAppearance } from "@/lib/calendarHub";
import { formatCoolinkTime } from "@/lib/dateTime";
import BookingRequestForm from "@/components/client/BookingRequestForm";
import AppModal from "@/components/ui/AppModal";

type Project = { id: string; title: string };
type Busy = { startsAt: string; endsAt: string };
type Block = { startsAt: string; endsAt: string };
type Hours = { weekday: number; enabled: boolean; startsAt: string; endsAt: string };
type Override = { date: string; enabled: boolean; startsAt: string; endsAt: string };
type AvailableSlot = { startsAt: string; endsAt: string; title?: string | null; description?: string | null; color?: string; isPublic: boolean };
type Promotion = { id: string; title: string; description: string | null; badge: string | null; startsAt: string; endsAt: string; color: string };
type CalendarEvent = { id: string; title: string; label: string | null; description: string | null; startsAt: string; endsAt: string; color: string };

export interface BookingCalendarCopy {
  calendarLabel: string;
  legend: string;
  freeLabel: string;
  consultationLabel: string;
  unavailableLabel: string;
  unmarkedLabel: string;
  unavailableMessage: string;
  partiallyBookedMessage: string;
  addToProjectLabel: string;
  newVisitLabel: string;
  proposeButtonLabel: string;
  bookingButtonLabel: string;
  consultationButtonLabel: string;
  eventFallbackLabel: string;
  promotionFallbackLabel: string;
}

const DEFAULT_COPY: BookingCalendarCopy = {
  calendarLabel: "KALENDARZ DOSTĘPNOŚCI",
  legend: "Zielone oznaczenia to wolne terminy i konsultacje. Czerwone — terminy zajęte lub niedostępne.",
  freeLabel: "WOLNY",
  consultationLabel: "KONSULTACJA",
  unavailableLabel: "NIEDOSTĘPNY",
  unmarkedLabel: "",
  unavailableMessage: "Ten dzień nie został udostępniony jako wolny termin.",
  partiallyBookedMessage: "Ten wolny termin został już częściowo wykorzystany. Wybierz inny dzień albo napisz do studia.",
  addToProjectLabel: "DODAJ DO ISTNIEJĄCEGO PROJEKTU (OPCJONALNIE)",
  newVisitLabel: "Nowa wizyta",
  proposeButtonLabel: "ZAPROPONUJ WIZYTĘ",
  bookingButtonLabel: "UMÓW WIZYTĘ",
  consultationButtonLabel: "UMÓW KONSULTACJĘ",
  eventFallbackLabel: "EVENT",
  promotionFallbackLabel: "PROMO",
};

const LEGACY_LEGEND = "Szary oznacza brak udostępnionego terminu. Zielony — wolny termin. Niebieski — konsultację. Czerwony — niedostępny.";
const PREVIOUS_LEGEND = "Tło dnia pozostaje neutralne. Zielone wpisy oznaczają wolny termin, niebieskie — konsultację, pomarańczowe — zajęty termin, czerwone — niedostępność.";
const dayStart = (date: Date) => { const copy = new Date(date); copy.setHours(0, 0, 0, 0); return copy; };
const dayEnd = (date: Date) => { const end = dayStart(date); end.setDate(end.getDate() + 1); return end; };
const overlapsDay = (item: { startsAt: string; endsAt: string }, date: Date) => new Date(item.startsAt) < dayEnd(date) && new Date(item.endsAt) > dayStart(date);
const formatRangeTime = (item: { startsAt: string | Date; endsAt: string | Date }, date: Date) => {
  const startsAt = new Date(item.startsAt);
  const endsAt = new Date(item.endsAt);
  if (startsAt <= dayStart(date) && endsAt >= dayEnd(date)) return "";
  return `${formatCoolinkTime(startsAt)}–${formatCoolinkTime(endsAt)}`;
};

interface Props {
  projects?: Project[];
  busy: Busy[];
  blocks: Block[];
  hours: Hours[];
  overrides?: Override[];
  availableSlots?: AvailableSlot[];
  bufferMinutes?: number;
  visibleMonths?: number;
  promotions: Promotion[];
  events?: CalendarEvent[];
  initialStartsAt?: string;
  mode?: "client" | "public";
  tattooStyles?: string[];
  copy?: BookingCalendarCopy;
  compact?: boolean;
  rescheduleAppointmentId?: string;
  rescheduleServiceType?: "tattoo" | "consultation";
}

export default function ClientBookingCalendar({
  projects = [],
  busy,
  blocks,
  hours,
  overrides = [],
  availableSlots = [],
  bufferMinutes = 30,
  visibleMonths = 3,
  promotions,
  events = [],
  initialStartsAt,
  mode = "client",
  tattooStyles,
  copy = DEFAULT_COPY,
  compact = false,
  rescheduleAppointmentId,
  rescheduleServiceType,
}: Props) {
  const router = useRouter();
  const today = dayStart(new Date());
  const restored = initialStartsAt ? new Date(initialStartsAt) : null;
  const initialDate = restored && !Number.isNaN(restored.getTime()) ? dayStart(restored) : today;
  const [selected, setSelected] = useState(initialDate);
  const [cursor, setCursor] = useState(() => new Date(initialDate.getFullYear(), initialDate.getMonth(), 1));
  const [projectId, setProjectId] = useState("");
  const [bookingRange, setBookingRange] = useState<{ startsAt: string; endsAt: string; projectId?: string; serviceType: "tattoo" | "consultation"; rescheduleAppointmentId?: string } | null>(null);
  const [dayDetailsOpen, setDayDetailsOpen] = useState(false);
  const [restoredOpened, setRestoredOpened] = useState(false);
  const firstVisibleMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastVisibleMonth = new Date(today.getFullYear(), today.getMonth() + Math.min(12, Math.max(1, visibleMonths)) - 1, 1);
  const dates = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const start = new Date(first);
    start.setDate(first.getDate() - ((first.getDay() + 6) % 7));
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      return date;
    });
  }, [cursor]);
  const normalizedOverrides = useMemo(() => overrides.map((item) => ({ ...item, date: new Date(item.date) })), [overrides]);
  const normalizedSlots = useMemo(() => availableSlots.map((item) => ({ ...item, startsAt: new Date(item.startsAt), endsAt: new Date(item.endsAt) })), [availableSlots]);
  const normalizedBlocks = useMemo(() => blocks.map((item) => ({ startsAt: new Date(item.startsAt), endsAt: new Date(item.endsAt) })), [blocks]);
  const normalizedBusy = useMemo(() => busy.map((item) => ({ startsAt: new Date(item.startsAt), endsAt: new Date(item.endsAt), status: "confirmed" })), [busy]);
  const rangesByDay = useMemo(() => new Map(dates.map((date) => [localDateKey(date), resolveAvailableRanges({
    date,
    recurring: hours,
    overrides: normalizedOverrides,
    slots: normalizedSlots,
    blocks: normalizedBlocks,
    appointments: normalizedBusy,
    bufferMinutes,
    publicOnly: true,
  })])), [bufferMinutes, dates, hours, normalizedBlocks, normalizedBusy, normalizedOverrides, normalizedSlots]);
  const slotsFor = (date: Date) => availableSlots.filter((slot) => slot.isPublic && overlapsDay(slot, date));
  const slotForRange = (range: { startsAt: Date; endsAt: Date }) => availableSlots.find((slot) => slot.isPublic && new Date(slot.startsAt) <= range.startsAt && new Date(slot.endsAt) >= range.endsAt);
  const blocked = (date: Date) => blocks.some((block) => overlapsDay(block, date));
  const isAvailable = (date: Date) => !blocked(date) && slotsFor(date).length > 0;
  const rangesFor = (date: Date) => rangesByDay.get(localDateKey(date)) ?? resolveAvailableRanges({
    date,
    recurring: hours,
    overrides: normalizedOverrides,
    slots: normalizedSlots,
    blocks: normalizedBlocks,
    appointments: normalizedBusy,
    bufferMinutes,
    publicOnly: true,
  });
  const ranges = rangesFor(selected);

  useEffect(() => {
    if (!initialStartsAt || restoredOpened || mode !== "client") return;
    const timer = window.setTimeout(() => {
      const match = ranges.find((range) => range.startsAt.toISOString() === initialStartsAt);
      setRestoredOpened(true);
      if (match) {
        const sourceSlot = availableSlots.find((slot) => slot.isPublic && new Date(slot.startsAt) <= match.startsAt && new Date(slot.endsAt) >= match.endsAt);
        setBookingRange({ startsAt: match.startsAt.toISOString(), endsAt: match.endsAt.toISOString(), serviceType: isConsultationSlot(sourceSlot ?? {}) ? "consultation" : "tattoo" });
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [availableSlots, initialStartsAt, mode, ranges, restoredOpened]);

  const selectedPromotions = promotions.filter((item) => overlapsDay(item, selected));
  const selectedEvents = events.filter((item) => overlapsDay(item, selected));
  const hasTattooRange = calendarAvailabilityEntries(ranges, normalizedSlots).some((entry) => !entry.consultation);
  const previousDisabled = cursor <= firstVisibleMonth;
  const nextDisabled = cursor >= lastVisibleMonth;

  function propose(range: { startsAt: Date; endsAt: Date }) {
    const startsAt = range.startsAt;
    const endsAt = range.endsAt;
    const serviceType = isConsultationSlot(slotForRange(range) ?? {}) ? "consultation" : "tattoo";
    if (mode === "public") {
      router.push(`/app?returnTo=${encodeURIComponent(`/app/portal?booking=${encodeURIComponent(startsAt.toISOString())}&service=${serviceType}`)}`);
      return;
    }
    setDayDetailsOpen(false);
    setBookingRange({ startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString(), projectId: serviceType === "tattoo" ? projectId || undefined : undefined, serviceType, rescheduleAppointmentId });
  }

  function dayFor(date: Date) {
    const dayRanges = rangesFor(date);
    const dayAvailability = calendarAvailabilityEntries(dayRanges, normalizedSlots);
    const dayBlocks = blocks.filter((item) => overlapsDay(item, date));
    const dayBusy = busy.filter((item) => overlapsDay(item, date));
    const dayEvents = events.filter((item) => overlapsDay(item, date));
    const dayPromotions = promotions.filter((item) => overlapsDay(item, date));
    const implicitSunday = date.getDay() === 0 && dayBlocks.length === 0 && dayRanges.length === 0;
    const customColor = dayEvents[0]?.color ?? dayPromotions[0]?.color;
    const appearance = resolveCalendarDayAppearance({ hasAvailability: dayAvailability.length > 0, hasUnavailable: Boolean(dayBlocks.length || dayBusy.length || implicitSunday), customColor });
    const entries = [
      ...dayAvailability.map((entry) => ({ key: `slot-${entry.startsAt.toISOString()}-${entry.endsAt.toISOString()}`, startsAt: entry.startsAt, endsAt: entry.endsAt, label: entry.consultation ? copy.consultationLabel : copy.freeLabel, color: CALENDAR_AVAILABLE_COLOR, kind: "available" as const })),
      ...dayBlocks.map((item) => ({ key: `block-${item.startsAt}-${item.endsAt}`, startsAt: item.startsAt, endsAt: item.endsAt, label: copy.unavailableLabel, color: CALENDAR_UNAVAILABLE_COLOR, kind: "unavailable" as const })),
      ...dayBusy.map((item) => ({ key: `busy-${item.startsAt}-${item.endsAt}`, startsAt: item.startsAt, endsAt: item.endsAt, label: "ZAJĘTY", color: CALENDAR_UNAVAILABLE_COLOR, kind: "unavailable" as const })),
      ...dayPromotions.map((item) => ({ key: `promotion-${item.id}`, startsAt: item.startsAt, endsAt: item.endsAt, label: item.badge || item.title || copy.promotionFallbackLabel, color: item.color, kind: "custom" as const })),
      ...dayEvents.map((item) => ({ key: `event-${item.id}`, startsAt: item.startsAt, endsAt: item.endsAt, label: item.label || item.title || copy.eventFallbackLabel, color: item.color, kind: "custom" as const })),
      ...(implicitSunday ? [{ key: `sunday-${date.toISOString()}`, startsAt: dayStart(date), endsAt: dayEnd(date), label: copy.unavailableLabel, color: CALENDAR_UNAVAILABLE_COLOR, kind: "unavailable" as const }] : []),
    ].sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
    return { appearance, entries };
  }

  function selectClientDay(date: Date) {
    setSelected(dayStart(date));
    if (date.getMonth() !== cursor.getMonth()) setCursor(new Date(date.getFullYear(), date.getMonth(), 1));
    setDayDetailsOpen(mode === "client" && rangesFor(date).length > 0);
  }

  const selectedKeys = new Set([localDateKey(selected)]);
  const publicLegend = copy.legend === LEGACY_LEGEND || copy.legend === PREVIOUS_LEGEND ? DEFAULT_COPY.legend : copy.legend;

  const bookingDetails = <>
    {selectedEvents.map((calendarEvent) => <div key={calendarEvent.id} className="mb-3 border p-3" style={{ borderColor: calendarEvent.color, backgroundColor: `${calendarEvent.color}1a` }}><p className="text-[10px] tracking-[0.12em]">{calendarEvent.label || copy.eventFallbackLabel}</p><p className="mt-1 text-sm">{calendarEvent.title}</p>{calendarEvent.description && <p className="mt-1 text-xs text-ink-grey">{calendarEvent.description}</p>}</div>)}
    {selectedPromotions.map((promotion) => <div key={promotion.id} className="mb-3 border p-3" style={{ borderColor: promotion.color, backgroundColor: `${promotion.color}1a` }}><p className="text-[10px] tracking-[0.12em]">{promotion.badge || copy.promotionFallbackLabel}</p><p className="mt-1 text-sm">{promotion.title}</p>{promotion.description && <p className="mt-1 text-xs text-ink-grey">{promotion.description}</p>}</div>)}
    {projects.length > 0 && !rescheduleAppointmentId && isAvailable(selected) && ranges.length > 0 && hasTattooRange && (
      <label className="block text-xs tracking-[0.1em] text-ink-grey">
        {copy.addToProjectLabel}
        <select value={projectId} onChange={(event) => setProjectId(event.target.value)} className="mt-2 w-full border border-ink-white/15 bg-ink-black px-3 py-2.5 text-sm text-ink-white">
          <option value="">{copy.newVisitLabel}</option>
          {projects.map((project) => <option key={project.id} value={project.id}>{project.title}</option>)}
        </select>
      </label>
    )}
    <div className="mt-4 space-y-3">
      {!isAvailable(selected) ? (
        <p className="text-sm text-ink-grey">{copy.unavailableMessage}</p>
      ) : ranges.length === 0 ? (
        <p className="text-sm text-ink-grey">{copy.partiallyBookedMessage}</p>
      ) : ranges.map((range) => {
        const sourceSlot = slotForRange(range);
        const consultation = isConsultationSlot(sourceSlot ?? {});
        return <div key={range.startsAt.toISOString()} className="border border-emerald-400/40 bg-emerald-500/5 p-3">
          <p className="text-xs text-emerald-300">{consultation ? copy.consultationLabel : copy.freeLabel}</p>
          <p className="mt-1 font-display text-xl min-[400px]:text-2xl">{formatCoolinkTime(range.startsAt)}–{formatCoolinkTime(range.endsAt)}</p>
          {sourceSlot?.description && <p className="mt-2 text-xs text-ink-grey">{sourceSlot.description}</p>}
          <button type="button" disabled={Boolean(rescheduleServiceType && rescheduleServiceType !== (consultation ? "consultation" : "tattoo"))} onClick={() => propose(range)} className="mt-3 min-h-11 w-full border border-emerald-400/70 px-3 py-2.5 text-xs text-emerald-300 hover:bg-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-35 sm:w-auto">{rescheduleServiceType && rescheduleServiceType !== (consultation ? "consultation" : "tattoo") ? "INNY RODZAJ TERMINU" : rescheduleAppointmentId ? "WYBIERZ NOWY TERMIN" : consultation ? copy.consultationButtonLabel : projectId ? copy.proposeButtonLabel : copy.bookingButtonLabel}</button>
        </div>;
      })}
    </div>
  </>;

  return <>
    <div className={`mt-4 grid min-w-0 gap-3 ${mode === "public" && !compact ? "xl:grid-cols-[1.35fr_.65fr]" : "grid-cols-1"}`}>
      <section className="min-w-0 overflow-hidden border border-ink-white/10 bg-ink-charcoal/30 p-2.5 sm:p-4">
        {mode === "public" && <><p className="mb-2 text-[10px] tracking-[0.16em] text-ink-gold">{copy.calendarLabel}</p><p className="mb-3 text-[10px] leading-relaxed text-ink-grey">{publicLegend}</p></>}
        <CalendarMonthGrid
          cursor={cursor}
          dates={dates}
          selectedKeys={selectedKeys}
          onPrevious={() => setCursor((value) => new Date(value.getFullYear(), value.getMonth() - 1, 1))}
          onNext={() => setCursor((value) => new Date(value.getFullYear(), value.getMonth() + 1, 1))}
          previousDisabled={previousDisabled}
          nextDisabled={nextDisabled}
          appearanceFor={(date) => dayFor(date).appearance}
          onDayClick={(date) => selectClientDay(date)}
          ariaLabelFor={(date) => {
            const entries = dayFor(date).entries.map((item) => `${formatRangeTime(item, date)} ${item.label}`.trim()).join(", ");
            return `${date.toLocaleDateString("pl-PL", { day: "numeric", month: "long", year: "numeric" })}${entries ? `: ${entries}` : ""}`;
          }}
          renderDayContent={(date) => dayFor(date).entries.map((item) => {
            const itemTime = formatRangeTime(item, date);
            return <span key={item.key} title={`${itemTime} ${item.label}`.trim()} className={calendarEntryClassName(item.kind)} style={item.kind === "custom" ? { backgroundColor: item.color } : undefined}>{item.label}{itemTime ? ` · ${itemTime}` : ""}</span>;
          })}
          wholeDayButton
          compact={compact}
        />
      </section>
      {mode === "public" && <aside className="min-w-0 border border-ink-white/10 bg-ink-charcoal/30 p-3 sm:p-4"><p className="mb-4 text-[10px] tracking-[0.16em] text-ink-gold">{selected.toLocaleDateString("pl-PL", { weekday: "long", day: "numeric", month: "long" })}</p>{bookingDetails}</aside>}
    </div>

    {mode === "client" && dayDetailsOpen && ranges.length > 0 && <AppModal title={selected.toLocaleDateString("pl-PL", { weekday: "long", day: "numeric", month: "long" })} subtitle="Wybierz dostępny termin." size="sm" onClose={() => setDayDetailsOpen(false)}>{bookingDetails}</AppModal>}
    {bookingRange && <BookingRequestForm startsAt={bookingRange.startsAt} endsAt={bookingRange.endsAt} projectId={bookingRange.projectId} serviceType={bookingRange.serviceType} rescheduleAppointmentId={bookingRange.rescheduleAppointmentId} tattooStyles={tattooStyles} onClose={() => { setBookingRange(null); router.push("/app/portal/projects"); }} />}
  </>;
}
