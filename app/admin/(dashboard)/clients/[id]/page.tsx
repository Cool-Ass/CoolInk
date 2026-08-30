import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ProjectManager from "@/components/admin/ProjectManager";
import ClientManager from "@/components/admin/ClientManager";
import ProjectSessionsManager from "@/components/admin/ProjectSessionsManager";
import ProjectChat from "@/components/projects/ProjectChat";

export const dynamic = "force-dynamic";

export default async function ClientProfile({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      projects: {
        orderBy: { updatedAt: "desc" },
        include: {
          appointments: { orderBy: { startsAt: "asc" } },
          activities: { orderBy: { createdAt: "desc" }, take: 12 },
          messages: {
            include: { attachment: { select: { id: true, caption: true } } },
            orderBy: { createdAt: "asc" },
            take: 200,
          },
        },
      },
    },
  });
  if (!client) notFound();
  return (
    <div className="flex flex-col gap-8">
      <Link href="/admin/clients" className="text-xs text-ink-grey">
        ← KLIENCI
      </Link>
      <div>
        <p className="text-[11px] tracking-widest text-ink-gold">
          PROFIL KLIENTA
        </p>
        <h1 className="mt-2 font-display text-4xl">
          {client.firstName} {client.lastName}
        </h1>
      </div>
      <ClientManager
        client={{
          id: client.id,
          firstName: client.firstName,
          lastName: client.lastName,
          email: client.email,
          phone: client.phone,
          tags: client.tags,
        }}
      />
      <section>
        <h2 className="font-display text-2xl">Projekty i zgłoszenia</h2>
        <div className="mt-5 space-y-5">
          {client.projects.map((project) => (
            <article
              key={project.id}
              className="border border-ink-white/15 p-5"
            >
              <h3 className="text-lg">{project.title}</h3>
              <p className="mt-2 text-sm text-ink-grey">
                {project.description}
              </p>
              <div className="mt-5">
                <ProjectManager
                  id={project.id}
                  clientId={client.id}
                  initialStatus={project.status}
                  initialNotes={project.internalNotes}
                  estimatedPrice={project.estimatedPrice}
                  finalPrice={project.finalPrice}
                  initialDepositStatus={project.depositStatus}
                  depositAmount={project.depositAmount}
                  depositPaymentMethod={project.depositPaymentMethod}
                />
              </div>
              <div className="mt-6 grid gap-5 xl:grid-cols-2">
                <ProjectSessionsManager sessions={project.appointments} />
                <section className="border-t border-ink-white/10 pt-5">
                  <p className="text-[11px] tracking-widest text-ink-gold">
                    HISTORIA AKTYWNOŚCI
                  </p>
                  <div className="mt-3 space-y-3">
                    {project.activities.length ? (
                      project.activities.map((activity) => (
                        <div
                          key={activity.id}
                          className="border-l border-ink-gold/50 pl-3"
                        >
                          <p className="text-sm">{activity.message}</p>
                          <p className="mt-1 text-[11px] text-ink-grey">
                            {activity.createdAt.toLocaleString("pl-PL", {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-ink-grey">
                        Historia zacznie się zapisywać od kolejnych działań.
                      </p>
                    )}
                  </div>
                </section>
              </div>
              <div className="mt-6">
                <ProjectChat
                  projectId={project.id}
                  role="admin"
                  initial={project.messages.map((message) => ({
                    id: message.id,
                    author: message.author,
                    body: message.body,
                    createdAt: message.createdAt.toISOString(),
                    readAt: message.readAt?.toISOString() ?? null,
                    attachment: message.attachment
                      ? {
                          id: message.attachment.id,
                          caption: message.attachment.caption,
                        }
                      : null,
                  }))}
                />
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
