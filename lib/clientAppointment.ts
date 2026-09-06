const CLIENT_CANCELLABLE_STATUSES = new Set(["requested", "proposed", "confirmed"]);

export function canClientCancelAppointment(
  appointment: { status: string; startsAt: Date },
  now = new Date()
) {
  return CLIENT_CANCELLABLE_STATUSES.has(appointment.status) && appointment.startsAt > now;
}

