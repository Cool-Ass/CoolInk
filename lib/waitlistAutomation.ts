import { prisma } from "@/lib/prisma";
import { bookingConflict, lockBookingCalendar } from "@/lib/bookingRules";
import { formatCoolinkDateTime } from "@/lib/dateTime";
import { waitlistDateMatches } from "@/lib/waitlist";
import { sendPushToClient } from "@/lib/webPush";
import { syncAppointmentToGoogle } from "@/lib/googleCalendarSyncEngine";

/** Offers a newly released range to the oldest matching active waitlist entry. */
export async function offerReleasedRange(startsAt: Date, endsAt: Date, excludeWaitlistEntryId?: string) {
  if (!(startsAt < endsAt) || endsAt <= new Date()) return null;
  const candidates = await prisma.waitlistEntry.findMany({
    where: { status: "active", ...(excludeWaitlistEntryId ? { id: { not: excludeWaitlistEntryId } } : {}) },
    include: { project: { select: { id: true, title: true } } },
    orderBy: { createdAt: "asc" },
    take: 100,
  });
  const matching = candidates.filter((entry) => waitlistDateMatches(entry, startsAt, endsAt));
  for (const entry of matching) {
    const targetEndsAt = new Date(startsAt.getTime() + entry.durationMinutes * 60_000);
    if (targetEndsAt > endsAt) continue;
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1_000);
    const appointment = await prisma.$transaction(async (tx) => {
      await lockBookingCalendar(tx);
      const current = await tx.waitlistEntry.findFirst({ where: { id: entry.id, status: "active" }, select: { id: true } });
      if (!current) return null;
      const conflict = await bookingConflict(startsAt, targetEndsAt, undefined, true, tx, { serviceType: "tattoo" });
      if (conflict.appointment || conflict.block) return null;
      const created = await tx.appointment.create({ data: { projectId: entry.projectId, startsAt, endsAt: targetEndsAt, status: "proposed", serviceType: "tattoo", notes: "[LISTA REZERWOWA] Oferta automatyczna po zwolnieniu terminu." } });
      const claimed = await tx.waitlistEntry.updateMany({ where: { id: entry.id, status: "active" }, data: { status: "offered", offeredAppointmentId: created.id, offeredAt: new Date(), offerExpiresAt: expiresAt } });
      if (!claimed.count) throw new Error("WAITLIST_ALREADY_CLAIMED");
      await tx.tattooProject.update({ where: { id: entry.projectId }, data: { status: "date_proposed", nextAction: "Klient odpowiada na automatyczną ofertę terminu", nextActionDueAt: expiresAt } });
      await tx.projectActivity.create({ data: { projectId: entry.projectId, type: "waitlist_offer_sent", message: `Automatycznie zaproponowano zwolniony termin: ${formatCoolinkDateTime(startsAt)}.`, visibility: "client" } });
      await tx.clientNotification.create({ data: { clientId: entry.clientId, projectId: entry.projectId, appointmentId: created.id, type: "WAITLIST_OFFER", title: "Zwolnił się pasujący termin", body: `Termin ${formatCoolinkDateTime(startsAt)} czeka na Twoją odpowiedź przez 24 godziny.`, href: "/app/portal/projects" } });
      return created;
    }).catch((error: unknown) => {
      if (error instanceof Error && error.message === "WAITLIST_ALREADY_CLAIMED") return null;
      throw error;
    });
    if (!appointment) continue;
    await Promise.allSettled([
      sendPushToClient(entry.clientId, { title: "Zwolnił się termin w CoolInk", body: `${formatCoolinkDateTime(startsAt)} · odpowiedz w ciągu 24 godzin.`, url: "/app/portal/projects", tag: `waitlist-auto-${entry.id}` }),
      syncAppointmentToGoogle(appointment.id),
    ]);
    return { appointmentId: appointment.id, waitlistEntryId: entry.id };
  }
  return null;
}
