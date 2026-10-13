import { prisma } from "@/lib/prisma";
import { hasAdminPermission } from "@/lib/adminPermissions";
import { verifyExplicitAppointmentAvailability } from "@/lib/appointmentAvailability";
import { formatCoolinkDateTime } from "@/lib/dateTime";

// Typed allowlist: no SQL, arbitrary URL, write operation or provider-driven tool name.
// The same dispatcher can later be exposed by an authenticated MCP adapter.
export { ASSISTANT_TOOLS } from "@/lib/assistantToolCatalog";
import { ASSISTANT_TOOLS } from "@/lib/assistantToolCatalog";
export type AssistantToolName = typeof ASSISTANT_TOOLS[number]["name"];
export class AssistantToolError extends Error { constructor(message: string, public status = 400) { super(message); } }
export function assistantInput(value: unknown, now = new Date()) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new AssistantToolError("Wybierz narzędzie.");
  const input = value as Record<string, unknown>;
  const tool = ASSISTANT_TOOLS.find(item => item.name === input.tool);
  if (!tool) throw new AssistantToolError("Nieznane narzędzie.");
  const days = input.days ?? 14, durationMinutes = input.durationMinutes ?? 120;
  if (typeof days !== "number" || !Number.isInteger(days) || days < 1 || days > 31 || typeof durationMinutes !== "number" || !Number.isInteger(durationMinutes) || durationMinutes < 30 || durationMinutes > 720 || durationMinutes % 30) throw new AssistantToolError("Wybierz od 1 do 31 dni oraz czas sesji co 30 minut.");
  const query = input.query ?? "", projectId = input.projectId ?? "";
  if (typeof query !== "string" || query.length > 120 || typeof projectId !== "string" || projectId.length > 100) throw new AssistantToolError("Zapytanie jest zbyt długie.");
  return { tool, days, durationMinutes, query: query.trim(), projectId, now, until: new Date(now.getTime() + days * 86400000) };
}
export async function assistantFreeDates(now: Date, until: Date, durationMinutes: number) {
  const slots = await prisma.availableSlot.findMany({ where: { isPublic: true, endsAt: { gt: now }, startsAt: { lt: until } }, orderBy: { startsAt: "asc" }, take: 32, select: { startsAt: true, endsAt: true, title: true } });
  const results: { startsAt: string; endsAt: string; label: string }[] = [], seen = new Set<number>();
  let probes = 0;
  for (const slot of slots) {
    if (slot.title?.toLocaleUpperCase("pl-PL") === "KONSULTACJA") continue;
    const first = Math.ceil(Math.max(slot.startsAt.getTime(), now.getTime() + 1) / 1800000) * 1800000;
    for (let time = first; time + durationMinutes * 60000 <= Math.min(slot.endsAt.getTime(), until.getTime()); time += 1800000) {
      if (probes >= 96 || results.length >= 20) break;
      if (seen.has(time)) continue; seen.add(time); probes++;
      const startsAt = new Date(time), endsAt = new Date(time + durationMinutes * 60000);
      if ((await verifyExplicitAppointmentAvailability(startsAt, endsAt, undefined, prisma, { serviceType: "tattoo", durationMinutes })).ok) { results.push({ startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString(), label: formatCoolinkDateTime(startsAt) }); break; }
    }
    if (probes >= 96 || results.length >= 20) break;
  }
  return { dates: results, partial: probes >= 96 || slots.length === 32 || results.length >= 20 };
}
export async function runAssistantTool(role: string, value: unknown) {
  const input = assistantInput(value);
  if (!hasAdminPermission(role, input.tool.permission)) throw new AssistantToolError("Twoja rola nie ma dostępu do tego narzędzia.", 403);
  const { now, until } = input;
  if (input.tool.name === "free_dates" || input.tool.name === "promotion_draft") {
    const free = await assistantFreeDates(now, until, input.durationMinutes);
    return { ...free, ...(input.tool.name === "promotion_draft" ? { draft: free.dates[0] ? `Wolny termin w CoolInk: ${free.dates[0].label}. Masz pomysł na tatuaż? Napisz do studia, aby omówić projekt. Oferta wymaga potwierdzenia dostępności.` : "Brak zweryfikowanego wolnego terminu do promowania." } : {}) };
  }
  if (input.tool.name === "projects") {
    if (input.query.length < 2) throw new AssistantToolError("Wpisz co najmniej 2 znaki.");
    return { projects: await prisma.tattooProject.findMany({ where: { client: { deletionRequest: { is: null } }, OR: [{ title: { contains: input.query, mode: "insensitive" } }, { client: { firstName: { contains: input.query, mode: "insensitive" } } }, { client: { lastName: { contains: input.query, mode: "insensitive" } } }] }, select: { id: true, clientId: true, title: true, status: true }, orderBy: { updatedAt: "desc" }, take: 30 }) };
  }
  if (input.tool.name === "message_draft") {
    const project = await prisma.tattooProject.findFirst({ where: { id: input.projectId, client: { deletionRequest: { is: null } } }, select: { id: true, title: true, appointments: { where: { startsAt: { gt: now }, status: "confirmed" }, orderBy: { startsAt: "asc" }, take: 1, select: { startsAt: true } } } });
    if (!project) throw new AssistantToolError("Nie znaleziono projektu.", 404);
    return { projectId: project.id, draft: `Cześć! Piszę w sprawie projektu „${project.title}”. ${project.appointments[0] ? `Przypominam o sesji ${formatCoolinkDateTime(project.appointments[0].startsAt)}. ` : ""}Daj znać, jeśli potrzebujesz omówić szczegóły. Do zobaczenia w CoolInk!` };
  }
  if (input.tool.name === "unsettled") return { visits: await prisma.appointment.findMany({ where: { startsAt: { lte: now }, status: { in: ["confirmed", "completed"] }, loyaltyEntry: { is: null }, project: { kind: "tattoo", client: { deletionRequest: { is: null } } } }, select: { id: true, startsAt: true, project: { select: { title: true } } }, orderBy: { startsAt: "asc" }, take: 50 }) };
  const [visits, slots] = await Promise.all([prisma.appointment.count({ where: { startsAt: { gte: now, lt: until }, status: { notIn: ["cancelled", "no_show"] } } }), prisma.availableSlot.count({ where: { isPublic: true, startsAt: { lt: until }, endsAt: { gt: now } } })]);
  return { visits, explicitSlots: slots, days: input.days, note: "Liczba wizyt i jawnie otwartych zakresów. Szczegółowe wykorzystanie godzin znajdziesz w statystykach." };
}
