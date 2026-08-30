import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function MessagesPage() {
  const [messages, conversations] = await Promise.all([
    prisma.contactMessage.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.tattooProject.findMany({ where: { messages: { some: {} } }, include: { client: { select: { id: true, firstName: true, lastName: true } }, messages: { orderBy: { createdAt: "desc" }, take: 1 } }, orderBy: { updatedAt: "desc" } }),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="mb-2 text-[13px] font-medium tracking-[0.3em] text-ink-gold">WIADOMOŚCI</p>
        <h1 className="font-display text-3xl text-ink-white">Rozmowy i zapytania</h1>
      </div>
      <section><p className="text-[11px] tracking-widest text-ink-gold">ROZMOWY Z KLIENTAMI</p>{conversations.length === 0 ? <p className="mt-4 text-sm text-ink-grey">Nie ma jeszcze rozmów projektowych.</p> : <div className="mt-4 grid gap-3 md:grid-cols-2">{conversations.map((project) => <a key={project.id} href={`/admin/clients/${project.client.id}`} className="border border-ink-white/10 bg-ink-charcoal/30 p-4 hover:border-ink-gold"><p className="text-sm">{project.client.firstName} {project.client.lastName}</p><p className="mt-1 text-xs text-ink-gold">{project.title}</p><p className="mt-3 line-clamp-2 text-xs text-ink-grey">{project.messages[0]?.body || "Załączona inspiracja"}</p></a>)}</div>}</section>
      <section><p className="text-[11px] tracking-widest text-ink-gold">ZAPYTANIA Z FORMULARZA</p>
      {messages.length === 0 ? (
        <p className="border border-dashed border-ink-white/15 px-6 py-10 text-center text-[14px] text-ink-grey">
          Nie ma jeszcze żadnych wiadomości.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {messages.map((item) => (
            <article key={item.id} className="border border-ink-white/10 bg-ink-charcoal/30 p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-[15px] text-ink-white">{item.subject || "Bez tematu"}</h2>
                <time className="text-[11px] text-ink-grey">{item.createdAt.toLocaleString("pl-PL")}</time>
              </div>
              <p className="mt-1 text-[13px] text-ink-gold">{item.name} · <a href={`mailto:${item.email}`} className="hover:text-ink-gold-bright">{item.email}</a></p>
              <p className="mt-4 whitespace-pre-wrap text-[14px] leading-relaxed text-ink-grey">{item.message}</p>
            </article>
          ))}
        </div>
      )}</section>
    </div>
  );
}
