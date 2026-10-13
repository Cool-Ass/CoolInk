import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentClient } from "@/lib/clientAuth";
import { getAftercareSettings } from "@/lib/aftercareAutomation";
import { aftercarePlans } from "@/lib/aftercare";
import { privateImageUrl } from "@/lib/privateMedia";
import { formatCoolinkDateTime } from "@/lib/dateTime";
import InspirationUpload from "@/components/client/InspirationUpload";
import AftercareConsultation from "@/components/client/AftercareConsultation";
export const dynamic = "force-dynamic";
export default async function AftercarePage({ searchParams }: { searchParams: Promise<{ appointment?: string }> }) {
  const client = await getCurrentClient(); if (!client) redirect("/app");
  const { appointment } = await searchParams;
  const [settings, visits] = await Promise.all([getAftercareSettings(), prisma.appointment.findMany({ where: { status: "completed", AND: [{ OR: [{ serviceType: null }, { serviceType: "tattoo" }] }], ...(appointment ? { id: appointment } : {}), project: { clientId: client.id, kind: "tattoo" } }, orderBy: { endsAt: "desc" }, take: 30, include: { project: { select: { title: true } }, aftercareImages: { where: { kind: "healing" }, orderBy: { createdAt: "desc" }, take: 20, select: { id: true, caption: true } } } })]);
  return <div className="studio-page"><header><p className="studio-eyebrow">PO SESJI</p><h1 className="studio-page-title">Aftercare</h1><p className="studio-page-description">Pielęgnacja, prywatne zdjęcia gojenia i kontakt ze studiem.</p></header><Link href="/app/portal/documents" className="studio-primary-link">Instrukcje pielęgnacji studia</Link>{!visits.length && <p className="studio-panel">Aftercare będzie dostępne po zakończeniu sesji.</p>}
    {visits.map(visit => <section id={`aftercare-${visit.id}`} key={visit.id} className="studio-panel space-y-4"><h2 className="text-xl font-semibold">{visit.project.title}</h2><p className="text-sm text-ink-grey">Sesja: {formatCoolinkDateTime(visit.startsAt)}</p>{settings.enabled && visit.aftercareStartedAt && <ol className="flex flex-wrap gap-3 text-xs">{aftercarePlans(settings).map(plan => <li className="rounded border border-ink-white/15 p-2" key={plan.type}>{plan.title}<time className="mt-1 block text-ink-grey">{formatCoolinkDateTime(new Date(visit.aftercareStartedAt!.getTime() + plan.day * 86400000))}</time></li>)}</ol>}<AftercareConsultation id={visit.id} requested={Boolean(visit.aftercareConsultationRequestedAt && !visit.aftercareConsultationResolvedAt)} /><Link href={`/app/portal/projects?project=${visit.projectId}`} className="text-sm text-ink-gold">Rozmowa projektu →</Link><InspirationUpload projectId={visit.projectId} aftercareAppointmentId={visit.id} /><div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{visit.aftercareImages.map(image => <a key={image.id} href={privateImageUrl(image.id, "client", client.id)} target="_blank" rel="noreferrer"><img src={privateImageUrl(image.id, "client", client.id)} alt={image.caption || "Prywatne zdjęcie gojenia"} className="aspect-square w-full rounded-lg object-cover" /></a>)}</div>{settings.reviewUrl && <a href={settings.reviewUrl} target="_blank" rel="noreferrer" className="studio-primary-link">Zostaw opinię Google</a>}</section>)}
  </div>;
}
