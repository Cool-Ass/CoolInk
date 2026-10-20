import { serializeDirectMessage } from "@/lib/chatImage";
import { CHAT_PAGE_SIZE, chatOrder } from "@/lib/chatPagination";
import { messageRecipient, visibleMessages } from "@/lib/messageVisibility";
import { redirect } from "next/navigation";
import { getCurrentClient } from "@/lib/clientAuth";
import { prisma } from "@/lib/prisma";
import { privateImageUrl } from "@/lib/privateMedia";
import ClientConversationInbox from "@/components/client/ClientConversationInbox";

export const dynamic = "force-dynamic";

export default async function ClientMessagesPage() {
  const current = await getCurrentClient();
  if (!current) redirect("/app");
  const visible = visibleMessages(messageRecipient("client", current.id));
  const [projects, directMessages] = await Promise.all([
    prisma.tattooProject.findMany({ where: { clientId: current.id }, select: { id: true, title: true, kind: true, messages: { where: visible, include: { attachment: { select: { id: true, caption: true } } }, orderBy: chatOrder, take: CHAT_PAGE_SIZE } }, orderBy: { updatedAt: "desc" } }),
    prisma.directMessage.findMany({ where: { ...visible, clientId: current.id }, orderBy: chatOrder, take: CHAT_PAGE_SIZE }),
  ]);
  const projectConversations = projects.map((project) => ({ id: project.id, title: project.title, kind: project.kind, projectId: project.id, messages: project.messages.slice().reverse().map((message) => ({ id: message.id, author: message.author, body: message.body, createdAt: message.createdAt.toISOString(), readAt: message.readAt?.toISOString() ?? null, deliveredAt: message.deliveredAt?.toISOString() ?? null, attachment: message.attachment ? { id: message.attachment.id, caption: message.attachment.caption, url: privateImageUrl(message.attachment.id, "client", current.id) } : null })) }));
  const conversations = [{ id: "studio", title: "CoolInk Tattoo Studio", kind: "direct", apiPath: "/api/client/messages", messages: directMessages.slice().reverse().map(message => serializeDirectMessage(message, "client", current.id)) }, ...projectConversations];
  return <div><p className="studio-eyebrow">WIADOMOŚCI</p><h1 className="studio-page-title">Rozmowy ze studiem</h1><p className="studio-page-description">Wiadomość ogólna albo rozmowa dotycząca projektu.</p><div className="mt-4"><ClientConversationInbox conversations={conversations} /></div></div>;
}
