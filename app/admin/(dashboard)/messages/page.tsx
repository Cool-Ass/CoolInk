import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function MessagesPage() {
  const messages = await prisma.contactMessage.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="mb-2 text-[13px] font-medium tracking-[0.3em] text-ink-gold">WIADOMOŚCI</p>
        <h1 className="font-display text-3xl text-ink-white">Zapytania z formularza</h1>
      </div>
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
      )}
    </div>
  );
}
