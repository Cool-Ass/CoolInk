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
  const visits = await prisma.appointment.findMany({ where: { project: { clientId: current.id, kind: "tattoo" }, status: "confirmed", endsAt: { gte: new Date() }, OR: [{ serviceType: null }, { serviceType: "tattoo" }] }, orderBy: { startsAt: "asc" }, take: 100, select: { id: true, startsAt: true, project: { select: { title: true } } } });
  const selected = appointment ? visits.find(item => item.id === appointment) : visits[0];
  if (appointment && !selected) redirect("/app/portal/documents");
  const [documents, completed, archive] = await Promise.all([
    prisma.studioDocument.findMany({ where: { published: true }, orderBy: { title: "asc" }, include: { acceptances: { where: { clientId: current.id }, select: { version: true, answers: true, acceptedAt: true, sessionSignatures: { where: { appointmentId: selected?.id || "__none__" }, select: { id: true, acceptedAt: true } } } } } }),
    prisma.appointment.count({ where: { status: "completed", project: { clientId: current.id, kind: "tattoo" }, OR: [{ serviceType: null }, { serviceType: "tattoo" }] } }),
    prisma.sessionDocumentSignature.findMany({ where: { clientId: current.id }, orderBy: { acceptedAt: "desc" }, take: 100, select: { id: true, snapshot: true, acceptedAt: true } }),
  ]);
  const items = documents.map(document => { const acceptance = document.acceptances.find(item => item.version === document.version); const signature = acceptance?.sessionSignatures[0]; return { id: document.id, title: document.title, category: document.category, version: document.version, content: document.content, formFields: document.formFields, answers: JSON.parse(acceptance?.answers || "{}"), signatureId: signature?.id, acceptedAt: (document.category === "consent" ? signature?.acceptedAt : acceptance?.acceptedAt)?.toISOString(), accepted: document.category === "consent" ? Boolean(signature) : Boolean(acceptance) }; });
  const consents = items.filter(item => item.category === "consent");
  const groups = [{ id: "preparation", title: "Przed wizytą", visible: Boolean(selected) }, { id: "aftercare", title: "Pielęgnacja", visible: completed > 0 }, { id: "policy", title: "Regulaminy i prywatność", visible: true }, { id: "other", title: "Informacje studia", visible: true }];
  return <div className="studio-page"><header><h1 className="studio-page-title">Dokumenty</h1></header>
    {selected && consents.length > 0 && <section className="studio-hero space-y-4" aria-label="Dokumenty umówionej sesji">
      <div><p className="studio-eyebrow">PRZED TWOJĄ SESJĄ</p><h2 className="mt-2 text-xl font-semibold">{consents.some(item => !item.accepted) ? "Uzupełnij i podpisz dokumenty" : "Dokumenty sesji gotowe"}</h2><p className="mt-2 text-sm text-ink-grey">{selected.project.title} · {formatCoolinkDateTime(selected.startsAt)}</p></div>
      {visits.length > 1 && <nav aria-label="Wybierz sesję" className="flex flex-wrap gap-2">{visits.map(visit => <Link key={visit.id} aria-current={visit.id === selected.id ? "page" : undefined} className={visit.id === selected.id ? "studio-primary-link" : "studio-secondary-link"} href={`/app/portal/documents?appointment=${visit.id}`}>{formatCoolinkDateTime(visit.startsAt)}</Link>)}</nav>}
      <ClientDocuments title="Zgody do tej sesji" appointmentId={selected.id} sessionLabel={`${selected.project.title} · ${formatCoolinkDateTime(selected.startsAt)}`} documents={consents} />
    </section>}
    {groups.filter(group => group.visible && items.some(item => item.category === group.id)).map(group => <section className="studio-panel" id={group.id} key={group.id}><ClientDocuments title={group.title} documents={items.filter(item => item.category === group.id)} /></section>)}
    {completed > 0 && <Link className="studio-secondary-link" href="/app/portal/aftercare">Zdjęcia gojenia i kontakt po sesji</Link>}
    {archive.length > 0 && <details className="studio-panel"><summary className="cursor-pointer font-semibold">Archiwum podpisanych zgód · {archive.length}</summary>{archive.map(record => { const snapshot = JSON.parse(record.snapshot); return <div key={record.id} className="flex flex-wrap justify-between gap-4 border-b border-ink-white/10 py-3 text-sm"><span>{snapshot.title} · wersja {snapshot.version} · {formatCoolinkDateTime(record.acceptedAt)}</span><Link className="text-ink-gold" href={`/api/client/documents/signatures/${record.id}/pdf`}>Pobierz PDF</Link></div>; })}</details>}
  </div>;
}
