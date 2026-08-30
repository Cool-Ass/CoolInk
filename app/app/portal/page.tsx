import Link from "next/link";
import { redirect } from "next/navigation";
import ClientLogoutButton from "@/components/client/ClientLogoutButton";
import ClientBookingCalendar from "@/components/client/ClientBookingCalendar";
import ClientNotifications from "@/components/client/ClientNotifications";
import ClientDocuments from "@/components/client/ClientDocuments";
import ClientProjectCards from "@/components/client/ClientProjectCards";
import ProfileSettings from "@/components/client/ProfileSettings";
import { CLIENT_STATUS } from "@/lib/projectWorkflow";
import { getCurrentClient } from "@/lib/clientAuth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ClientPortalPage() {
  const current = await getCurrentClient();
  if (!current) redirect("/app");
  const now = new Date();
  const [
    client,
    documents,
    busy,
    blocks,
    hours,
    overrides,
    slots,
    promotions,
    notifications,
    buffer,
  ] = await Promise.all([
    prisma.client.findUniqueOrThrow({
      where: { id: current.id },
      include: {
        projects: {
          include: {
            appointments: { orderBy: { startsAt: "asc" } },
            images: true,
            messages: {
              include: { attachment: { select: { id: true, caption: true } } },
              orderBy: { createdAt: "asc" },
              take: 200,
            },
          },
          orderBy: { updatedAt: "desc" },
        },
      },
    }),
    prisma.studioDocument.findMany({
      where: { published: true },
      orderBy: { updatedAt: "desc" },
      include: {
        acceptances: {
          where: { clientId: current.id },
          select: { version: true },
        },
      },
    }),
    prisma.appointment.findMany({
      where: {
        status: { notIn: ["cancelled", "no_show"] },
        endsAt: { gte: now },
      },
      select: { startsAt: true, endsAt: true },
    }),
    prisma.availabilityBlock.findMany({
      where: { endsAt: { gte: now } },
      select: { startsAt: true, endsAt: true },
    }),
    prisma.workingHours.findMany({
      orderBy: { weekday: "asc" },
      select: { weekday: true, enabled: true, startsAt: true, endsAt: true },
    }),
    prisma.workingHoursOverride.findMany({
      where: { date: { gte: now } },
      select: { date: true, enabled: true, startsAt: true, endsAt: true },
    }),
    prisma.availableSlot.findMany({
      where: { isPublic: true, endsAt: { gte: now } },
      select: { startsAt: true, endsAt: true, isPublic: true },
    }),
    prisma.promotion.findMany({
      where: { active: true, isPublic: true, endsAt: { gte: now } },
      select: {
        id: true,
        title: true,
        description: true,
        badge: true,
        startsAt: true,
        endsAt: true,
      },
    }),
    prisma.clientNotification.findMany({
      where: { clientId: current.id },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.siteSetting.findUnique({
      where: { key: "booking_buffer_minutes" },
      select: { value: true },
    }),
  ]);
  const docs = documents.map((document) => ({
    ...document,
    accepted: document.acceptances.some(
      (item) => item.version === document.version,
    ),
  }));
  const upcoming = client.projects
    .flatMap((project) =>
      project.appointments.map((appointment) => ({ appointment, project })),
    )
    .filter(
      ({ appointment }) =>
        appointment.status !== "cancelled" && appointment.startsAt >= now,
    )
    .sort(
      (a, b) =>
        a.appointment.startsAt.getTime() - b.appointment.startsAt.getTime(),
    )[0];
  const actionProject = client.projects.find((project) =>
    ["awaiting_client", "awaiting_confirmation", "awaiting_deposit"].includes(
      project.status,
    ),
  );
  const projects = client.projects.map((project) => ({
    id: project.id,
    title: project.title,
    description: project.description,
    status: project.status,
    next:
      CLIENT_STATUS[project.status as keyof typeof CLIENT_STATUS]?.next ??
      "Sprawdzę szczegóły projektu i wrócę z kolejnym krokiem.",
    appointments: project.appointments.map((appointment) => ({
      id: appointment.id,
      startsAt: appointment.startsAt.toISOString(),
      endsAt: appointment.endsAt.toISOString(),
      status: appointment.status,
      price: appointment.price,
    })),
    images: project.images.map((image) => ({
      id: image.id,
      url: `/api/client/images/${image.id}`,
      caption: image.caption,
    })),
    messages: project.messages.map((message) => ({
      id: message.id,
      author: message.author,
      body: message.body,
      createdAt: message.createdAt.toISOString(),
      readAt: message.readAt?.toISOString() ?? null,
      attachment: message.attachment
        ? {
            id: message.attachment.id,
            caption: message.attachment.caption,
            url: `/api/client/images/${message.attachment.id}`,
          }
        : null,
    })),
  }));
  return (
    <main className="min-h-screen bg-ink-black px-4 py-5 text-ink-white sm:px-6 lg:px-10 lg:py-10">
      <header className="mx-auto flex max-w-7xl items-center justify-between border-b border-ink-white/15 pb-4">
        <Link href="/" className="font-display text-2xl">
          COOLINK
        </Link>
        <ClientLogoutButton />
      </header>
      <div className="mx-auto grid max-w-7xl gap-7 py-7 lg:grid-cols-[230px_minmax(0,1fr)]">
        <aside className="h-fit border border-ink-white/15 bg-ink-charcoal/30 p-4 lg:sticky lg:top-6">
          <p className="text-[10px] tracking-[.16em] text-ink-gold">
            TWOJE KONTO
          </p>
          <p className="mt-2 font-display text-2xl">{client.firstName}</p>
          <nav className="mt-4 grid grid-cols-2 gap-2 border-y border-ink-white/10 py-3 text-xs lg:block">
            {[
              ["#start", "START"],
              ["#projekty", "PROJEKTY"],
              ["#wiadomosci", "WIADOMOŚCI"],
              ["#terminy", "WIZYTY"],
              ["#dokumenty", "DOKUMENTY"],
              ["#powiadomienia", "POWIADOMIENIA"],
              ["#profil", "PROFIL"],
            ].map(([href, label]) => (
              <a
                key={href}
                href={href}
                className="block px-2 py-2 text-ink-grey hover:text-ink-gold"
              >
                {label}
              </a>
            ))}
          </nav>
          <Link
            href="/app/new-project"
            className="mt-4 block border border-ink-gold px-3 py-3 text-center text-xs text-ink-gold hover:bg-ink-gold hover:text-ink-black"
          >
            NOWE ZGŁOSZENIE
          </Link>
        </aside>
        <div id="start" className="min-w-0">
          <p className="text-[11px] tracking-[.2em] text-ink-gold">
            STREFA KLIENTA
          </p>
          <h1 className="mt-2 font-display text-4xl sm:text-6xl">
            Cześć, {client.firstName}.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-grey">
            Twoje projekty, terminy i ważne informacje — w jednym miejscu.
          </p>
          {upcoming && (
            <section className="mt-7 border border-ink-gold/60 bg-ink-gold/5 p-5">
              <p className="text-[10px] tracking-[.14em] text-ink-gold">
                NAJBLIŻSZA WIZYTA
              </p>
              <p className="mt-2 font-display text-3xl">
                {new Intl.DateTimeFormat("pl-PL", {
                  dateStyle: "long",
                  timeStyle: "short",
                }).format(upcoming.appointment.startsAt)}
              </p>
              <p className="mt-2 text-sm text-ink-grey">
                {upcoming.project.title} ·{" "}
                {Math.round(
                  (upcoming.appointment.endsAt.getTime() -
                    upcoming.appointment.startsAt.getTime()) /
                    60000,
                )}{" "}
                min
              </p>
            </section>
          )}
          {actionProject && (
            <section className="mt-4 border-l-2 border-amber-400 bg-amber-400/5 p-4">
              <p className="text-[10px] tracking-[.14em] text-amber-200">
                WYMAGA TWOJEJ UWAGI
              </p>
              <p className="mt-2 text-sm">{actionProject.title}</p>
              <p className="mt-1 text-sm text-ink-grey">
                {
                  CLIENT_STATUS[
                    actionProject.status as keyof typeof CLIENT_STATUS
                  ]?.next
                }
              </p>
            </section>
          )}
          <ClientProjectCards projects={projects} />
          <section id="terminy" className="mt-14 scroll-mt-6">
            <p className="text-[11px] tracking-[.18em] text-ink-gold">WIZYTY</p>
            <h2 className="mt-2 font-display text-3xl">Wybierz termin.</h2>
            <ClientBookingCalendar
              projects={client.projects.map((project) => ({
                id: project.id,
                title: project.title,
              }))}
              busy={busy.map((item) => ({
                startsAt: item.startsAt.toISOString(),
                endsAt: item.endsAt.toISOString(),
              }))}
              blocks={blocks.map((item) => ({
                startsAt: item.startsAt.toISOString(),
                endsAt: item.endsAt.toISOString(),
              }))}
              hours={hours}
              overrides={overrides.map((item) => ({
                ...item,
                date: item.date.toISOString(),
              }))}
              availableSlots={slots.map((item) => ({
                ...item,
                startsAt: item.startsAt.toISOString(),
                endsAt: item.endsAt.toISOString(),
              }))}
              bufferMinutes={Number(buffer?.value) || 30}
              promotions={promotions.map((item) => ({
                ...item,
                startsAt: item.startsAt.toISOString(),
                endsAt: item.endsAt.toISOString(),
              }))}
            />
          </section>
          <ClientNotifications
            initial={notifications.map((item) => ({
              ...item,
              createdAt: item.createdAt.toISOString(),
              readAt: item.readAt?.toISOString() ?? null,
            }))}
          />
          <ClientDocuments documents={docs} />
          <ProfileSettings
            client={{
              firstName: client.firstName,
              lastName: client.lastName,
              phone: client.phone,
              email: client.email,
              avatarUrl: client.avatarUrl,
            }}
          />
        </div>
      </div>
    </main>
  );
}
