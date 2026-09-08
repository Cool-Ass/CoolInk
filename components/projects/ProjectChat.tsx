"use client";

import { useEffect, useRef, useState } from "react";
import { Paperclip, Send, Smile } from "lucide-react";
import AppModal from "@/components/ui/AppModal";
import EmptyState from "@/components/ui/EmptyState";
import { imageSource } from "@/lib/imageSource";
import type { MessageTemplate } from "@/lib/messageTemplates";

type Message = {
  id: string;
  author: string;
  body: string;
  createdAt: string;
  readAt: string | null;
  attachment: { id: string; caption: string | null; url?: string } | null;
};
const EMOJI = [
  "🙂", "😊", "😂", "😍", "🤩", "😎", "👍", "👌",
  "🙌", "🤝", "💪", "🙏", "❤️", "🖤", "🔥", "✨",
  "🎨", "🖌️", "📸", "✅", "💯", "🤘", "🌙", "☀️",
];

export default function ProjectChat({
  projectId,
  initial,
  role,
  autoFocus = false,
  templates = [],
}: {
  projectId: string;
  initial: Message[];
  role: "client" | "admin";
  autoFocus?: boolean;
  templates?: MessageTemplate[];
}) {
  const [messages, setMessages] = useState(initial);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<Message["attachment"]>(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [attachmentReady, setAttachmentReady] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<HTMLDivElement>(null);
  const api =
    role === "admin"
      ? `/api/admin/projects/${projectId}/messages`
      : `/api/client/projects/${projectId}/messages`;
  const composerRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { if (autoFocus) composerRef.current?.focus(); }, [autoFocus]);
  useEffect(() => { streamRef.current?.scrollTo({ top: streamRef.current.scrollHeight, behavior: "smooth" }); }, [messages.length]);
  useEffect(() => {
    let alive = true;
    async function refreshConversation() {
      try {
        const response = await fetch(api, { cache: "no-store" });
        const result = await response.json();
        if (alive && response.ok && Array.isArray(result.messages)) setMessages(result.messages);
      } catch { /* polling is progressive enhancement; the composer still works */ }
    }
    void refreshConversation();
    const timer = window.setInterval(refreshConversation, 2500);
    return () => { alive = false; window.clearInterval(timer); };
  }, [api]);

  const add = (message: Message) => setMessages((items) => [...items, message]);
  async function send() {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setError("");
    try {
      const response = await fetch(api, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const result = await response.json();
      if (!response.ok)
        throw Error(result.error || "Nie udało się wysłać wiadomości.");
      add(result.message);
      setText("");
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Nie udało się wysłać wiadomości.",
      );
    } finally {
      setSending(false);
    }
  }
  async function upload() {
    const file = inputRef.current?.files?.[0];
    if (!file || sending || role !== "client") return;
    setSending(true);
    setError("");
    try {
      const form = new FormData();
      form.set("file", file);
      form.set("chat", "true");
      form.set("chatMessage", text.trim());
      form.set("caption", "Inspiracja przesłana w czacie");
      const response = await fetch(`/api/client/projects/${projectId}/images`, {
        method: "POST",
        body: form,
      });
      const result = await response.json();
      if (!response.ok)
        throw Error(result.error || "Nie udało się przesłać inspiracji.");
      add(result.message);
      setText("");
      if (inputRef.current) inputRef.current.value = "";
      setAttachmentReady(false);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Nie udało się przesłać inspiracji.",
      );
    } finally {
      setSending(false);
    }
  }
  return (
    <section
      id="wiadomosci"
      className="overflow-hidden border border-ink-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,.025),rgba(255,255,255,.008))]"
    >
      <div className="flex items-center justify-between gap-3 border-b border-ink-white/10 px-3 py-2.5 sm:px-4">
        <div>
          <p className="font-display text-lg">Czat</p>
          <p className="text-[9px] tracking-[.12em] text-ink-grey">PRYWATNA ROZMOWA</p>
        </div>
        <span className="flex items-center gap-1.5 text-[10px] text-emerald-300">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />{role === "client" ? "STUDIO" : "KLIENT"}
        </span>
      </div>
      <div
        ref={streamRef}
        className="max-h-[440px] min-h-56 space-y-2 overflow-y-auto px-3 py-4 sm:px-4"
        aria-live="polite"
      >
        {messages.length === 0 ? (
          <EmptyState
            title="Zacznij rozmowę"
            description="Zapytaj o projekt albo dodaj inspirację, a studio odpowie w tym miejscu."
            icon="✦"
          />
        ) : (
          messages.map((message) => {
            const attachmentSource = imageSource(message.attachment?.url);
            return <article
              key={message.id}
              className={`w-fit max-w-[88%] rounded-[16px] px-3 py-2.5 text-sm shadow-[0_8px_24px_rgba(0,0,0,.16)] sm:max-w-[72%] ${message.author === role ? "ml-auto rounded-br-[4px] bg-ink-gold text-ink-black" : "rounded-bl-[4px] bg-ink-white/[.09] text-ink-white"}`}
            >
              <p className={`text-[9px] font-semibold tracking-wider ${message.author === role ? "text-ink-black/65" : "text-ink-gold"}`}>
                {message.author === role ? "TY" : message.author === "admin" ? "STUDIO" : "KLIENT"}
              </p>
              {message.body && (
                <p className={`mt-1 whitespace-pre-wrap leading-relaxed ${message.author === role ? "text-ink-black" : "text-ink-white"}`}>
                  {message.body}
                </p>
              )}
              {message.attachment && (
                <div className={`mt-2 overflow-hidden rounded-[10px] border ${message.author === role ? "border-ink-black/20" : "border-ink-white/15"}`}>
                  {attachmentSource ? (
                    <button type="button" onClick={() => setPreview(message.attachment)} className="block w-full text-left" aria-label="Otwórz pełny podgląd inspiracji">
                    <img
                      src={attachmentSource}
                      alt={message.attachment.caption || "Inspiracja"}
                      className="max-h-56 w-full object-cover"
                    />
                    </button>
                  ) : (
                    <p className="text-xs text-ink-grey">
                      Klient przesłał inspirację.
                    </p>
                  )}
                  <p className={`px-2 py-1 text-[9px] ${message.author === role ? "text-ink-black/60" : "text-ink-grey"}`}>
                    {message.attachment.caption || "Inspiracja"}
                  </p>
                </div>
              )}
              <p className={`mt-1.5 text-right text-[9px] ${message.author === role ? "text-ink-black/55" : "text-ink-grey"}`}>
                {new Date(message.createdAt).toLocaleString("pl-PL", {
                  dateStyle: "short",
                  timeStyle: "short",
                })}
              </p>
            </article>;
          })
        )}
      </div>
      <div className="border-t border-ink-white/10 bg-ink-black/35 p-3 sm:p-4">
        {role === "admin" && templates.length > 0 && <div className="mb-2 flex gap-1.5 overflow-x-auto pb-1">{templates.map((template) => <button key={template.id} type="button" onClick={() => setText((value) => value.trim() ? `${value.trim()}\n\n${template.body}` : template.body)} className="shrink-0 rounded-full border border-ink-white/15 px-3 py-1.5 text-[10px] text-ink-grey hover:border-ink-gold hover:text-ink-gold">{template.label}</button>)}</div>}
        {showEmoji && <div className="mb-2 grid max-w-sm grid-cols-8 gap-1 rounded-[14px] border border-ink-white/10 bg-ink-black/45 p-2">
          {EMOJI.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => setText((value) => `${value}${emoji}`)}
              className="flex aspect-square min-h-8 items-center justify-center rounded-full bg-ink-white/[.06] text-sm hover:bg-ink-white/[.12]"
              aria-label={`Dodaj ${emoji}`}
            >
              {emoji}
            </button>
          ))}
        </div>}
        <label className="block">
          <span className="sr-only">Wiadomość</span>
          <textarea
            ref={composerRef}
            value={text}
            onChange={(event) => setText(event.target.value.slice(0, 2_000))}
            rows={2}
            placeholder="Napisz wiadomość…"
            onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void send(); } }}
            className="w-full resize-none rounded-[14px] border border-ink-white/15 bg-ink-black/55 px-3 py-2.5 text-sm text-ink-white outline-none focus:border-ink-gold"
          />
        </label>
        {error && <p className="mt-2 text-xs text-red-300">{error}</p>}
        <div className="mt-2 flex items-center gap-2">
          <button type="button" onClick={() => setShowEmoji((value) => !value)} aria-label="Emoji" aria-expanded={showEmoji} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-grey hover:bg-ink-white/[.06] hover:text-ink-gold"><Smile className="h-4 w-4" /></button>
          {role === "client" && (
            <>
              <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) => setAttachmentReady(Boolean(event.target.files?.[0]))}
                className="sr-only"
              />
              <button type="button" disabled={sending} onClick={() => inputRef.current?.click()} aria-label="Dodaj zdjęcie" title="Dodaj zdjęcie" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-grey hover:bg-ink-white/[.06] hover:text-ink-gold"><Paperclip className="h-4 w-4" /></button>
              {attachmentReady && <button type="button" disabled={sending} onClick={upload} className="rounded-full border border-ink-gold/50 px-3 py-2 text-[10px] text-ink-gold">WYŚLIJ ZDJĘCIE</button>}
            </>
          )}
          <button type="button" disabled={sending || !text.trim()} onClick={send} className="ml-auto flex h-9 items-center gap-2 rounded-full bg-ink-gold px-4 text-[10px] font-semibold text-ink-black disabled:opacity-40"><Send className="h-3.5 w-3.5" />{sending ? "WYSYŁANIE…" : "WYŚLIJ"}</button>
        </div>
      </div>
      {preview && <AppModal title={preview.caption || "Inspiracja"} onClose={() => setPreview(null)} size="lg"><div className="max-h-[75vh] overflow-auto">{imageSource(preview.url) ? <img src={imageSource(preview.url)!} alt={preview.caption || "Inspiracja"} className="mx-auto max-h-[70vh] w-auto max-w-full object-contain" /> : <p className="text-sm text-ink-grey">Podgląd pliku jest niedostępny.</p>}</div></AppModal>}
    </section>
  );
}
