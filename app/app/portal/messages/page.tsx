import { redirect } from "next/navigation";
import { getCurrentClient } from "@/lib/clientAuth";
import { prisma } from "@/lib/prisma";
import ClientConversationInbox from "@/components/client/ClientConversationInbox";

export const dynamic = "force-dynamic";

export default async function ClientMessagesPage() {
  const current = await getCurrentClient();
  if (!current) redirect("/app");
  const [projects, directMessages] = await Promise.all([
    prisma.tattooProject.findMany({ where: { clientId: current.id }, select: { id: true, title: true, kind: true, messages: { include: { attachment: { select: { id: true, caption: true } } }, orderBy: { createdAt: "asc" }, take: 200 } }, orderBy: { updatedAt: "desc" } }),
    prisma.directMessage.findMany({ where: { clientId: current.id, client: { directMessages: { some: { author: "admin" } } } }, orderBy: { createdAt: "asc" }, take: 200 }),
  ]);
  const projectConversations = projects.map((project) => ({ id: project.id, title: project.title, kind: project.kind, projectId: project.id, messages: project.messages.map((message) => ({ id: message.id, author: message.author, body: message.body, createdAt: message.createdAt.toISOString(), readAt: message.readAt?.toISOString() ?? null, attachment: message.attachment ? { id: message.attachment.id, caption: message.attachment.caption, url: `/api/client/images/${message.attachment.id}` } : null })) }));
  const conversations = directMessages.length ? [{ id: "studio", title: "CoolInk Tattoo Studio", kind: "direct", apiPath: "/api/client/messages", messages: directMessages.map((message) => ({ id: message.id, author: message.author, body: message.body, createdAt: message.createdAt.toISOString(), readAt: message.readAt?.toISOString() ?? null, attachment: null })) }, ...projectConversations] : projectConversations;
  return <div><p className="studio-eyebrow">WIADOMOŚCI</p><h1 className="studio-page-title">Rozmowy ze studiem</h1><p className="studio-page-description">Wiadomość ogólna albo rozmowa dotycząca projektu.</p><div className="mt-4"><ClientConversationInbox conversations={conversations} /></div></div>;
}
