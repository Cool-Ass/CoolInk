import { googleCalendarUrl } from "@/lib/calendarEvent";

export default function AddToCalendar({ id, startsAt, endsAt }: { id: string; startsAt: string; endsAt: string }) {
  const google = googleCalendarUrl({ startsAt: new Date(startsAt), endsAt: new Date(endsAt) });
  return <div className="mt-3 flex flex-wrap gap-2"><a href={`/api/client/appointments/${id}/calendar`} className="border border-ink-gold px-3 py-2 text-[10px] tracking-[0.08em] text-ink-gold hover:bg-ink-gold hover:text-ink-black">DODAJ DO KALENDARZA</a><a href={google} target="_blank" rel="noreferrer" className="border border-ink-white/20 px-3 py-2 text-[10px] tracking-[0.08em] text-ink-grey hover:text-ink-white">GOOGLE CALENDAR</a></div>;
}
