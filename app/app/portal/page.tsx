import Link from "next/link";
import { redirect } from "next/navigation";
import ClientLogoutButton from "@/components/client/ClientLogoutButton";
import InspirationUpload from "@/components/client/InspirationUpload";
import ClientDocuments from "@/components/client/ClientDocuments";
import ClientBookingCalendar from "@/components/client/ClientBookingCalendar";
import AppointmentResponse from "@/components/client/AppointmentResponse";
import ClientNotifications from "@/components/client/ClientNotifications";
import AddToCalendar from "@/components/client/AddToCalendar";
import { CLIENT_STATUS } from "@/lib/projectWorkflow";
import { getCurrentClient } from "@/lib/clientAuth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ClientPortalPage() {
  const current = await getCurrentClient();
  if (!current) redirect("/app");

  const [client, documents, appointments, blocks, hours, promotions, notifications] = await Promise.all([
    prisma.client.findUniqueOrThrow({ where: { id: current.id }, include: { projects: { include: { appointments: { orderBy: { startsAt: "asc" } }, images: true }, orderBy: { updatedAt: "desc" } } } }),
    prisma.studioDocument.findMany({ where: { published: true }, orderBy: { updatedAt: "desc" }, include: { acceptances: { where: { clientId: current.id }, select: { id: true, version: true } } } }),
    prisma.appointment.findMany({ where: { status: { notIn: ["cancelled", "no_show"] }, endsAt: { gte: new Date() } }, select: { startsAt: true, endsAt: true } }),
    prisma.availabilityBlock.findMany({ where: { endsAt: { gte: new Date() } }, select: { startsAt: true, endsAt: true } }),
    prisma.workingHours.findMany({ orderBy: { weekday: "asc" }, select: { weekday: true, enabled: true, startsAt: true, endsAt: true } }),
    prisma.promotion.findMany({ where: { active: true, endsAt: { gte: new Date() } }, select: { id: true, title: true, description: true, badge: true, startsAt: true, endsAt: true } }),
    prisma.clientNotification.findMany({ where: { clientId: current.id }, orderBy: { createdAt: "desc" }, take: 10 }),
  ]);

  const clientDocuments = documents.map((document) => ({ ...document, accepted: document.acceptances.some((acceptance) => acceptance.version === document.version) }));
  const upcoming = client.projects.flatMap((project) => project.appointments).filter((appointment) => appointment.startsAt >= new Date()).sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())[0];

  return <main className="min-h-screen bg-ink-black px-5 py-6 text-ink-white md:px-10 md:py-10">
    <header className="mx-auto flex max-w-7xl items-center justify-between border-b border-ink-white/15 pb-5">
      <Link href="/" className="font-display text-2xl tracking-wide">COOLINK</Link>
      <ClientLogoutButton />
    </header>
    <section className="mx-auto grid max-w-7xl gap-8 py-8 lg:grid-cols-[235px_minmax(0,1fr)] lg:py-12">
      <aside className="h-fit border border-ink-white/15 bg-ink-charcoal/30 p-5 lg:sticky lg:top-6">
        <p className="text-[10px] tracking-[0.18em] text-ink-gold">TWOJE KONTO</p>
        <div className="mt-4 flex items-center gap-3">
          {client.avatarUrl ? <img src={client.avatarUrl} alt="Zdjęcie profilowe" className="h-11 w-11 rounded-full border border-ink-gold/50 object-cover" /> : <span className="flex h-11 w-11 items-center justify-center rounded-full border border-ink-gold/50 font-display text-lg text-ink-gold">{client.firstName.slice(0, 1)}{client.lastName.slice(0, 1)}</span>}
          <div><p className="font-display text-xl">{client.firstName}</p><p className="text-xs text-ink-grey">{client.email}</p></div>
        </div>
        <nav aria-label="Nawigacja konta" className="mt-6 border-y border-ink-white/10 py-3 text-xs tracking-[0.08em]">
          <a href="#terminy" className="flex items-center justify-between py-3 text-ink-gold"><span>WOLNE TERMINY</span><span>↓</span></a>
          <a href="#projekty" className="flex items-center justify-between py-3 text-ink-grey hover:text-ink-white"><span>MOJE ZGŁOSZENIA</span><span>{client.projects.length}</span></a>
          <a href="#dokumenty" className="flex items-center justify-between py-3 text-ink-grey hover:text-ink-white"><span>DOKUMENTY</span><span>{clientDocuments.filter((document) => !document.accepted).length}</span></a>
          <a href="#powiadomienia" className="flex items-center justify-between py-3 text-ink-grey hover:text-ink-white"><span>POWIADOMIENIA</span><span>{notifications.filter((notification) => !notification.readAt).length}</span></a>
        </nav>
        {upcoming ? <div className="mt-5 border-l-2 border-ink-gold pl-3"><p className="text-[10px] tracking-[0.12em] text-ink-gold">NAJBLIŻSZA WIZYTA</p><p className="mt-2 text-sm">{new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium", timeStyle: "short" }).format(upcoming.startsAt)}</p></div> : <div className="mt-5 border-l-2 border-emerald-500 pl-3"><p className="text-[10px] tracking-[0.12em] text-emerald-300">NAJPROSTSZY START</p><p className="mt-2 text-xs leading-relaxed text-ink-grey">Wybierz wolną godzinę w kalendarzu, potem krótko opisz pomysł.</p></div>}
        <Link href="/app/new-project" className="mt-6 block border border-ink-gold px-3 py-3 text-center text-[11px] tracking-[0.08em] text-ink-gold hover:bg-ink-gold hover:text-ink-black">NOWE ZGŁOSZENIE</Link>
      </aside>
      <div className="min-w-0">
        <p className="text-[11px] tracking-[0.2em] text-ink-gold">STREFA KLIENTA</p>
        <h1 className="mt-3 font-display text-4xl md:text-6xl">Cześć, {client.firstName}.</h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink-grey">Wybierz wolny termin, a następnie opisz swój pomysł na tatuaż. Termin pozostaje wstępny, dopóki nie potwierdzę go po sprawdzeniu zgłoszenia.</p>

        <section id="terminy" className="scroll-mt-6 mt-10">
          <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-[11px] tracking-[0.18em] text-ink-gold">KROK 1</p><h2 className="mt-2 font-display text-3xl">Wybierz termin.</h2></div><span className="border border-emerald-500/30 px-3 py-2 text-[10px] tracking-[0.08em] text-emerald-300">WOLNE GODZINY CO 30 MIN</span></div>
          <ClientBookingCalendar projects={client.projects.map((project) => ({ id: project.id, title: project.title }))} busy={appointments.map((item) => ({ startsAt: item.startsAt.toISOString(), endsAt: item.endsAt.toISOString() }))} blocks={blocks.map((item) => ({ startsAt: item.startsAt.toISOString(), endsAt: item.endsAt.toISOString() }))} hours={hours} promotions={promotions.map((item) => ({ ...item, startsAt: item.startsAt.toISOString(), endsAt: item.endsAt.toISOString() }))} />
        </section>
        <div id="powiadomienia" className="scroll-mt-6"><ClientNotifications initial={notifications.map((notification) => ({ ...notification, createdAt: notification.createdAt.toISOString(), readAt: notification.readAt?.toISOString() ?? null }))} /></div>

        <section id="projekty" className="scroll-mt-6 mt-14"><div><p className="text-[11px] tracking-[0.18em] text-ink-gold">TWOJE ZGŁOSZENIA</p><h2 className="mt-2 font-display text-3xl">Projekty i wizyty.</h2></div><div className="mt-5 grid gap-5 md:grid-cols-2">{client.projects.length === 0 ? <div className="border border-dashed border-ink-white/25 p-7"><h3 className="font-display text-2xl">Jeszcze tu pusto.</h3><p className="mt-3 text-sm leading-relaxed text-ink-grey">Zacznij od wolnego terminu powyżej albo wyślij zgłoszenie bez wskazanej daty.</p><Link href="/app/new-project" className="mt-5 inline-block text-xs tracking-[0.1em] text-ink-gold hover:text-ink-white">OPISZ POMYSŁ →</Link></div> : client.projects.map((project) => { const state = CLIENT_STATUS[project.status as keyof typeof CLIENT_STATUS] ?? { label: project.status, next: "Sprawdzę szczegóły projektu i wrócę z kolejnym krokiem." }; const nextAppointment = project.appointments.find((appointment) => appointment.status !== "cancelled" && appointment.endsAt >= new Date()); return <article key={project.id} className="border border-ink-white/15 bg-ink-charcoal/30 p-6"><p className="text-[11px] tracking-[0.13em] text-ink-gold">{state.label}</p><h3 className="mt-3 font-display text-2xl">{project.title}</h3><p className="mt-3 line-clamp-3 text-sm leading-relaxed text-ink-grey">{project.description}</p><div className="mt-5 border-y border-ink-white/10 py-4"><p className="text-[10px] tracking-[0.12em] text-ink-gold">CO TERAZ?</p><p className="mt-2 text-sm leading-relaxed text-ink-grey">{state.next}</p>{nextAppointment && <p className="mt-3 text-sm text-ink-white">Najbliższa sesja: {new Intl.DateTimeFormat("pl-PL", { dateStyle: "long", timeStyle: "short" }).format(nextAppointment.startsAt)} · {Math.round((nextAppointment.endsAt.getTime() - nextAppointment.startsAt.getTime()) / 60000)} min</p>}{nextAppointment && ["proposed", "requested"].includes(nextAppointment.status) && <AppointmentResponse appointmentId={nextAppointment.id} />}</div><div className="mt-5"><p className="text-[10px] tracking-[0.12em] text-ink-gold">WSZYSTKIE SESJE</p>{project.appointments.length ? <div className="mt-2 space-y-2">{project.appointments.map((appointment) => <div key={appointment.id} className="border border-ink-white/10 px-3 py-2 text-xs"><div className="flex justify-between gap-3"><span>{new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium", timeStyle: "short" }).format(appointment.startsAt)} · {Math.round((appointment.endsAt.getTime() - appointment.startsAt.getTime()) / 60000)} min</span><span className="text-ink-gold">{appointment.status === "confirmed" ? "potwierdzona" : appointment.status === "proposed" ? "do potwierdzenia" : appointment.status}</span></div>{appointment.status === "confirmed" && <AddToCalendar id={appointment.id} startsAt={appointment.startsAt.toISOString()} endsAt={appointment.endsAt.toISOString()} />}</div>)}</div> : <p className="mt-2 text-sm text-ink-grey">Termin ustalimy po analizie zgłoszenia.</p>}</div>{project.images.length > 0 && <div className="mt-5 grid grid-cols-3 gap-2">{project.images.map((image) => <a key={image.id} href={`/api/client/images/${image.id}`} target="_blank" rel="noreferrer" className="relative aspect-square overflow-hidden border border-ink-white/10"><img src={`/api/client/images/${image.id}`} alt={image.caption || "Inspiracja do projektu"} className="h-full w-full object-cover" /></a>)}</div>}<p className="mt-3 text-xs text-ink-grey">Inspiracje: {project.images.length}</p><InspirationUpload projectId={project.id} /></article>; })}</div></section>
        <div id="dokumenty" className="scroll-mt-6"><ClientDocuments documents={clientDocuments} /></div>
      </div>
    </section>
  </main>;
}
