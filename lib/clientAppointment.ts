const CLIENT_CANCELLABLE_STATUSES = new Set(["requested", "proposed", "confirmed"]);

export function canClientCancelAppointment(
  appointment: { status: string; startsAt: Date },
  now = new Date()
) {
  return CLIENT_CANCELLABLE_STATUSES.has(appointment.status) && appointment.startsAt > now;
}

export function canClientRescheduleAppointment(
  appointment: { status: string; startsAt: Date },
  now = new Date(),
  minimumNoticeHours = 48,
) {
  return CLIENT_CANCELLABLE_STATUSES.has(appointment.status) && appointment.startsAt.getTime() - now.getTime() >= minimumNoticeHours * 60 * 60 * 1000;
}
