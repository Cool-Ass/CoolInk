"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Megaphone, X } from "lucide-react";
import type { Announcement } from "@/lib/announcementRules";
import AnnouncementContent from "@/components/client/AnnouncementContent";

export default function ClientAnnouncements({ initial }: { initial: Announcement[] }) {
  const router = useRouter();
  const [hidden, setHidden] = useState<string[]>([]);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState("");
  async function dismiss(id: string) {
    setPending(id); setError("");
    try {
      const r = await fetch("/api/client/announcements", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
      if (!r.ok) throw new Error("Nie udało się zamknąć komunikatu. Spróbuj ponownie.");
      setHidden(old => [...old, id]); router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Spróbuj ponownie."); }
    finally { setPending(null); }
  }
  return <div className="flex flex-col gap-3">
    {initial.filter(a => !hidden.includes(a.id)).map(a => <section id={`announcement-${a.id}`} key={a.id} className="studio-panel" aria-labelledby={`announcement-title-${a.id}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0"><p className="studio-eyebrow flex items-center gap-2"><Megaphone aria-hidden className="h-3.5 w-3.5" />OD STUDIA</p><h2 id={`announcement-title-${a.id}`} className="mt-2 break-words text-base font-semibold">{a.title}</h2></div>
        <button type="button" aria-label={`Zamknij komunikat: ${a.title}`} disabled={pending !== null} onClick={() => dismiss(a.id)} className="studio-icon-action border-ink-white/15 text-ink-grey hover:text-ink-white disabled:opacity-50"><X aria-hidden className="h-4 w-4" /></button>
      </div>
      <div className="mt-2"><AnnouncementContent announcement={a} /></div>
      {a.href && <Link href={a.href} className="mt-3 inline-flex min-h-9 items-center text-xs text-ink-gold hover:underline">{a.href.endsWith("calendar") ? "Sprawdź terminy" : a.href.endsWith("messages") ? "Napisz do studia" : "Zobacz projekty"} →</Link>}
    </section>)}
    {error && <p role="alert" className="text-xs text-red-300">{error}</p>}
  </div>;
}
