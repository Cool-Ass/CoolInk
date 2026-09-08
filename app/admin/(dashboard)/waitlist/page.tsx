import { prisma } from "@/lib/prisma";
import { requireAdminPage } from "@/lib/adminPage";
import WaitlistManager from "@/components/admin/WaitlistManager";

export const dynamic = "force-dynamic";

export default async function WaitlistPage() {
  await requireAdminPage("operations.manage");
  const entries = await prisma.waitlistEntry.findMany({
    include: {
      client: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
      project: { select: { id: true, title: true } },
      offeredAppointment: { select: { startsAt: true, endsAt: true, status: true } },
    },
    orderBy: [{ status: "asc" }, { createdAt: "asc" }],
  });
  return <div className="studio-page"><header><p className="studio-eyebrow">OBSŁUGA TERMINÓW</p><h1 className="studio-page-title">Lista rezerwowa</h1><p className="studio-page-description">Wypełniaj zwolnione miejsca osobami, którym odpowiada konkretny dzień i pora. Oferta blokuje termin na 24 godziny i trafia do aplikacji klienta.</p></header><WaitlistManager entries={entries.map((entry) => ({ id: entry.id, status: entry.status, durationMinutes: entry.durationMinutes, preferredWeekdays: entry.preferredWeekdays, timePreference: entry.timePreference, earliestDate: entry.earliestDate?.toISOString().slice(0, 10) ?? null, latestDate: entry.latestDate?.toISOString().slice(0, 10) ?? null, notes: entry.notes, offeredAt: entry.offeredAt?.toISOString() ?? null, offerExpiresAt: entry.offerExpiresAt?.toISOString() ?? null, client: { id: entry.client.id, name: `${entry.client.firstName} ${entry.client.lastName}`, email: entry.client.email, phone: entry.client.phone }, project: entry.project, offeredAppointment: entry.offeredAppointment ? { startsAt: entry.offeredAppointment.startsAt.toISOString(), endsAt: entry.offeredAppointment.endsAt.toISOString(), status: entry.offeredAppointment.status } : null }))} /></div>;
}
