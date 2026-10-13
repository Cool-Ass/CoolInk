import Link from "next/link";
import { JOURNEY_STEPS, clientJourneyStage } from "@/lib/clientJourney";
import { formatCoolinkDateTime } from "@/lib/dateTime";
import StatusBadge from "@/components/ui/StatusBadge";
export default function VisitJourney({ visit, missingSignatures, settled = false }: { visit: { id: string; projectId: string; startsAt: Date; status: string; serviceType?: string | null; project: { title: string; kind?: string } }; missingSignatures: number; settled?: boolean }) {
  const consultation = visit.serviceType === "consultation" || visit.project.kind === "consultation";
  const stage = clientJourneyStage(visit.status, missingSignatures, settled);
  const detail = `/app/portal/projects?project=${visit.projectId}&appointment=${visit.id}`;
  const next = visit.status === "proposed" ? { label: "Odpowiedz na propozycję", href: detail } : stage === 2 ? { label: "Uzupełnij dokumenty", href: `/app/portal/documents?appointment=${visit.id}` } : stage >= 4 ? { label: "Pielęgnacja po sesji", href: `/app/portal/aftercare?appointment=${visit.id}` } : { label: "Szczegóły wizyty", href: detail };
  if (consultation) return <section className="studio-hero space-y-3" aria-label="Twoja konsultacja"><h2 className="text-xl font-semibold">{visit.project.title}</h2><p className="text-sm text-ink-grey">{formatCoolinkDateTime(visit.startsAt)}</p><StatusBadge status={visit.status} /><div><Link className="studio-primary-link" href={detail}>{visit.status === "proposed" ? "Odpowiedz na propozycję" : "Szczegóły konsultacji"}</Link></div></section>;
  return <section className="studio-hero space-y-4" aria-label="Twoja wizyta krok po kroku">
    <ol className="grid grid-cols-3 gap-2 text-xs sm:grid-cols-6" aria-label="Etapy wizyty">{JOURNEY_STEPS.map((label, index) => <li key={label} aria-current={index === stage ? "step" : undefined} className={`border-b-2 pb-2 ${index === stage ? "border-ink-gold text-ink-gold" : index < stage ? "border-emerald-500 text-emerald-300" : "border-ink-white/10 text-ink-grey"}`}>{index + 1}. {label}</li>)}</ol>
    <div className="flex flex-wrap items-center justify-between gap-4"><div><h2 className="text-xl font-semibold">{visit.project.title}</h2><p className="my-2 text-sm text-ink-grey">{formatCoolinkDateTime(visit.startsAt)}</p><StatusBadge status={visit.status} /></div><Link className="studio-primary-link" href={next.href}>{next.label}</Link></div>
    {stage === 2 && <p className="text-sm text-amber-200">{missingSignatures} {missingSignatures === 1 ? "dokument do podpisania przed sesją" : "dokumenty do podpisania przed sesją"}.</p>}
    {visit.status === "requested" && <p className="text-sm text-ink-grey">Teraz studio potwierdzi Twój termin.</p>}
    {stage === 4 && <p className="text-sm text-ink-grey">Sesja zakończona. Studio uzupełni rozliczenie — pielęgnację możesz rozpocząć już teraz.</p>}
  </section>;
}
