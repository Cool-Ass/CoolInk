"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import AppButton from "@/components/ui/AppButton";
import ClientAnnouncements from "@/components/client/ClientAnnouncements";
import { announcementActive, type Announcement } from "@/lib/announcementRules";
import AnnouncementEditor from "@/components/admin/AnnouncementEditor";
import AnnouncementContent from "@/components/client/AnnouncementContent";

const field = "mt-1 w-full rounded-md border border-ink-white/20 bg-ink-black px-3 py-2 text-sm text-ink-white focus-visible:outline-2 focus-visible:outline-ink-gold";
export default function AnnouncementsManager({ initial }: { initial: Announcement[] }) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [title, setTitle] = useState(""), [body, setBody] = useState("");
  const [images, setImages] = useState<NonNullable<Announcement["images"]>>([]);
  const [uploading, setUploading] = useState(false);
  const [href, setHref] = useState("/app/portal/calendar"), [notify, setNotify] = useState(false);
  const [days, setDays] = useState(14), [pending, setPending] = useState(false), [feedback, setFeedback] = useState("");
  // Keep the same payload for a failed/ambiguous request retry, then reset after success.
  const [retry, setRetry] = useState<Omit<Announcement, "active" | "createdAt"> | null>(null);
  const preview: Announcement = { id: "preview", title: title || "Tytuł komunikatu", body: body || "Treść dla klientów", bodyFormat: "markdown", images, href, notify, active: true, createdAt: "", expiresAt: "" };
  async function publish(e: FormEvent) {
    e.preventDefault();
    if (uploading || pending) return;
    if (!window.confirm(notify ? "Opublikować komunikat wszystkim klientom i dodać go do dzwonka obecnych kont?" : "Opublikować komunikat wszystkim klientom bez powiadomienia?")) return;
    const payload = retry ?? { id: crypto.randomUUID(), title, body, bodyFormat: "markdown" as const, images, href, notify, expiresAt: new Date(Date.now() + days * 86400_000).toISOString() };
    setRetry(payload); setPending(true); setFeedback("");
    try {
      const r = await fetch("/api/admin/announcements", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await r.json();
      if (!r.ok) { if (r.status === 400 || r.status === 409) setRetry(null); throw new Error(data.error || "Nie udało się opublikować."); }
      setItems(old => [data.announcement, ...old.filter(a => a.id !== data.announcement.id)]);
      setRetry(null); setTitle(""); setBody(""); setImages([]); setFeedback("Komunikat opublikowany."); router.refresh();
    } catch(e) { setFeedback(e instanceof Error ? e.message : "Nie udało się opublikować."); }
    finally { setPending(false); }
  }
  async function disable(id: string) {
    if (!window.confirm("Wyłączyć komunikat dla wszystkich klientów i usunąć jego powiadomienia?")) return;
    setPending(true); setFeedback("");
    try {
      const r = await fetch("/api/admin/announcements", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
      if (!r.ok) throw new Error("Nie udało się wyłączyć komunikatu.");
      setItems(old => old.map(a => a.id === id ? { ...a, active: false } : a)); setFeedback("Komunikat wyłączony."); router.refresh();
    } catch(e) { setFeedback(e instanceof Error ? e.message : "Spróbuj ponownie."); }
    finally { setPending(false); }
  }
  return <>
    <div className="grid items-start gap-4 xl:grid-cols-2">
      <form onSubmit={publish} className="studio-panel flex flex-col gap-3">
        <h2 className="text-base font-semibold">Nowy komunikat</h2>
        <label className="text-xs text-ink-grey">Tytuł<input required maxLength={120} className={field} value={title} disabled={pending || !!retry} onChange={e => setTitle(e.target.value)} /></label>
        <AnnouncementEditor body={body} images={images} disabled={pending || !!retry} onBodyChange={setBody} onImagesChange={setImages} onUploading={setUploading} />
        <label className="text-xs text-ink-grey">Odnośnik<select className={field} value={href} disabled={pending || !!retry} onChange={e => setHref(e.target.value)}><option value="">Bez odnośnika</option><option value="/app/portal/calendar">Wolne terminy</option><option value="/app/portal/projects">Projekty</option><option value="/app/portal/messages">Kontakt ze studiem</option></select></label>
        <label className="text-xs text-ink-grey">Wygaśnie po dniach<input type="number" min={1} max={90} required className={field} value={days} disabled={pending || !!retry} onChange={e => setDays(Number(e.target.value))} /></label>
        <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={notify} disabled={pending || !!retry} onChange={e => setNotify(e.target.checked)} />Dodaj powiadomienie w aplikacji (dzwonek)</label>
        <p className="text-xs leading-relaxed text-ink-grey">Komunikat zobaczą także nowe konta. Dzwonek otrzymają obecne konta. Nie wysyłamy maili, SMS ani push. Klient może zamknąć komunikat.</p>
        {retry && <p className="text-xs text-amber-200">Poprzednie żądanie wymaga ponowienia. Zachowano jego treść, aby nie wysłać duplikatu.</p>}
        <AppButton type="submit" disabled={pending || uploading}>{pending ? "Zapisywanie…" : retry ? "Ponów publikację" : "Opublikuj dla klientów"}</AppButton>
      </form>
      <div><p className="studio-eyebrow mb-3">PODGLĄD KLIENTA</p><div className="pointer-events-none" inert><ClientAnnouncements initial={[preview]} /></div></div>
    </div>
    {feedback && <p role="status" className="text-sm text-ink-gold">{feedback}</p>}
    <section className="studio-panel"><h2 className="mb-3 text-base font-semibold">Historia komunikatów</h2>
      {!items.length && <p className="text-xs text-ink-grey">Brak komunikatów. Samo zapisanie zmian w aplikacji nie wysyła informacji do klientów.</p>}
      <div className="divide-y divide-ink-white/10">{items.map(a => <article key={a.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
<div className="min-w-0 flex-1"><h3 className="break-words text-sm font-medium">{a.title}</h3><div className="mt-2"><AnnouncementContent announcement={a} /></div><p className="mt-2 text-xs text-ink-gold">{announcementActive(a) ? "Aktywny" : "Wyłączony / wygasły"} · {a.notify ? "Z dzwonkiem" : "Bez dzwonka"} · do {new Date(a.expiresAt).toLocaleDateString("pl-PL")}</p></div>
        {a.active && <AppButton variant="secondary" disabled={pending} onClick={() => disable(a.id)}>Wyłącz</AppButton>}
      </article>)}</div>
    </section>
  </>;
}
