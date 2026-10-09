import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { privacyRevision } from "@/lib/privacyRevision";
import { privacyExecutionPlan } from "@/lib/privacyExecutionPlan";
import { privacyBackupGate } from "@/lib/privacyBackupGate";
import { deletePrivateProjectMedia } from "@/lib/privateMedia";
import { randomUUID } from "node:crypto";
import type { PrivacyReview } from "@/lib/privacyReview";

type Proof = Awaited<ReturnType<typeof privacyBackupGate>>;
type Job = { version: 1; clientId: string; authId: string | null; email: string; locations: string[]; review: PrivacyReview; proof: Proof; lease: string; leasedAt: string };
const jobKey = (id: string) => `internal.privacyExecution:${id}`;
const locked = async (tx: Prisma.TransactionClient, clientId: string, id: string) => {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${"privacy:" + clientId}, 0))`;
  await tx.$executeRaw`SELECT set_config('coolink.privacy_execution', ${id}, true)`;
};

/** Retained legal records stay in place; a CRM tombstone prevents silent FK cascades.
 * External effects are resumable and never rolled back by recreating an Auth user. */
export async function executePrivacyRequest(id: string, ownerId: string | null, expectedRevision: string, backupRunId: string) {
  const proof = await privacyBackupGate(backupRunId);
  const lease = randomUUID();
  const claimed = await prisma.$transaction(async tx => {
    const initial = await tx.accountDeletionRequest.findUnique({ where: { id } });
    if (!initial) throw new Error("Nie znaleziono wniosku.");
    await locked(tx, initial.clientId, id);
    const request = await tx.accountDeletionRequest.findUniqueOrThrow({ where: { id } });
    if (request.resolvedAt) return { completed: true as const };
    if (privacyRevision(request) !== expectedRevision) throw new Error("Wniosek zmienił się. Odśwież widok przed potwierdzeniem.");
    let job: Job;
    if (["executing", "execution_failed"].includes(request.status)) {
      const stored = await tx.siteSetting.findUnique({ where: { key: jobKey(id) } });
      job = JSON.parse(stored?.value || "null") as Job;
      if (!job || job.version !== 1 || job.clientId !== request.clientId) throw new Error("Wymagana kontrola dziennika wykonania.");
      if (request.status === "executing" && Date.now() - Date.parse(job.leasedAt) < 10 * 60_000) throw new Error("Wykonanie już trwa. Odczekaj przed ponowieniem.");
      job = { ...job, proof, lease, leasedAt: new Date().toISOString() };
    } else {
      if (!["awaiting_execution", "awaiting_retention_execution"].includes(request.status)) throw new Error("Najpierw zatwierdź ocenę wniosku.");
      const client = await tx.client.findUniqueOrThrow({ where: { id: request.clientId } });
      const projectWhere = { project: { clientId: client.id } };
      const [financial, consents, futureAppointments, googleLinks, images, directImages] = await Promise.all([
        tx.loyaltyEntry.count({ where: { clientId: client.id } }),
        tx.documentAcceptance.count({ where: { clientId: client.id } }),
        tx.appointment.count({ where: { ...projectWhere, endsAt: { gt: new Date() }, status: { notIn: ["cancelled", "no_show", "completed"] } } }),
        tx.googleCalendarEventSync.count({ where: { appointment: projectWhere } }),
        tx.projectImage.findMany({ where: projectWhere, select: { url: true } }),
        tx.directMessage.findMany({ where: { clientId: client.id, imageUrl: { not: null } }, select: { imageUrl: true } }),
      ]);
      const previous = await tx.siteSetting.findUnique({ where: { key: jobKey(id) } });
      const completed = JSON.parse(previous?.value || "null") as { completed?: boolean; retainedScopes?: string[]; retainUntil?: string } | null;
      const expired = completed?.completed === true && completed.retainUntil && Date.parse(completed.retainUntil + "T23:59:59Z") <= Date.now();
      // Releasing statutory data requires both expiry of the previous explicit
      // retention and a new owner review plus separate execution confirmation.
      const review = privacyExecutionPlan(request.note, {
        financial: expired && completed?.retainedScopes?.includes("financial") ? 0 : financial,
        consents: expired && completed?.retainedScopes?.includes("consents") ? 0 : consents,
        futureAppointments, googleLinks,
      });
      const pendingExports = await tx.$queryRaw<Array<{ count: bigint }>>`SELECT count(*) FROM "SiteSetting" s JOIN "Appointment" a ON s.key = 'google_retry:' || a.id JOIN "TattooProject" p ON p.id = a."projectId" WHERE p."clientId" = ${client.id}`;
      if (Number(pendingExports[0]?.count || 0) > 0) throw new Error("Najpierw rozwiąż oczekujące eksporty Google, aby nie pominąć kopii zewnętrznych.");
      const orphanMarkers = await tx.siteSetting.findMany({ where: { key: { startsWith: `internal.mediaCleanup:${client.id}:` } } });
      const orphanLocations = orphanMarkers.flatMap(marker => {
        const values: unknown = JSON.parse(marker.value);
        if (!Array.isArray(values) || values.some(value => typeof value !== "string")) throw new Error("Wymagana kontrola kolejki plików.");
        return values as string[];
      });
      const locations = [...(review.retainedScopes.includes("inspirations") ? [] : [...images.map(image => image.url), ...directImages.flatMap(image => image.imageUrl ? [image.imageUrl] : [])]), ...orphanLocations];
      if (locations.length > 100) throw new Error("Ponad 100 plików: wymagane osobne, kontrolowane wykonanie partiami.");
      if (client.supabaseUserId && (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL)) throw new Error("Brak serwerowej konfiguracji Auth.");
      // User-owned Storage cannot outlive a hard Auth deletion. Retain both or
      // delete retained media in a newly approved plan; never silently reassign.
      if (client.supabaseUserId && review.retainedScopes.includes("inspirations") && !review.retainedScopes.includes("auth") && [...images.map(image => image.url), ...directImages.flatMap(image => image.imageUrl ? [image.imageUrl] : [])].some(url => !url.startsWith("https://"))) throw new Error("Zachowane pliki Storage wymagają zachowania konta Auth do końca retencji.");
      job = { version: 1, clientId: client.id, authId: client.supabaseUserId, email: client.email, locations: [...new Set(locations)], review, proof, lease, leasedAt: new Date().toISOString() };
    }
    await tx.siteSetting.upsert({ where: { key: jobKey(id) }, create: { key: jobKey(id), value: JSON.stringify(job) }, update: { value: JSON.stringify(job) } });
    await tx.accountDeletionRequest.update({ where: { id }, data: { status: "executing" } });
    await tx.adminAuditLog.create({ data: { adminUserId: ownerId, action: "privacy.execution_started", targetType: "AccountDeletionRequest", targetId: id, summary: "Właściciel osobno potwierdził wykonanie. Zapisy profilu są zablokowane.", metadata: JSON.stringify({ retainedScopes: job.review.retainedScopes, proof }) } });
    return { completed: false as const, job };
  }, { isolationLevel: "Serializable", timeout: 15_000 });
  if (claimed.completed) return { completed: true };
  const { job } = claimed;
  const keep = new Set(job.review.retainedScopes);
  try {
    const media = await deletePrivateProjectMedia(job.locations);
    if (media.failures.length) throw new Error("Nie potwierdzono usunięcia wszystkich plików. Profil pozostaje zablokowany; ponów wykonanie.");
    if (job.authId) {
      const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!base || !key || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(job.authId)) throw new Error("Wymagana poprawna konfiguracja Auth.");
      const response = await fetch(`${base}/auth/v1/admin/users/${encodeURIComponent(job.authId)}`, {
        method: keep.has("auth") ? "PUT" : "DELETE",
        headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify(keep.has("auth") ? { ban_duration: "876000h" } : { should_soft_delete: false }),
        redirect: "error", cache: "no-store", signal: AbortSignal.timeout(15_000),
      });
      if (!response.ok && !(response.status === 404 && !keep.has("auth"))) throw new Error("Nie potwierdzono zamknięcia konta Auth. Profil pozostaje zablokowany.");
    }
    await prisma.$transaction(async tx => {
      await locked(tx, job.clientId, id);
      const stored = await tx.siteSetting.findUnique({ where: { key: jobKey(id) } });
      if ((JSON.parse(stored?.value || "null") as Job)?.lease !== lease) throw new Error("Zmieniony dziennik wykonania.");
      const projects = { project: { clientId: job.clientId } };
      if (!keep.has("chat")) {
        await tx.projectMessage.deleteMany({ where: projects });
        if (keep.has("inspirations")) {
          await tx.directMessage.deleteMany({ where: { clientId: job.clientId, imageUrl: null } });
          await tx.directMessage.updateMany({ where: { clientId: job.clientId }, data: { body: "", hiddenFor: [] } });
        } else await tx.directMessage.deleteMany({ where: { clientId: job.clientId } });
        await tx.contactMessage.deleteMany({ where: { email: job.email } });
      } else if (!keep.has("inspirations")) await tx.directMessage.updateMany({ where: { clientId: job.clientId }, data: { imageUrl: null } });
      if (!keep.has("inspirations")) await tx.projectImage.deleteMany({ where: projects });
      if (!keep.has("consents")) await tx.documentAcceptance.deleteMany({ where: { clientId: job.clientId } });
      if (!keep.has("financial")) await tx.loyaltyEntry.deleteMany({ where: { clientId: job.clientId } });
      await tx.waitlistEntry.deleteMany({ where: { clientId: job.clientId } });
      await tx.pushSubscription.deleteMany({ where: { clientId: job.clientId } });
      await tx.clientNotification.deleteMany({ where: { clientId: job.clientId } });
      await tx.projectActivity.deleteMany({ where: projects });
      if (!keep.has("appointments")) await tx.appointment.deleteMany({ where: projects });
      if (!keep.has("profile")) {
        await tx.client.update({ where: { id: job.clientId }, data: { firstName: "Usunięty", lastName: "profil", email: `erased-${job.clientId}@privacy.invalid`, phone: null, avatarUrl: null, leadSource: null, registeredAt: null, birthDate: null, notes: null, tags: "", bookingDraft: Prisma.DbNull, supabaseUserId: keep.has("auth") ? job.authId : null } });
        await tx.tattooProject.updateMany({ where: { clientId: job.clientId }, data: { title: "Zamknięty projekt", description: "", styles: "", placement: null, size: null, colorPreference: null, preferredDateNote: null, internalNotes: null, nextAction: null, nextActionDueAt: null, leadSource: null, status: "closed", clientArchivedAt: new Date() } });
      } else {
        await tx.client.update({ where: { id: job.clientId }, data: { bookingDraft: Prisma.DbNull, supabaseUserId: keep.has("auth") ? job.authId : null } });
        await tx.tattooProject.updateMany({ where: { clientId: job.clientId }, data: { nextAction: null, nextActionDueAt: null, clientArchivedAt: new Date() } });
      }
      const status = keep.size ? "completed_retained" : "completed";
      await tx.accountDeletionRequest.update({ where: { id }, data: { status, resolvedAt: new Date(), ...(!keep.has("profile") ? { note: JSON.stringify({ ...job.review, reason: "Wykonano osobno zatwierdzony zakres usunięcia danych.", response: "Zatwierdzony zakres został wykonany zgodnie z decyzją o retencji." }) } : {}) } });
      await tx.siteSetting.deleteMany({ where: { key: { startsWith: `internal.mediaCleanup:${job.clientId}:` } } });
      // Keep only non-personal completion evidence, never an erased address or URL.
      await tx.siteSetting.update({ where: { key: jobKey(id) }, data: { value: JSON.stringify({ version: 1, completed: true, proof, retainedScopes: [...keep], retainUntil: job.review.retainUntil }) } });
      await tx.adminAuditLog.create({ data: { adminUserId: ownerId, action: "privacy.execution_completed", targetType: "AccountDeletionRequest", targetId: id, summary: "Wykonano zatwierdzony zakres; dane z retencją pozostają chronione.", metadata: JSON.stringify({ retainedScopes: [...keep], retainUntil: job.review.retainUntil, proof, deletedMedia: media.deleted }) } });
    }, { isolationLevel: "Serializable", timeout: 15_000 });
    return { completed: true };
  } catch (error) {
    await prisma.$transaction(async tx => {
      await locked(tx, job.clientId, id);
      const stored = await tx.siteSetting.findUnique({ where: { key: jobKey(id) } });
      if ((JSON.parse(stored?.value || "null") as Job)?.lease !== lease) return;
      await tx.accountDeletionRequest.update({ where: { id }, data: { status: "execution_failed" } });
      await tx.adminAuditLog.create({ data: { adminUserId: ownerId, action: "privacy.execution_failed", targetType: "AccountDeletionRequest", targetId: id, summary: "Wykonanie niepotwierdzone. Profil zablokowany do ponowienia; brak fałszywego potwierdzenia usunięcia." } });
    }).catch(() => {});
    // Provider/database exceptions may contain tokens, URLs or personal data.
    void error;
    throw new Error("Wykonanie nie zostało w pełni potwierdzone. Profil pozostaje zablokowany; sprawdź dziennik i ponów wykonanie.");
  }
}
