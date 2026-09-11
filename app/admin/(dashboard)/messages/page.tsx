import { prisma } from "@/lib/prisma";
import { getMessageTemplates } from "@/lib/messageTemplates";
import { requireAdminPage } from "@/lib/adminPage";
import AdminConversationInbox from "@/components/admin/AdminConversationInbox";
import MessageTemplateManager from "@/components/admin/MessageTemplateManager";

export const dynamic = "force-dynamic";

export default async function MessagesPage() {
  await requireAdminPage("operations.manage");
  const [messages, conversations, directConversations, templates] = await Promise.all([
    prisma.contactMessage.findMany({ orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.tattooProject.findMany({ where: { messages: { some: {} } }, include: { client: { select: { id: true, firstName: true, lastName: true } }, messages: { include: { attachment: { select: { id: true, caption: true } } }, orderBy: { createdAt: "asc" }, take: 200 } }, orderBy: { updatedAt: "desc" }, take: 100 }),
    prisma.client.findMany({ where: { directMessages: { some: {} } }, select: { id: true, firstName: true, lastName: true, directMessages: { orderBy: { createdAt: "asc" }, take: 200 } }, orderBy: { updatedAt: "desc" }, take: 100 }),
    getMessageTemplates(),
  ]);
  return <div className="flex flex-col gap-4">
    <header className="flex flex-wrap items-end justify-between gap-3"><div><p className="studio-eyebrow">CENTRUM KOMUNIKACJI</p><h1 className="studio-page-title">Wiadomości</h1><p className="studio-page-description">Jedna skrzynka dla rozmów ogólnych i czatów przypisanych do projektów.</p></div><MessageTemplateManager initial={templates} /></header>
    <AdminConversationInbox templates={templates} conversations={[...directConversations.map((client) => ({ id: `direct-${client.id}`, title: "Wiadomość ogólna", kind: "direct", clientId: client.id, clientName: `${client.firstName} ${client.lastName}`, apiPath: `/api/admin/clients/${client.id}/messages`, messages: client.directMessages.map((message) => ({ id: message.id, author: message.author, body: message.body, createdAt: message.createdAt.toISOString(), readAt: message.readAt?.toISOString() ?? null, attachment: null })) })), ...conversations.map((project) => ({ id: project.id, title: project.title, kind: project.kind, clientId: project.client.id, clientName: `${project.client.firstName} ${project.client.lastName}`, projectId: project.id, messages: project.messages.map((message) => ({ id: message.id, author: message.author, body: message.body, createdAt: message.createdAt.toISOString(), readAt: message.readAt?.toISOString() ?? null, attachment: message.attachment ? { ...message.attachment, url: `/api/admin/images/${message.attachment.id}` } : null })) }))]} />
    {messages.length > 0 && <section><p className="text-xs tracking-widest text-ink-gold">ARCHIWALNE ZAPYTANIA Z FORMULARZA</p><div className="mt-4 grid gap-4 lg:grid-cols-2">{messages.map((item) => <article key={item.id} className="border border-ink-white/10 bg-ink-charcoal/30 p-5"><div className="flex flex-wrap items-baseline justify-between gap-2"><h2 className="text-sm text-ink-white">{item.subject || "Bez tematu"}</h2><time className="text-xs text-ink-grey">{item.createdAt.toLocaleString("pl-PL")}</time></div><p className="mt-1 text-sm text-ink-gold">{item.name} · <a href={`mailto:${item.email}`} className="hover:text-ink-gold-bright">{item.email}</a></p><p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-ink-grey">{item.message}</p></article>)}</div></section>}
  </div>;
}
