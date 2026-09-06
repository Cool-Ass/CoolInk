"use client";

import PublicBookingCalendar from "@/components/client/PublicBookingCalendar";
import { defaultModuleData, type BookingModuleData } from "@/lib/modules";
import type { PublicCalendarData } from "@/lib/publicCalendar";

const EMPTY_CALENDAR: PublicCalendarData = {
  busy: [],
  blocks: [],
  hours: [],
  overrides: [],
  availableSlots: [],
  promotions: [],
  events: [],
  bufferMinutes: 30,
  visibleMonths: 3,
};

export default function BookingSection({
  content = defaultModuleData("booking") as unknown as BookingModuleData,
  calendar = EMPTY_CALENDAR,
}: {
  content?: BookingModuleData;
  calendar?: PublicCalendarData;
}) {
  const { eyebrow, heading, body, ...copy } = content;

  return (
    <section id="kalendarz" className="bg-ink-black px-4 py-16 text-ink-white sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        {eyebrow && <p className="text-[11px] tracking-[.2em] text-ink-gold">{eyebrow}</p>}
        {heading && <h2 className="mt-3 font-display text-4xl sm:text-6xl">{heading}</h2>}
        {body && <p className="mt-4 max-w-2xl whitespace-pre-line text-sm leading-relaxed text-ink-grey">{body}</p>}
        <PublicBookingCalendar {...calendar} copy={copy} />
      </div>
    </section>
  );
}
