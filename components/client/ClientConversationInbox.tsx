"use client";

import { useState } from "react";
import ProjectChat from "@/components/projects/ProjectChat";
import EmptyState from "@/components/ui/EmptyState";

type Message = { id: string; author: string; body: string; createdAt: string; readAt: string | null; attachment: { id: string; caption: string | null; url: string } | null };
type Conversation = { id: string; title: string; kind: string; projectId?: string; apiPath?: string; messages: Message[] };

export default function ClientConversationInbox({ conversations }: { conversations: Conversation[] }) {
  const [selectedId, setSelectedId] = useState(conversations[0]?.id ?? "");
  const selected = conversations.find((item) => item.id === selectedId) ?? conversations[0];
  if (!selected) return <EmptyState title="Nie masz jeszcze rozmów" description="Rozmowa pojawi się po utworzeniu projektu albo po pierwszej wiadomości od studia." />;

  return <div className="grid min-h-[520px] overflow-hidden border border-ink-white/10 bg-ink-charcoal/20 md:grid-cols-[240px_minmax(0,1fr)] xl:grid-cols-[270px_minmax(0,1fr)]">
    <aside className="border-b border-ink-white/10 md:border-b-0 md:border-r"><div className="px-3 py-2.5"><p className="text-[10px] tracking-[.14em] text-ink-gold">ROZMOWY · {conversations.length}</p></div><div className="max-h-52 overflow-y-auto md:max-h-[620px]">{conversations.map((conversation) => {
      const last = conversation.messages.at(-1);
      const unread = conversation.messages.some((message) => message.author === "admin" && !message.readAt);
      return <button key={conversation.id} type="button" onClick={() => setSelectedId(conversation.id)} className={`w-full border-t border-ink-white/[.07] px-3 py-2.5 text-left ${selected.id === conversation.id ? "border-l-2 border-l-ink-gold bg-ink-gold/10" : "border-l-2 border-l-transparent hover:bg-ink-white/5"}`}><div className="flex items-start justify-between gap-2"><p className="text-xs text-ink-white">{conversation.title}</p>{unread && <span className="h-2 w-2 shrink-0 rounded-full bg-ink-gold" aria-label="Nowa wiadomość" />}</div><p className="mt-1 text-[9px] text-ink-gold">{conversation.kind === "direct" ? "Wiadomość ogólna" : conversation.kind === "consultation" ? "Konsultacja" : "Projekt"}</p><p className="mt-1 line-clamp-1 text-[11px] text-ink-grey">{last?.body || (last?.attachment ? "Załączone zdjęcie" : "Brak wiadomości")}</p></button>;
    })}</div></aside>
    <section className="min-w-0 p-2.5 sm:p-3"><div className="mb-2 flex items-center justify-between gap-3 px-1"><h2 className="truncate font-display text-xl">{selected.title}</h2><span className="text-[9px] text-ink-gold">{selected.kind === "direct" ? "OGÓLNA" : selected.kind === "consultation" ? "KONSULTACJA" : "PROJEKT"}</span></div><ProjectChat key={selected.id} projectId={selected.projectId} apiPath={selected.apiPath} role="client" initial={selected.messages} autoFocus title={selected.kind === "direct" ? "Rozmowa ze studiem" : "Czat"} subtitle={selected.kind === "direct" ? "WIADOMOŚĆ OGÓLNA" : "PRYWATNA ROZMOWA"} allowAttachments={selected.kind !== "direct"} emptyDescription={selected.kind === "direct" ? "Odpowiedz na wiadomość studia." : undefined} /></section>
  </div>;
}
