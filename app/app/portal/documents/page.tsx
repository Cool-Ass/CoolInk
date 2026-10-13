import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentClient } from "@/lib/clientAuth";
import ClientDocuments from "@/components/client/ClientDocuments";
import { formatCoolinkDateTime } from "@/lib/dateTime";
export const dynamic = "force-dynamic";
export default async function DocumentsPage({ searchParams }: { searchParams: Promise<{ appointment?: string }> }) {
  const current = await getCurrentClient(); if (!current) redirect("/app");
  const { appointment } = await searchParams;
  const [documents, visits, archive] = await Promise.all([
    prisma.studioDocument.findMany({ where: { published: true }, orderBy: { updatedAt: "desc" }, include: { acceptances: { where: { clientId: current.id }, select: { version: true, answers: true, sessionSignatures: { where: { appointmentId: appointment || "__none__" }, select: { id: true } } } } } }),
    prisma.appointment.findMany({ where: { project: { clientId: current.id }, status: { notIn: ["cancelled", "no_show"] } }, orderBy: { startsAt: "desc" }, take: 100, select: { id: true, startsAt: true, project: { select: { title: true } } } }),
    prisma.sessionDocumentSignature.findMany({ where: { clientId: current.id }, orderBy: { acceptedAt: "desc" }, take: 100, select: { id: true, snapshot: true, acceptedAt: true } }),
  ]);
  const visit = visits.find(item => item.id === appointment);
  // A QR can refer to an older session outside the recent selector.
  const selected = visit ?? (appointment ? await prisma.appointment.findFirst({ where: { id: appointment, project: { clientId: current.id }, status: { notIn: ["cancelled", "no_show"] } }, select: { id: true, startsAt: true, project: { select: { title: true } } } }) : null);
  if (appointment && !selected) redirect("/app/portal/documents");
  return <div className="space-y-5"><form className="studio-panel flex flex-wrap items-end gap-3"><label className="text-sm">Dokumenty dla sesji<select name="appointment" defaultValue={selected?.id || ""} className="studio-input mt-2"><option value="">Dokumenty ogólne</option>{selected && !visit && <option value={selected.id}>{selected.project.title} · {formatCoolinkDateTime(selected.startsAt)}</option>}{visits.map(item => <option key={item.id} value={item.id}>{item.project.title} · {formatCoolinkDateTime(item.startsAt)}</option>)}</select></label><button className="studio-primary-link">Pokaż</button></form>
  {selected && <p className="text-sm text-ink-gold">Podpisy dotyczą sesji: {selected.project.title} · {formatCoolinkDateTime(selected.startsAt)}</p>}
  <ClientDocuments appointmentId={selected?.id} documents={documents.map(document => { const acceptance = document.acceptances.find(item => item.version === document.version); const signature = acceptance?.sessionSignatures[0]; return { id: document.id, title: document.title, category: document.category, version: document.version, content: document.content, formFields: document.formFields, answers: JSON.parse(acceptance?.answers || "{}"), signatureId: signature?.id, accepted: selected && document.category === "consent" ? Boolean(signature) : Boolean(acceptance) }; })} />
  <section className="studio-panel"><h2 className="font-semibold">Archiwum podpisanych zgód</h2>{archive.length ? archive.map(record => { const snapshot = JSON.parse(record.snapshot); return <div key={record.id} className="flex justify-between gap-4 border-b border-ink-white/10 py-3 text-sm"><span>{snapshot.title} · wersja {snapshot.version} · {formatCoolinkDateTime(record.acceptedAt)}</span><Link className="text-ink-gold" href={`/api/client/documents/signatures/${record.id}/pdf`}>PDF</Link></div>; }) : <p className="mt-3 text-sm text-ink-grey">Brak podpisanych dokumentów sesji.</p>}</section></div>;
}
