type ProjectAppointment = { status: string };

/** Derives project state from the real session state after an admin cancellation/update. */
export function projectStatusAfterAppointmentChange(appointments: ProjectAppointment[], depositStatus: string, fallback: string) {
  const active = appointments.filter((item) => !["cancelled", "completed", "no_show"].includes(item.status));
  if (active.some((item) => item.status === "confirmed")) return depositStatus === "awaiting" ? "awaiting_deposit" : "confirmed";
  if (active.some((item) => item.status === "proposed")) return "date_proposed";
  if (active.some((item) => item.status === "requested")) return "awaiting_confirmation";
  if (appointments.length > 0 && appointments.every((item) => ["cancelled", "no_show"].includes(item.status))) return "cancelled";
  return fallback;
}
