export const ACTION_GROUPS = [
  { id: "requests", title: "Zgłoszenia", empty: "Brak nowych zgłoszeń." },
  { id: "preparation", title: "Przed wizytą", empty: "Brak spraw do przygotowania." },
  { id: "messages", title: "Wiadomości", empty: "Brak wiadomości do odpowiedzi." },
  { id: "settlements", title: "Do rozliczenia", empty: "Wszystkie wizyty rozliczone." },
  { id: "continuations", title: "Kontynuacje", empty: "Brak decyzji o kolejnych sesjach." },
  { id: "waiting", title: "Oczekujące", empty: "Brak oczekujących spraw." },
] as const;
export type ActionGroup = typeof ACTION_GROUPS[number]["id"];
export type StudioAction = { key: string; group: ActionGroup; priority: 1 | 2 | 3; title: string; detail: string; href: string; cta: string; visitAt?: Date | null; visitLabel?: string; dueAt?: Date | null; receivedAt?: Date | null };
type Visit = { id: string; startsAt: Date; createdAt?: Date; status: string; loyaltyEntry?: { id: string } | null };
export type WorkflowProject = { id: string; title: string; description: string; kind: string; status: string; createdAt: Date; updatedAt: Date; nextAction: string | null; nextActionDueAt: Date | null; client: { id: string; firstName: string; lastName: string }; appointments: Visit[] };
const active = new Set(["requested", "proposed", "confirmed"]);
export function visitContext(visits: Visit[], now: Date) {
  return visits.filter(v => active.has(v.status) && v.startsAt >= now).sort((a, b) => +a.startsAt - +b.startsAt)[0]?.startsAt ?? null;
}
export function projectActions(project: WorkflowProject, now: Date): StudioAction[] {
  if (["completed", "cancelled"].includes(project.status)) return [];
  const title = `${project.client.firstName} ${project.client.lastName} · ${project.title}`;
  const href = `/admin/clients/${project.client.id}?view=projects`;
  const base = { title, href, dueAt: project.nextActionDueAt };
  const requests = project.appointments.filter(v => v.status === "requested");
  if (requests.length) return requests.map(visit => ({ ...base, key: `request-${visit.id}`, group: "requests", priority: +visit.startsAt <= +now + 48 * 3600_000 ? 1 : 2, detail: project.kind === "consultation" ? "Prośba o konsultację" : "Prośba o wizytę", cta: "Sprawdź termin", href: `/admin/calendar?appointment=${encodeURIComponent(visit.id)}`, visitAt: visit.startsAt, visitLabel: "Proponowany termin", receivedAt: visit.createdAt ?? project.createdAt }));
  const visitAt = visitContext(project.appointments, now);
  const overdue = Boolean(project.nextActionDueAt && project.nextActionDueAt < now);
  if (project.status === "awaiting_next_session") {
    // Settlement and the decision about the next session are different stages.
    if (project.appointments.some(v => v.status === "completed" && !v.loyaltyEntry)) return [];
    const last = project.appointments.filter(v => v.status === "completed").sort((a, b) => +b.startsAt - +a.startsAt)[0];
    return [{ ...base, key: `project-${project.id}`, group: "continuations", priority: overdue ? 1 : 3, detail: project.nextAction || "Kolejna sesja czy zakończenie tatuażu?", cta: "Zdecyduj", visitAt: last?.startsAt, visitLabel: "Ostatnia sesja" }];
  }
  if (["inquiry", "reviewing"].includes(project.status)) return [{ ...base, key: `project-${project.id}`, group: "requests", priority: overdue ? 1 : 2, detail: project.description, cta: "Przejrzyj zgłoszenie", receivedAt: project.createdAt }];
  if (project.status === "awaiting_client" || project.status === "date_proposed" || project.appointments.some(v => v.status === "proposed")) return [{ ...base, key: `project-${project.id}`, group: "waiting", priority: overdue ? 1 : 3, detail: project.nextAction || "Oczekujesz na odpowiedź klienta.", cta: "Otwórz sprawę", visitAt, visitLabel: "Proponowany termin" }];
  // A confirmed project alone is not a task; do not keep generating preparation forever.
  if (!project.nextAction?.trim() && project.status !== "awaiting_deposit" && project.status !== "awaiting_confirmation") return [];
  return [{ ...base, key: `project-${project.id}`, group: "preparation", priority: overdue ? 1 : 2, detail: project.nextAction || (project.status === "awaiting_deposit" ? "Sprawdź zadatek." : "Ustal i potwierdź termin."), cta: "Otwórz sprawę", visitAt }];
}
export function sortStudioActions(items: StudioAction[]) {
  return [...items].sort((a, b) => {
    const date = (item: StudioAction) => item.group === "requests" || item.group === "preparation" ? item.visitAt ?? item.dueAt ?? item.receivedAt : item.group === "messages" ? item.receivedAt : item.dueAt ?? item.visitAt ?? item.receivedAt;
    return +(date(a) ?? Infinity) - +(date(b) ?? Infinity) || a.key.localeCompare(b.key);
  });
}
