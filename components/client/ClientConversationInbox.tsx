"use client";

import { useState } from "react";
import ProjectChat from "@/components/projects/ProjectChat";
import EmptyState from "@/components/ui/EmptyState";

type Message = { id: string; author: string; body: string; createdAt: string; readAt: string | null; attachment: { id: string; caption: string | null; url: string } | null };
type Conversation = { id: string; title: string; kind: string; messages: Message[] };

export default function ClientConversationInbox({ conversations }: { conversations: Conversation[] }) {
  const [selectedId, setSelectedId] = useState(conversations[0]?.id ?? "");
  const selected = conversations.find((item) => item.id === selectedId) ?? conversations[0];
  if (!selected) return <EmptyState title="Nie masz jeszcze rozmów" description="Rozmowa pojawi się po utworzeniu projektu lub konsultacji." />;

  return <div className="grid min-h-[560px] overflow-hidden border border-ink-white/15 bg-ink-charcoal/20 lg:grid-cols-[280px_minmax(0,1fr)]">
    <aside className="border-b border-ink-white/10 lg:border-b-0 lg:border-r"><div className="border-b border-ink-white/10 p-4"><p className="text-xs tracking-[.14em] text-ink-gold">ROZMOWY</p></div><div className="max-h-64 overflow-y-auto lg:max-h-[620px]">{conversations.map((conversation) => {
      const last = conversation.messages.at(-1);
      const unread = conversation.messages.some((message) => message.author === "admin" && !message.readAt);
      return <button key={conversation.id} type="button" onClick={() => setSelectedId(conversation.id)} className={`w-full border-b border-ink-white/10 p-4 text-left ${selected.id === conversation.id ? "bg-ink-gold/10" : "hover:bg-ink-white/5"}`}><div className="flex items-start justify-between gap-2"><p className="text-sm text-ink-white">{conversation.title}</p>{unread && <span className="h-2 w-2 shrink-0 rounded-full bg-ink-gold" aria-label="Nowa wiadomość" />}</div><p className="mt-1 text-xs text-ink-gold">{conversation.kind === "consultation" ? "Konsultacja" : "Projekt"}</p><p className="mt-2 line-clamp-2 text-sm text-ink-grey">{last?.body || (last?.attachment ? "Załączone zdjęcie" : "Brak wiadomości")}</p></button>;
    })}</div></aside>
    <section className="min-w-0 p-4 sm:p-6"><div className="mb-5 border-b border-ink-white/10 pb-4"><p className="text-xs text-ink-gold">{selected.kind === "consultation" ? "KONSULTACJA" : "PROJEKT"}</p><h2 className="mt-1 font-display text-2xl">{selected.title}</h2></div><ProjectChat key={selected.id} projectId={selected.id} role="client" initial={selected.messages} autoFocus /></section>
  </div>;
}
