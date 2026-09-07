import { redirect } from "next/navigation";
import { getCurrentClient } from "@/lib/clientAuth";
import { prisma } from "@/lib/prisma";
import ClientConversationInbox from "@/components/client/ClientConversationInbox";

export const dynamic = "force-dynamic";

export default async function ClientMessagesPage() {
  const current = await getCurrentClient();
  if (!current) redirect("/app");
  const projects = await prisma.tattooProject.findMany({ where: { clientId: current.id }, select: { id: true, title: true, kind: true, messages: { include: { attachment: { select: { id: true, caption: true } } }, orderBy: { createdAt: "asc" }, take: 200 } }, orderBy: { updatedAt: "desc" } });
  return <div><p className="text-xs tracking-[.18em] text-ink-gold">WIADOMOŚCI</p><h1 className="mt-2 font-display text-4xl">Rozmowy ze studiem</h1><p className="mt-3 text-sm text-ink-grey">Wybierz projekt lub konsultację, aby zobaczyć jedną uporządkowaną rozmowę.</p><div className="mt-6"><ClientConversationInbox conversations={projects.map((project) => ({ id: project.id, title: project.title, kind: project.kind, messages: project.messages.map((message) => ({ id: message.id, author: message.author, body: message.body, createdAt: message.createdAt.toISOString(), readAt: message.readAt?.toISOString() ?? null, attachment: message.attachment ? { id: message.attachment.id, caption: message.attachment.caption, url: `/api/client/images/${message.attachment.id}` } : null })) }))} /></div></div>;
}
