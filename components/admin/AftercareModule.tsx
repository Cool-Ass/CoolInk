import Link from "next/link";

import { hasAdminPermission } from "@/lib/adminPermissions";
import { prisma } from "@/lib/prisma";
import { getAftercareSettings } from "@/lib/aftercareAutomation";
import { privateImageUrl } from "@/lib/privateMedia";
import { formatCoolinkDateTime } from "@/lib/dateTime";
import AftercareSettingsForm from "@/components/admin/AftercareSettingsForm";
import AftercareResolve from "@/components/admin/AftercareResolve";

export default async function AftercareModule({ admin }: { admin: { id: string; role: string } }) {

  const [settings, visits] = await Promise.all([getAftercareSettings(), prisma.appointment.findMany({ where: { status: "completed", AND: [{ OR: [{ serviceType: null }, { serviceType: "tattoo" }] }], project: { kind: "tattoo" }, OR: [{ aftercareConsultationRequestedAt: { not: null } }, { aftercareImages: { some: { kind: "healing" } } }] }, orderBy: { updatedAt: "desc" }, take: 50, include: { project: { select: { title: true, client: { select: { firstName: true, lastName: true } } } }, aftercareImages: { where: { kind: "healing" }, take: 12, orderBy: { createdAt: "desc" }, select: { id: true, caption: true } } } })]);
  return <div className="space-y-4"><header><h2 className="text-xl font-semibold">Opieka po sesji</h2></header>{hasAdminPermission(admin.role, "settings.manage") && <AftercareSettingsForm initial={settings} />}{!visits.length && <p className="studio-panel">Nie ma jeszcze zgłoszeń ani zdjęć gojenia.</p>}{visits.map(visit => <section key={visit.id} className="studio-panel space-y-3"><h2 className="font-semibold">{visit.project.client.firstName} {visit.project.client.lastName} · {visit.project.title}</h2><p className="text-sm text-ink-grey">{formatCoolinkDateTime(visit.startsAt)}{visit.aftercareConsultationResolvedAt ? " · konsultacja obsłużona" : visit.aftercareConsultationRequestedAt ? " · zgłoszona konsultacja" : ""}</p>{visit.aftercareConsultationRequestedAt && !visit.aftercareConsultationResolvedAt && <AftercareResolve id={visit.id} requestedAt={visit.aftercareConsultationRequestedAt.toISOString()} />}<Link href={`/admin/calendar?appointment=${visit.id}`} className="studio-primary-link">Otwórz sesję i rozmowę</Link><div className="grid grid-cols-3 gap-2 sm:grid-cols-6">{visit.aftercareImages.map(image => <a key={image.id} href={privateImageUrl(image.id, "admin", admin.id)} target="_blank" rel="noreferrer"><img src={privateImageUrl(image.id, "admin", admin.id)} alt={image.caption || "Zdjęcie gojenia"} className="aspect-square w-full rounded object-cover" /></a>)}</div></section>)}</div>;
}
