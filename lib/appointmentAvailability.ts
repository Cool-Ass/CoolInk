import { bookingConflict, validAppointmentRange } from "@/lib/bookingRules";
import { prisma } from "@/lib/prisma";

export type AppointmentAvailability = { ok: true } | { ok: false; error: string; status: 400 | 409 };

/** The single booking gate used by client booking and the admin proposal flow. */
export async function verifyExplicitAppointmentAvailability(startsAt: Date, endsAt: Date, excludeAppointmentId?: string): Promise<AppointmentAvailability> {
  if (!validAppointmentRange(startsAt, endsAt)) return { ok: false, status: 400, error: "Wybierz termin co 30 minut, o długości od 30 minut do 12 godzin." };
  const available = await prisma.availableSlot.findFirst({ where: { isPublic: true, startsAt: { lte: startsAt }, endsAt: { gte: endsAt } }, select: { id: true } });
  if (!available) return { ok: false, status: 409, error: "Ten zakres nie mieści się w jawnie ustawionym wolnym terminie." };
  const conflict = await bookingConflict(startsAt, endsAt, excludeAppointmentId);
  if (conflict.appointment || conflict.block) return { ok: false, status: 409, error: `Ten termin nie jest dostępny. Uwzględniam też ${conflict.bufferMinutes}-minutowy bufor między wizytami.` };
  return { ok: true };
}
