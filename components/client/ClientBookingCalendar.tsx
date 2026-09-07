"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { isConsultationSlot, resolveAvailableRanges } from "@/lib/calendarHub";
import BookingRequestForm from "@/components/client/BookingRequestForm";

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
  legend: "Szary oznacza brak udostępnionego terminu. Zielony — wolny termin. Niebieski — konsultację. Czerwony — niedostępny.",
  freeLabel: "WOLNY",
  consultationLabel: "KONSULTACJA",
  unavailableLabel: "NIEDOSTĘPNY",
  unmarkedLabel: "BRAK OZNACZENIA",
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

const DAYS = ["PN", "WT", "ŚR", "CZ", "PT", "SB", "ND"];
const MONTHS = ["styczeń", "luty", "marzec", "kwiecień", "maj", "czerwiec", "lipiec", "sierpień", "wrzesień", "październik", "listopad", "grudzień"];
const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const dayStart = (date: Date) => { const copy = new Date(date); copy.setHours(0, 0, 0, 0); return copy; };
const dayEnd = (date: Date) => { const end = dayStart(date); end.setDate(end.getDate() + 1); return end; };
const overlapsDay = (item: { startsAt: string; endsAt: string }, date: Date) => new Date(item.startsAt) < dayEnd(date) && new Date(item.endsAt) > dayStart(date);
const formatTime = (date: Date) => date.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" });

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
  const slotsFor = (date: Date) => availableSlots.filter((slot) => slot.isPublic && overlapsDay(slot, date));
  const slotForRange = (range: { startsAt: Date; endsAt: Date }) => availableSlots.find((slot) => slot.isPublic && new Date(slot.startsAt) <= range.startsAt && new Date(slot.endsAt) >= range.endsAt);
  const blocked = (date: Date) => blocks.some((block) => overlapsDay(block, date));
  const isAvailable = (date: Date) => !blocked(date) && slotsFor(date).length > 0;
  const ranges = resolveAvailableRanges({
    date: selected,
    recurring: hours,
    overrides: overrides.map((item) => ({ ...item, date: new Date(item.date) })),
    slots: availableSlots.map((item) => ({ ...item, startsAt: new Date(item.startsAt), endsAt: new Date(item.endsAt) })),
    blocks: blocks.map((item) => ({ startsAt: new Date(item.startsAt), endsAt: new Date(item.endsAt) })),
    appointments: busy.map((item) => ({ startsAt: new Date(item.startsAt), endsAt: new Date(item.endsAt), status: "confirmed" })),
    bufferMinutes,
    publicOnly: true,
  });

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

  const promotion = promotions.find((item) => selected >= dayStart(new Date(item.startsAt)) && selected <= dayStart(new Date(item.endsAt)));
  const calendarEvent = events.find((item) => selected >= dayStart(new Date(item.startsAt)) && selected <= dayStart(new Date(item.endsAt)));
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
    setBookingRange({ startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString(), projectId: serviceType === "tattoo" ? projectId || undefined : undefined, serviceType, rescheduleAppointmentId });
  }

  return (
    <>
      <div className={`mt-6 grid gap-5 ${compact ? "grid-cols-1" : "lg:grid-cols-[1.25fr_.75fr]"}`}>
        <section className="border border-ink-white/15 bg-ink-charcoal/30 p-4 sm:p-5">
          <p className="text-xs tracking-[0.16em] text-ink-gold">{copy.calendarLabel}</p>
          <div className="mt-2 flex items-center justify-between gap-3">
            <button type="button" disabled={previousDisabled} aria-label="Poprzedni miesiąc" onClick={() => setCursor((value) => new Date(value.getFullYear(), value.getMonth() - 1, 1))} className="border border-ink-white/20 px-3 py-2 text-ink-grey hover:border-ink-gold hover:text-ink-gold disabled:opacity-30">←</button>
            <h2 className="font-display text-xl sm:text-3xl">{MONTHS[cursor.getMonth()]} {cursor.getFullYear()}</h2>
            <button type="button" disabled={nextDisabled} aria-label="Następny miesiąc" onClick={() => setCursor((value) => new Date(value.getFullYear(), value.getMonth() + 1, 1))} className="border border-ink-white/20 px-3 py-2 text-ink-grey hover:border-ink-gold hover:text-ink-gold disabled:opacity-30">→</button>
          </div>
          <p className="mt-3 text-xs text-ink-grey">{copy.legend}</p>
          <div className="mt-5 grid grid-cols-7 border-l border-t border-ink-white/10">
            {DAYS.map((day) => <div key={day} className="border-b border-r border-ink-white/10 py-2 text-center text-xs text-ink-grey">{day}</div>)}
            {dates.map((date) => {
              const available = isAvailable(date);
              const unavailable = blocked(date) || (!available && date.getDay() === 0);
              const consultation = slotsFor(date).find(isConsultationSlot);
              const dayEvent = events.find((item) => overlapsDay(item, date));
              const dayPromotion = promotions.find((item) => overlapsDay(item, date));
              const contextualColor = consultation?.color ?? (!available && !blocked(date) ? (dayEvent?.color ?? dayPromotion?.color) : undefined);
              const selectedDay = sameDay(date, selected);
              const muted = date.getMonth() !== cursor.getMonth();
              return (
                <button key={date.toISOString()} type="button" onClick={() => { setSelected(dayStart(date)); if (muted) setCursor(new Date(date.getFullYear(), date.getMonth(), 1)); }} style={contextualColor ? { backgroundColor: `${contextualColor}26` } : undefined} className={`${compact ? "min-h-14 p-1.5" : "min-h-20 p-2"} border-b border-r text-left transition-colors ${selectedDay ? "ring-1 ring-inset ring-ink-gold" : "hover:border-ink-gold/60"} ${contextualColor ? "" : available ? "bg-emerald-500/15" : unavailable ? "bg-red-500/10" : "bg-ink-white/[0.035]"} ${muted ? "opacity-35" : ""}`}>
                  <strong className="block text-lg">{date.getDate()}</strong>
                  <span className={`mt-2 block text-[11px] ${consultation ? "text-blue-200" : available ? "text-emerald-300" : unavailable ? "text-red-200" : "text-ink-grey"}`}>
                    {consultation ? copy.consultationLabel : available ? copy.freeLabel : dayEvent?.label || dayPromotion?.badge || (unavailable ? copy.unavailableLabel : copy.unmarkedLabel)}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <aside className="border border-ink-white/15 bg-ink-charcoal/30 p-5">
          <p className="text-xs tracking-[0.16em] text-ink-gold">{selected.toLocaleDateString("pl-PL", { weekday: "long", day: "numeric", month: "long" })}</p>
          {calendarEvent && <div className="mt-4 border p-3" style={{ borderColor: calendarEvent.color, backgroundColor: `${calendarEvent.color}1a` }}><p className="text-[10px] tracking-[0.12em]">{calendarEvent.label || copy.eventFallbackLabel}</p><p className="mt-1 text-sm">{calendarEvent.title}</p>{calendarEvent.description && <p className="mt-1 text-xs text-ink-grey">{calendarEvent.description}</p>}</div>}
          {promotion && <div className="mt-4 border p-3" style={{ borderColor: promotion.color, backgroundColor: `${promotion.color}1a` }}><p className="text-[10px] tracking-[0.12em]">{promotion.badge || copy.promotionFallbackLabel}</p><p className="mt-1 text-sm">{promotion.title}</p>{promotion.description && <p className="mt-1 text-xs text-ink-grey">{promotion.description}</p>}</div>}
          {projects.length > 0 && !rescheduleAppointmentId && isAvailable(selected) && ranges.length > 0 && !slotsFor(selected).some(isConsultationSlot) && (
            <label className="mt-5 block text-xs tracking-[0.1em] text-ink-grey">
              {copy.addToProjectLabel}
              <select value={projectId} onChange={(event) => setProjectId(event.target.value)} className="mt-2 w-full border border-ink-white/15 bg-ink-black px-3 py-2.5 text-sm text-ink-white">
                <option value="">{copy.newVisitLabel}</option>
                {projects.map((project) => <option key={project.id} value={project.id}>{project.title}</option>)}
              </select>
            </label>
          )}
          <div className="mt-5 space-y-3">
            {!isAvailable(selected) ? (
              <p className="text-sm text-ink-grey">{copy.unavailableMessage}</p>
            ) : ranges.length === 0 ? (
              <p className="text-sm text-ink-grey">{copy.partiallyBookedMessage}</p>
            ) : ranges.map((range) => {
              const sourceSlot = slotForRange(range);
              const consultation = isConsultationSlot(sourceSlot ?? {});
              const color = sourceSlot?.color ?? (consultation ? "#60A5FA" : "#10B981");
              return <div key={range.startsAt.toISOString()} className="border p-3" style={{ borderColor: `${color}55`, backgroundColor: `${color}0d` }}>
                <p className="text-xs" style={{ color }}>{consultation ? copy.consultationLabel : copy.freeLabel}</p>
                <p className="mt-1 font-display text-2xl">{formatTime(range.startsAt)}–{formatTime(range.endsAt)}</p>
                {sourceSlot?.description && <p className="mt-2 text-xs text-ink-grey">{sourceSlot.description}</p>}
                <button type="button" disabled={Boolean(rescheduleServiceType && rescheduleServiceType !== (consultation ? "consultation" : "tattoo"))} onClick={() => propose(range)} className="mt-3 border px-3 py-2.5 text-xs hover:bg-ink-white/5 disabled:cursor-not-allowed disabled:opacity-35" style={{ borderColor: `${color}99`, color }}>{rescheduleServiceType && rescheduleServiceType !== (consultation ? "consultation" : "tattoo") ? "INNY RODZAJ TERMINU" : rescheduleAppointmentId ? "WYBIERZ NOWY TERMIN" : consultation ? copy.consultationButtonLabel : projectId ? copy.proposeButtonLabel : copy.bookingButtonLabel}</button>
              </div>;
            })}
          </div>
        </aside>
      </div>

      {bookingRange && <BookingRequestForm startsAt={bookingRange.startsAt} endsAt={bookingRange.endsAt} projectId={bookingRange.projectId} serviceType={bookingRange.serviceType} rescheduleAppointmentId={bookingRange.rescheduleAppointmentId} tattooStyles={tattooStyles} onClose={() => { setBookingRange(null); router.push("/app/portal/projects"); }} />}
    </>
  );
}
