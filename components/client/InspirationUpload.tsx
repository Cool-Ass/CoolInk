"use client";
import { useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";

export default function InspirationUpload({ projectId }: { projectId: string }) {
  const input = useRef<HTMLInputElement>(null); const router = useRouter(); const [state, setState] = useState<"idle" | "sending" | "done">("idle"); const [error, setError] = useState("");
  async function choose(event: ChangeEvent<HTMLInputElement>) { const file = event.target.files?.[0]; if (!file) return; setError(""); setState("sending"); const data = new FormData(); data.set("file", file); try { const res = await fetch(`/api/client/projects/${projectId}/images`, { method: "POST", body: data }); const result = await res.json(); if (!res.ok) throw new Error(result.error); setState("done"); router.refresh(); } catch (reason) { setError(reason instanceof Error ? reason.message : "Nie udało się przesłać pliku."); setState("idle"); } finally { if (input.current) input.current.value = ""; } }
  return <div className="mt-5 border-t border-ink-white/10 pt-4"><input ref={input} onChange={choose} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" /><button type="button" disabled={state === "sending"} onClick={() => input.current?.click()} className="border border-ink-white/25 px-3 py-2 text-[11px] tracking-[0.09em] text-ink-grey hover:border-ink-gold hover:text-ink-gold disabled:opacity-50">{state === "sending" ? "PRZESYŁANIE…" : state === "done" ? "DODAJ KOLEJNE ZDJĘCIE" : "+ DODAJ INSPIRACJĘ"}</button><p className="mt-2 text-xs text-ink-grey/75">JPG, PNG lub WEBP · maks. 10 MB · widoczne tylko dla Ciebie i studia.</p>{error && <p role="alert" className="mt-2 text-xs text-red-300">{error}</p>}</div>;
}
