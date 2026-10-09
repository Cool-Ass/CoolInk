type RegisteredClient = { projects: { _count: { appointments: number } }[] };

// Called only with top-level dates from the verified Supabase Auth user,
// never user_metadata or a form field.
export function verifiedRegistrationDate(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function summarizeRegisteredClients(clients: RegisteredClient[]) {
  return clients.reduce((result, client) => {
    const withoutProject = client.projects.length === 0;
    const withoutAppointment = client.projects.every((project) => project._count.appointments === 0);
    result.total++;
    if (withoutProject) result.withoutProject++;
    if (withoutAppointment) result.withoutAppointment++;
    return result;
  }, { total: 0, withoutProject: 0, withoutAppointment: 0 });
}
