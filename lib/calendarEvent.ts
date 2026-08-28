const TZ = "Europe/Warsaw";
const LOCATION = "CoolInk Tattoo Studio, Aleja Konstytucji 3 Maja 10, Zielona Góra";

function localStamp(date: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(date);
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "00";
  return `${value("year")}${value("month")}${value("day")}T${value("hour")}${value("minute")}${value("second")}`;
}
function utcStamp(date: Date) { return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, ""); }
function escapeIcs(value: string) { return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n"); }

export function appointmentIcs(input: { id: string; startsAt: Date; endsAt: Date }) {
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//CoolInk Tattoo Studio//PL", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", "BEGIN:VEVENT", `UID:appointment-${input.id}@coolinktattoo.pl`, `DTSTAMP:${utcStamp(new Date())}`, `DTSTART;TZID=${TZ}:${localStamp(input.startsAt)}`, `DTEND;TZID=${TZ}:${localStamp(input.endsAt)}`, `SUMMARY:${escapeIcs("Wizyta — CoolInk Tattoo Studio")}`, `LOCATION:${escapeIcs(LOCATION)}`, `DESCRIPTION:${escapeIcs("Wizyta w CoolInk Tattoo Studio. Szczegóły wizyty znajdziesz na swoim koncie klienta.")}`, "END:VEVENT", "END:VCALENDAR", ""].join("\r\n");
}

export function googleCalendarUrl(input: { startsAt: Date; endsAt: Date }) {
  const dates = `${localStamp(input.startsAt)}/${localStamp(input.endsAt)}`;
  const params = new URLSearchParams({ action: "TEMPLATE", text: "Wizyta — CoolInk Tattoo Studio", dates, ctz: TZ, location: LOCATION, details: "Wizyta w CoolInk Tattoo Studio. Szczegóły wizyty znajdziesz na swoim koncie klienta." });
  return `https://calendar.google.com/calendar/render?${params}`;
}
