"use client";

import MultilineText from "@/components/MultilineText";
import CalligraphyBackground from "@/components/CalligraphyBackground";
import PublicBookingCalendar from "@/components/client/PublicBookingCalendar";
import { defaultModuleData, type ContactModuleData } from "@/lib/modules";
import type { PublicCalendarData } from "@/lib/publicCalendar";

const ICON_PATHS = {
  address: "M12 2a7 7 0 0 1 7 7c0 5.25-7 13-7 13S5 14.25 5 9a7 7 0 0 1 7-7Zm0 4.5A2.5 2.5 0 1 0 12 11.5 2.5 2.5 0 0 0 12 6.5Z",
  phone: "M6.6 10.8c1.4 2.8 3.8 5.2 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.9 21 3 13.1 3 3.9c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.4 0 .8-.2 1L6.6 10.8Z",
  email: "M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm1.2 2 6.8 5.4L18.8 7H5.2ZM19 8.4l-6.4 5.1a1 1 0 0 1-1.2 0L5 8.4V17h14V8.4Z",
  hours: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 2a8 8 0 1 1 0 16 8 8 0 0 1 0-16Zm-1 3v5.6l4.2 2.5 1-1.6-3.4-2V7h-1.8Z",
};

const EMPTY_CALENDAR: PublicCalendarData = {
  busy: [], blocks: [], hours: [], overrides: [], availableSlots: [], promotions: [], events: [], bufferMinutes: 30, visibleMonths: 3,
};

export default function Contact({
  content = defaultModuleData("contact") as unknown as ContactModuleData,
  calendar = EMPTY_CALENDAR,
}: {
  content?: ContactModuleData;
  calendar?: PublicCalendarData;
}) {
  const details = [
    { label: content.addressLabel, value: content.address, path: ICON_PATHS.address },
    { label: content.phoneLabel, value: content.phone, path: ICON_PATHS.phone },
    { label: content.emailLabel, value: content.email, path: ICON_PATHS.email },
    { label: content.hoursLabel, value: content.hours, path: ICON_PATHS.hours },
  ];
  const { eyebrow: bookingEyebrow, heading: bookingHeading, body: bookingBody, ...calendarCopy } = content.booking;

  return <section id="contact" className="relative overflow-hidden bg-ink-black py-16 sm:py-20 md:py-28">
    <CalligraphyBackground opacity={0.05} position="50% 90%" />
    <div aria-hidden className="pointer-events-none absolute inset-y-0 left-1/3 w-1/2 opacity-60" style={{ background: "radial-gradient(ellipse 420px 300px at 40% 30%, rgba(201,154,74,0.13), transparent 65%)" }} />
    <div className="relative mx-auto max-w-[1536px] px-4 sm:px-6 md:px-10 lg:px-16">
      <div className="grid gap-10 xl:grid-cols-[.36fr_.64fr] xl:gap-12">
        <div className="reveal-up max-w-xl">
          <p className="mb-4 break-words text-xs font-medium tracking-[0.25em] text-ink-gold sm:text-[13px] sm:tracking-[0.35em]">{content.eyebrow}</p>
          <h2 className="headline-texture -ml-1 break-words text-[clamp(2.75rem,13vw,4.5rem)] leading-[0.88] tracking-tight sm:text-[7.5vw] md:text-[5vw] xl:text-[3.35vw]"><span className="block">{content.heading1}</span><span className="block">{content.heading2}</span></h2>
          <div className="gold-underline mt-5 h-3 w-40 sm:w-56 md:w-64" aria-hidden />
          <p className="mt-8 max-w-md text-[15px] leading-relaxed text-ink-grey"><MultilineText text={content.body} /></p>
          <dl className="mt-9 grid gap-5 sm:grid-cols-2 xl:grid-cols-1">
            {details.filter((detail) => detail.value).map((detail) => <div key={detail.label} className="flex min-w-0 items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-ink-gold/60 text-ink-gold"><svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor"><path d={detail.path} /></svg></span><div className="min-w-0"><dt className="text-[9px] tracking-[0.18em] text-ink-grey">{detail.label}</dt><dd className="break-words text-[13px] text-ink-white">{detail.value}</dd></div></div>)}
          </dl>
        </div>
        <div className="reveal-up min-w-0 border border-ink-white/15 bg-ink-charcoal/50 p-2 backdrop-blur-sm min-[400px]:p-3 sm:p-6">
          {bookingEyebrow && <p className="text-[10px] tracking-[.2em] text-ink-gold">{bookingEyebrow}</p>}
          {bookingHeading && <h3 className="mt-2 font-display text-3xl sm:text-4xl">{bookingHeading}</h3>}
          {bookingBody && <p className="mt-2 max-w-2xl whitespace-pre-line text-xs leading-relaxed text-ink-grey">{bookingBody}</p>}
          <PublicBookingCalendar {...calendar} copy={calendarCopy} compact />
        </div>
      </div>
    </div>
  </section>;
}
