"use client";

import type { MouseEvent, ReactNode } from "react";
import { localDateKey, type CalendarDayVisualAppearance } from "@/lib/calendarHub";

const DAYS = ["PN", "WT", "ŚR", "CZ", "PT", "SB", "ND"];
const MONTHS = ["styczeń", "luty", "marzec", "kwiecień", "maj", "czerwiec", "lipiec", "sierpień", "wrzesień", "październik", "listopad", "grudzień"];

export type CalendarDayAppearance = CalendarDayVisualAppearance;
export type CalendarEntryTone = "available" | "unavailable" | "custom";

const TONE_CLASS: Record<CalendarDayAppearance["tone"], string> = {
  default: "bg-ink-white/[0.035]",
  available: "bg-emerald-500/15",
  unavailable: "bg-red-500/15",
  custom: "bg-ink-white/[0.035]",
};

const ENTRY_TONE_CLASS: Record<CalendarEntryTone, string> = {
  available: "bg-emerald-500 text-ink-black",
  unavailable: "bg-red-500/30 text-red-100",
  custom: "text-ink-black",
};

export function calendarEntryClassName(tone: CalendarEntryTone) {
  return `block w-full truncate px-1 py-0.5 text-left text-[8px] leading-tight ${ENTRY_TONE_CLASS[tone]}`;
}

export default function CalendarMonthGrid({
  cursor,
  dates,
  selectedKeys,
  onPrevious,
  onNext,
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
  previousDisabled?: boolean;
  nextDisabled?: boolean;
  appearanceFor: (date: Date) => CalendarDayAppearance;
  renderDayContent: (date: Date) => ReactNode;
  onDayClick: (date: Date, event: MouseEvent<HTMLButtonElement>) => void;
  ariaLabelFor?: (date: Date) => string;
  wholeDayButton?: boolean;
  compact?: boolean;
}) {
  const monthLabel = `${MONTHS[cursor.getMonth()]} ${cursor.getFullYear()}`;
  const cellClass = (date: Date) => {
    const appearance = appearanceFor(date);
    return `${compact ? "min-h-24 p-1" : "min-h-20 p-1 sm:min-h-28 sm:p-1.5"} min-w-0 overflow-hidden border-b border-r border-ink-white/10 text-left align-top transition-colors ${TONE_CLASS[appearance.tone]} ${selectedKeys?.has(localDateKey(date)) ? "ring-1 ring-inset ring-ink-gold" : "hover:brightness-125"} ${date.getMonth() !== cursor.getMonth() ? "opacity-35" : ""}`;
  };
  const cellStyle = (date: Date) => {
    const appearance = appearanceFor(date);
    return appearance.tone === "custom" && appearance.color ? { backgroundColor: `${appearance.color}26` } : undefined;
  };
  const dateLabel = (date: Date) => ariaLabelFor?.(date) ?? date.toLocaleDateString("pl-PL", { day: "numeric", month: "long", year: "numeric" });

  return <div className="min-w-0">
    <div className="mb-3 flex items-center justify-between gap-3">
      <button type="button" disabled={previousDisabled} aria-label="Poprzedni miesiąc" onClick={onPrevious} className="flex h-9 w-9 shrink-0 items-center justify-center border border-ink-white/15 text-ink-grey hover:border-ink-gold hover:text-ink-gold disabled:opacity-30">←</button>
      <h2 className="min-w-0 text-center font-display text-xl sm:text-2xl">{monthLabel}</h2>
      <button type="button" disabled={nextDisabled} aria-label="Następny miesiąc" onClick={onNext} className="flex h-9 w-9 shrink-0 items-center justify-center border border-ink-white/15 text-ink-grey hover:border-ink-gold hover:text-ink-gold disabled:opacity-30">→</button>
    </div>
    <div className="overflow-x-auto pb-1">
      <div className={`grid grid-cols-7 border-l border-t border-ink-white/10 ${compact ? "min-w-[600px]" : "min-w-[680px]"}`}>
        {DAYS.map((day) => <div key={day} className="border-b border-r border-ink-white/10 py-2 text-center text-[10px] text-ink-grey">{day}</div>)}
        {dates.map((date) => wholeDayButton ? (
          <button key={date.toISOString()} type="button" aria-label={dateLabel(date)} onClick={(event) => onDayClick(date, event)} style={cellStyle(date)} className={cellClass(date)}>
            <b className="text-sm sm:text-base">{date.getDate()}</b>
            <span aria-hidden className="mt-1 block space-y-1">{renderDayContent(date)}</span>
          </button>
        ) : (
          <div key={date.toISOString()} style={cellStyle(date)} className={cellClass(date)}>
            <button type="button" aria-label={dateLabel(date)} onClick={(event) => onDayClick(date, event)} className="w-full text-left"><b className="text-sm sm:text-base">{date.getDate()}</b></button>
            <div className="mt-1 space-y-1">{renderDayContent(date)}</div>
          </div>
        ))}
      </div>
    </div>
  </div>;
}
