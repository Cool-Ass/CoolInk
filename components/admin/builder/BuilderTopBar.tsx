"use client";

import Link from "next/link";
import { Eye, History, ListTree, Redo2, Undo2 } from "lucide-react";

export type DeviceMode = "desktop" | "tablet" | "mobile";

interface BuilderTopBarProps {
  title: string;
  status: string;
  dirty: boolean;
  saving: boolean;
  publishing: boolean;
  autosaveError: boolean;
  lastSavedLabel: string | null;
  device: DeviceMode;
  onDeviceChange: (d: DeviceMode) => void;
  onSaveDraft: () => void;
  onPublish: () => void;
  onUnpublish: () => void;
  onOpenSettings: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  navigatorOpen: boolean;
  onToggleNavigator: () => void;
  onPreview: () => void;
  versionsOpen: boolean;
  onToggleVersions: () => void;
  isHomepage: boolean;
  isSystemPage?: boolean;
  slug: string;
}

const STATUS_LABELS: Record<string, string> = {
  draft: "Wersja robocza",
  published: "Opublikowana",
  unpublished: "Cofnięto publikację",
};

export default function BuilderTopBar({
  title,
  status,
  dirty,
  saving,
  publishing,
  autosaveError,
  lastSavedLabel,
  device,
  onDeviceChange,
  onSaveDraft,
  onPublish,
  onUnpublish,
  onOpenSettings,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  navigatorOpen,
  onToggleNavigator,
  onPreview,
  versionsOpen,
  onToggleVersions,
  isHomepage,
  isSystemPage = false,
  slug,
}: BuilderTopBarProps) {
  return (
    <div className="flex min-h-12 shrink-0 flex-wrap items-center justify-between gap-2 border-b border-ink-white/10 bg-ink-black px-3 py-1.5">
      <div className="flex min-w-0 items-center gap-2.5">
        <Link
          href="/admin/pages"
          className="shrink-0 text-[10px] tracking-[0.04em] text-ink-grey transition-colors hover:text-ink-white"
        >
          ← Strony
        </Link>
        <div className="min-w-0">
          <p className="truncate text-[12px] text-ink-white">{title || "Bez tytułu"}</p>
          <p className="truncate text-[9px] text-ink-grey">
            {isHomepage ? "Strona główna" : isSystemPage ? "Element globalny" : `/${slug}`}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-md border px-1.5 py-0.5 text-[8px] tracking-[0.08em] ${
            status === "published"
              ? "border-ink-gold/50 text-ink-gold"
              : "border-ink-grey/40 text-ink-grey"
          }`}
        >
          {STATUS_LABELS[status] ?? status}
        </span>
        {saving && (
          <span className="shrink-0 border border-ink-gold/40 bg-ink-gold/10 px-2 py-0.5 text-[11px] tracking-[0.05em] text-ink-gold">
            Zapisuję szkic…
          </span>
        )}
        {!saving && autosaveError && (
          <span className="shrink-0 border border-red-400/50 bg-red-500/10 px-2 py-0.5 text-[11px] tracking-[0.05em] text-red-300">
            Autozapis nieudany
          </span>
        )}
        {!saving && !autosaveError && dirty && (
          <span className="shrink-0 border border-ink-gold/40 bg-ink-gold/10 px-2 py-0.5 text-[11px] tracking-[0.05em] text-ink-gold">
            Niezapisane zmiany
          </span>
        )}
        {!dirty && !saving && !autosaveError && (
          <span className="shrink-0 text-[11px] tracking-[0.05em] text-ink-grey/80">
            ✓ Szkic zapisany{lastSavedLabel ? ` · ${lastSavedLabel}` : ""}
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={onToggleNavigator}
          aria-pressed={navigatorOpen}
          className={`flex h-8 items-center gap-1.5 rounded-md border px-2 text-[9px] tracking-[0.06em] transition-colors ${navigatorOpen ? "border-ink-gold bg-ink-gold/10 text-ink-gold" : "border-ink-white/15 text-ink-grey hover:border-ink-gold hover:text-ink-gold"}`}
        >
          <ListTree className="h-3.5 w-3.5" />
          NAWIGATOR
        </button>
        <button id="builder-preview-button" type="button" onClick={onPreview} title="Podgląd aktualnych zmian bez narzędzi edycji" className="flex h-8 items-center gap-1.5 rounded-md border border-ink-white/15 px-2 text-[9px] tracking-[0.06em] text-ink-grey transition-colors hover:border-ink-gold hover:text-ink-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-ink-gold"><Eye aria-hidden className="h-3.5 w-3.5" />PODGLĄD</button>
        <button
          type="button"
          onClick={onToggleVersions}
          aria-pressed={versionsOpen}
          className={`flex h-8 items-center gap-1.5 rounded-md border px-2 text-[9px] tracking-[0.06em] transition-colors ${versionsOpen ? "border-ink-gold bg-ink-gold/10 text-ink-gold" : "border-ink-white/15 text-ink-grey hover:border-ink-gold hover:text-ink-gold"}`}
        >
          <History className="h-3.5 w-3.5" />
          WERSJE
        </button>
        <div className="flex items-center rounded-md border border-ink-white/15" role="group" aria-label="Historia zmian">
          <button type="button" onClick={onUndo} disabled={!canUndo} title="Cofnij (Ctrl+Z)" aria-label="Cofnij zmianę" className="flex h-8 w-8 items-center justify-center rounded-l-md text-ink-grey transition hover:text-ink-gold disabled:opacity-25"><Undo2 className="h-3.5 w-3.5" /></button>
          <button type="button" onClick={onRedo} disabled={!canRedo} title="Ponów (Ctrl+Shift+Z)" aria-label="Ponów zmianę" className="flex h-8 w-8 items-center justify-center rounded-r-md border-l border-ink-white/15 text-ink-grey transition hover:text-ink-gold disabled:opacity-25"><Redo2 className="h-3.5 w-3.5" /></button>
        </div>
        <div className="flex items-center gap-px rounded-md border border-ink-white/15 p-px" role="group" aria-label="Podgląd na urządzeniach">
          {(
            [
              { mode: "desktop" as const, icon: "🖥", label: "Komputer — cała szerokość" },
              { mode: "tablet" as const, icon: "📋", label: "Tablet 768 px" },
              { mode: "mobile" as const, icon: "📱", label: "Telefon 390 px" },
            ]
          ).map((d) => (
            <button
              key={d.mode}
              type="button"
              onClick={() => onDeviceChange(d.mode)}
              title={`Podgląd: ${d.label}`}
              aria-pressed={device === d.mode}
              className={`flex h-8 items-center gap-1 rounded-[4px] px-2 text-[9px] transition-colors ${
                device === d.mode ? "bg-ink-gold/15 text-ink-gold" : "text-ink-grey hover:text-ink-white"
              }`}
            >
              <span aria-hidden>{d.icon}</span>
              <span className="hidden lg:inline">{d.label}</span>
            </button>
          ))}
        </div>

        {!isSystemPage && <button
          type="button"
          onClick={onOpenSettings}
          className="h-8 rounded-md border border-ink-white/20 px-3 text-[9px] tracking-[0.06em] text-ink-white transition-colors hover:border-ink-gold hover:text-ink-gold"
        >
          USTAWIENIA STRONY
        </button>}

        <button
          type="button"
          onClick={onSaveDraft}
          disabled={saving || !dirty}
          className="h-8 rounded-md border border-ink-white/20 px-3 text-[9px] tracking-[0.06em] text-ink-white transition-colors hover:border-ink-gold hover:text-ink-gold disabled:opacity-50"
        >
          {saving ? "ZAPISYWANIE…" : dirty ? "ZAPISZ ZMIANY" : "ZAPISANO"}
        </button>

        {status === "published" && !isSystemPage && (
          <button
            type="button"
            onClick={onUnpublish}
            className="h-8 rounded-md border border-ink-white/20 px-3 text-[9px] tracking-[0.06em] text-ink-grey transition-colors hover:border-red-400/60 hover:text-red-400"
          >
            COFNIJ PUBLIKACJĘ
          </button>
        )}

        <button
          type="button"
          onClick={onPublish}
          disabled={publishing || saving}
          className="h-8 rounded-md border border-ink-gold bg-ink-gold px-3 text-[9px] font-medium tracking-[0.06em] text-ink-black transition-colors hover:bg-ink-gold-bright disabled:opacity-50"
        >
          {publishing ? "PUBLIKOWANIE…" : "OPUBLIKUJ"}
        </button>
      </div>
    </div>
  );
}
