"use client";

import { useRef, type KeyboardEvent, type MouseEvent, type ReactNode } from "react";
import { localDateKey, type CalendarDayVisualAppearance } from "@/lib/calendarHub";

const DAYS = ["PN", "WT", "ŚR", "CZ", "PT", "SB", "ND"];
const MONTHS = ["styczeń", "luty", "marzec", "kwiecień", "maj", "czerwiec", "lipiec", "sierpień", "wrzesień", "październik", "listopad", "grudzień"];

export type CalendarDayAppearance = CalendarDayVisualAppearance;
export type CalendarEntryTone = "available" | "unavailable" | "custom";

const TONE_CLASS: Record<CalendarDayAppearance["tone"], string> = {
  default: "bg-ink-white/[0.035]",
  available: "bg-ink-white/[0.035]",
  unavailable: "bg-ink-white/[0.035]",
  custom: "bg-ink-white/[0.035]",
};

const ENTRY_TONE_CLASS: Record<CalendarEntryTone, string> = {
  available: "border-l-2 border-emerald-400 bg-emerald-400/10 text-emerald-200",
  unavailable: "border-l-2 border-red-400/70 bg-red-400/10 text-red-100",
  custom: "text-ink-black",
};

export function calendarEntryClassName(tone: CalendarEntryTone) {
  return `calendar-entry block w-full min-w-0 truncate rounded px-1.5 py-1 text-left text-[10px] leading-tight sm:text-[11px] ${ENTRY_TONE_CLASS[tone]}`;
}

export default function CalendarMonthGrid({
  cursor,
  dates,
  selectedKeys,
  onPrevious,
  onNext,
  onToday,
  previousDisabled = false,
  nextDisabled = false,
  appearanceFor,
  renderDayContent,
  onDayClick,
  ariaLabelFor,
  wholeDayButton = false,
  compact = false,
}: {
  cursor: Date;
  dates: Date[];
  selectedKeys?: Set<string>;
  onPrevious: () => void;
  onNext: () => void;
  onToday?: () => void;
  previousDisabled?: boolean;
  nextDisabled?: boolean;
  appearanceFor: (date: Date) => CalendarDayAppearance;
  renderDayContent: (date: Date) => ReactNode;
  onDayClick: (date: Date, event: MouseEvent<HTMLButtonElement>) => void;
  ariaLabelFor?: (date: Date) => string;
  wholeDayButton?: boolean;
  compact?: boolean;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const monthLabel = `${MONTHS[cursor.getMonth()]} ${cursor.getFullYear()}`;
  const todayKey = localDateKey(new Date());
  const cellClass = (date: Date) => {
    const appearance = appearanceFor(date);
    return `calendar-day ${compact ? "min-h-20 p-1" : "min-h-20 p-1 sm:min-h-28 sm:p-1.5"} min-w-0 rounded-md text-left align-top transition-colors ${TONE_CLASS[appearance.tone]} ${selectedKeys?.has(localDateKey(date)) ? "ring-1 ring-inset ring-ink-gold bg-ink-gold/5" : "hover:bg-ink-white/[0.07]"} ${date.getMonth() !== cursor.getMonth() ? "text-ink-grey" : ""}`;
  };
  const dateLabel = (date: Date) => ariaLabelFor?.(date) ?? date.toLocaleDateString("pl-PL", { day: "numeric", month: "long", year: "numeric" });
  const handleDayKey = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const offset = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[event.key];
    const target = event.key === "Home" ? index - index % 7 : event.key === "End" ? Math.min(dates.length - 1, index - index % 7 + 6) : offset === undefined ? -1 : index + offset;
    if (target < 0 || target >= dates.length) return;
    event.preventDefault();
    scrollRef.current?.querySelector<HTMLButtonElement>(`[data-calendar-day="${target}"]`)?.focus();
  };

  return <div className="min-w-0">
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <h2 aria-live="polite" aria-atomic="true" className="min-w-0 font-sans text-base font-semibold capitalize sm:text-lg">{monthLabel}</h2>
      <div className="flex items-center gap-1">
        {onToday && <button type="button" onClick={onToday} className="calendar-nav rounded-md border border-ink-white/15 px-2 text-[11px] text-ink-grey hover:text-ink-white">Dziś</button>}
        <button type="button" disabled={previousDisabled} aria-label="Poprzedni miesiąc" onClick={onPrevious} className="calendar-nav rounded-md border border-ink-white/15 text-ink-grey hover:border-ink-gold hover:text-ink-gold disabled:opacity-40">←</button>
        <button type="button" disabled={nextDisabled} aria-label="Następny miesiąc" onClick={onNext} className="calendar-nav rounded-md border border-ink-white/15 text-ink-grey hover:border-ink-gold hover:text-ink-gold disabled:opacity-40">→</button>
      </div>
    </div>
    <div ref={scrollRef} className="min-w-0">
      <div className="grid grid-cols-7 gap-px sm:gap-1">
        {DAYS.map((day) => <div key={day} className="py-1.5 text-center text-[10px] font-medium text-ink-grey">{day}</div>)}
        {dates.map((date, index) => wholeDayButton ? (
          <button key={date.toISOString()} type="button" data-calendar-day={index} aria-label={dateLabel(date)} aria-pressed={selectedKeys?.has(localDateKey(date)) ?? false} aria-current={localDateKey(date) === todayKey ? "date" : undefined} onKeyDown={(event) => handleDayKey(event, index)} onClick={(event) => onDayClick(date, event)} className={cellClass(date)}>
            <b className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs ${localDateKey(date) === todayKey ? "bg-ink-gold text-ink-black" : ""}`}>{date.getDate()}</b>
            <span aria-hidden className="mt-1 block space-y-1">{renderDayContent(date)}</span>
          </button>
        ) : (
          <div key={date.toISOString()} className={cellClass(date)}>
            <button type="button" data-calendar-day={index} aria-label={dateLabel(date)} aria-current={localDateKey(date) === todayKey ? "date" : undefined} onKeyDown={(event) => handleDayKey(event, index)} onClick={(event) => onDayClick(date, event)} className="calendar-date w-full rounded text-left"><b className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs ${localDateKey(date) === todayKey ? "bg-ink-gold text-ink-black" : ""}`}>{date.getDate()}</b></button>
            <div className="mt-1 space-y-1">{renderDayContent(date)}</div>
          </div>
        ))}
      </div>
    </div>
  </div>;
}
