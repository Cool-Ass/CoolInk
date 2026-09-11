"use client";

import { useEffect, useState } from "react";
import { History, RotateCcw, X } from "lucide-react";
import type { Module } from "@/lib/modules";

interface RevisionSummary {
  id: string;
  version: number;
  title: string;
  slug: string;
  createdAt: string;
}

export default function PageVersionsPanel({
  pageId,
  restoreBlocked,
  onRestore,
  onClose,
}: {
  pageId: string;
  restoreBlocked: boolean;
  onRestore: (modules: Module[], version: number) => void;
  onClose: () => void;
}) {
  const [revisions, setRevisions] = useState<RevisionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [restoringId, setRestoringId] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/admin/pages/${pageId}/revisions`, { signal: controller.signal })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Nie udało się pobrać wersji.");
        setRevisions(Array.isArray(data.revisions) ? data.revisions : []);
      })
      .catch((reason) => {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        setError(reason instanceof Error ? reason.message : "Nie udało się pobrać wersji.");
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [pageId]);

  async function restore(revision: RevisionSummary) {
    if (restoreBlocked) return;
    if (!window.confirm(`Przywrócić wersję ${revision.version} jako szkic? Obecny szkic zostanie zastąpiony.`)) return;
    setRestoringId(revision.id);
    setError("");
    try {
      const response = await fetch(`/api/admin/pages/${pageId}/revisions/${revision.id}/restore`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Nie udało się przywrócić wersji.");
      if (!Array.isArray(data.modules)) throw new Error("Zapisana wersja ma nieprawidłową strukturę.");
      onRestore(data.modules as Module[], revision.version);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Nie udało się przywrócić wersji.");
    } finally {
      setRestoringId(null);
    }
  }

  return (
    <aside data-lenis-prevent aria-label="Wersje opublikowane strony" className="fixed bottom-4 right-4 top-52 z-[120] flex w-[min(22rem,calc(100vw-2rem))] flex-col border border-ink-white/15 bg-[#151618]/[0.98] shadow-2xl shadow-black/70 backdrop-blur-xl sm:top-36 lg:top-28 2xl:top-20">
      <header className="flex items-center justify-between border-b border-ink-white/10 px-4 py-3">
        <div>
          <div className="flex items-center gap-2 text-[13px] font-medium text-ink-white"><History className="h-4 w-4 text-ink-gold" />WERSJE</div>
          <p className="mt-1 text-[11px] text-ink-grey">Migawki tworzone przy publikacji</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Zamknij wersje" className="flex h-9 w-9 items-center justify-center border border-ink-white/15 text-ink-grey hover:border-ink-gold hover:text-ink-gold"><X className="h-4 w-4" /></button>
      </header>

      <div className="flex-1 overflow-y-auto p-3">
        {loading && <p className="px-2 py-8 text-center text-[12px] text-ink-grey">Wczytywanie wersji…</p>}
        {error && <p role="alert" className="mb-3 border border-red-400/40 bg-red-500/10 px-3 py-2 text-[12px] leading-relaxed text-red-300">{error}</p>}
        {!loading && !error && revisions.length === 0 && (
          <div className="border border-dashed border-ink-white/15 px-4 py-8 text-center">
            <p className="text-[13px] text-ink-white">Brak zapisanych wersji</p>
            <p className="mt-2 text-[11px] leading-relaxed text-ink-grey">Pierwsza migawka powstanie przy następnym opublikowaniu strony.</p>
          </div>
        )}
        <div className="space-y-2">
          {revisions.map((revision, index) => (
            <article key={revision.id} className="border border-ink-white/12 bg-ink-black/40 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-[13px] text-ink-white">Wersja {revision.version}{index === 0 ? " · najnowsza" : ""}</p>
                  <p className="mt-1 text-[11px] text-ink-grey">{new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium", timeStyle: "short" }).format(new Date(revision.createdAt))}</p>
                </div>
                <button type="button" onClick={() => restore(revision)} disabled={Boolean(restoringId) || restoreBlocked} title={restoreBlocked ? "Poczekaj na zapisanie bieżącego szkicu" : "Przywróć tę wersję jako szkic"} className="flex min-h-9 shrink-0 items-center gap-1.5 border border-ink-gold/45 px-2.5 text-[10px] tracking-[0.06em] text-ink-gold hover:bg-ink-gold/10 disabled:opacity-40">
                  <RotateCcw className="h-3.5 w-3.5" />
                  {restoringId === revision.id ? "PRZYWRACAM…" : "PRZYWRÓĆ"}
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>

      <p className="border-t border-ink-white/10 px-4 py-3 text-[11px] leading-relaxed text-ink-grey">{restoreBlocked ? "Poczekaj na autozapis bieżących zmian." : "Przywrócenie zmienia tylko szkic. Strona publiczna pozostaje bez zmian do ponownej publikacji."}</p>
    </aside>
  );
}
