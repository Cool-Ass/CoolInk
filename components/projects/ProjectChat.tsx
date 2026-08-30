"use client";

import { useRef, useState } from "react";
import AppButton from "@/components/ui/AppButton";
import EmptyState from "@/components/ui/EmptyState";

type Message = {
  id: string;
  author: string;
  body: string;
  createdAt: string;
  readAt: string | null;
  attachment: { id: string; caption: string | null; url?: string } | null;
};
const EMOJI = ["🙂", "👍", "❤️", "🔥", "🎨", "✨"];

export default function ProjectChat({
  projectId,
  initial,
  role,
}: {
  projectId: string;
  initial: Message[];
  role: "client" | "admin";
}) {
  const [messages, setMessages] = useState(initial);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const api =
    role === "admin"
      ? `/api/admin/projects/${projectId}/messages`
      : `/api/client/projects/${projectId}/messages`;

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
      className="border border-ink-white/15 bg-ink-charcoal/20 p-4 sm:p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] tracking-[.16em] text-ink-gold">
            PRYWATNA ROZMOWA
          </p>
          <h3 className="mt-1 font-display text-2xl">Wiadomości</h3>
        </div>
        <span className="border border-ink-white/15 px-2 py-1 text-[10px] text-ink-grey">
          {role === "client" ? "STUDIO" : "KLIENT"}
        </span>
      </div>
      <div
        className="mt-4 max-h-[420px] space-y-3 overflow-y-auto pr-1"
        aria-live="polite"
      >
        {messages.length === 0 ? (
          <EmptyState
            title="Zacznij rozmowę"
            description="Zapytaj o projekt albo dodaj inspirację, a studio odpowie w tym miejscu."
            icon="✦"
          />
        ) : (
          messages.map((message) => (
            <article
              key={message.id}
              className={`max-w-[90%] border p-3 text-sm ${message.author === role ? "ml-auto border-ink-gold/50 bg-ink-gold/5" : "border-ink-white/15 bg-ink-black/30"}`}
            >
              <p className="text-[10px] tracking-widest text-ink-gold">
                {message.author === "admin" ? "STUDIO" : "KLIENT"}
              </p>
              {message.body && (
                <p className="mt-1 whitespace-pre-wrap leading-relaxed text-ink-white">
                  {message.body}
                </p>
              )}
              {message.attachment && (
                <div className="mt-3 border border-ink-white/15 p-2">
                  {message.attachment.url ? (
                    <img
                      src={message.attachment.url}
                      alt={message.attachment.caption || "Inspiracja"}
                      className="max-h-56 w-full object-cover"
                    />
                  ) : (
                    <p className="text-xs text-ink-grey">
                      Klient przesłał inspirację.
                    </p>
                  )}
                  <p className="mt-1 text-[10px] text-ink-grey">
                    {message.attachment.caption || "Inspiracja"}
                  </p>
                </div>
              )}
              <p className="mt-2 text-[10px] text-ink-grey">
                {new Date(message.createdAt).toLocaleString("pl-PL", {
                  dateStyle: "short",
                  timeStyle: "short",
                })}
              </p>
            </article>
          ))
        )}
      </div>
      <div className="mt-4 border-t border-ink-white/10 pt-4">
        <div className="flex flex-wrap gap-1">
          {EMOJI.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => setText((value) => `${value}${emoji}`)}
              className="min-h-9 min-w-9 border border-ink-white/10 text-base hover:border-ink-gold"
              aria-label={`Dodaj ${emoji}`}
            >
              {emoji}
            </button>
          ))}
        </div>
        <label className="mt-3 block text-[10px] tracking-widest text-ink-grey">
          WIADOMOŚĆ
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value.slice(0, 2_000))}
            rows={3}
            placeholder="Napisz wiadomość…"
            className="mt-2 w-full resize-y border border-ink-white/20 bg-transparent p-3 text-sm text-ink-white outline-none focus:border-ink-gold"
          />
        </label>
        {error && <p className="mt-2 text-xs text-red-300">{error}</p>}
        <div className="mt-3 flex flex-wrap items-center gap-3">
          {role === "client" && (
            <>
              <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="max-w-full text-xs text-ink-grey file:mr-2 file:border file:border-ink-white/20 file:bg-transparent file:px-2 file:py-1 file:text-ink-grey"
              />
              <AppButton
                type="button"
                variant="secondary"
                disabled={sending}
                onClick={upload}
              >
                DODAJ INSPIRACJĘ
              </AppButton>
            </>
          )}
          <AppButton
            type="button"
            disabled={sending || !text.trim()}
            onClick={send}
          >
            {sending ? "WYSYŁANIE…" : "WYŚLIJ"}
          </AppButton>
        </div>
      </div>
    </section>
  );
}
