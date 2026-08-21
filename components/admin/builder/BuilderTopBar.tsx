"use client";

import Link from "next/link";

export type DeviceMode = "desktop" | "tablet" | "mobile";

interface BuilderTopBarProps {
  title: string;
  status: string;
  dirty: boolean;
  saving: boolean;
  publishing: boolean;
  device: DeviceMode;
  onDeviceChange: (d: DeviceMode) => void;
  onSaveDraft: () => void;
  onPublish: () => void;
  onUnpublish: () => void;
  onOpenSettings: () => void;
  isHomepage: boolean;
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
  device,
  onDeviceChange,
  onSaveDraft,
  onPublish,
  onUnpublish,
  onOpenSettings,
  isHomepage,
  slug,
}: BuilderTopBarProps) {
  return (
    <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-ink-white/10 bg-ink-black px-5 py-3">
      <div className="flex min-w-0 items-center gap-4">
        <Link
          href="/admin/pages"
          className="shrink-0 text-[12px] tracking-[0.05em] text-ink-grey transition-colors hover:text-ink-white"
        >
          ← Strony
        </Link>
        <div className="min-w-0">
          <p className="truncate text-[14px] text-ink-white">{title || "Bez tytułu"}</p>
          <p className="truncate text-[11px] text-ink-grey">
            {isHomepage ? "Strona główna" : `/${slug}`}
          </p>
        </div>
        <span
          className={`shrink-0 border px-2 py-0.5 text-[10px] tracking-[0.1em] ${
            status === "published"
              ? "border-ink-gold/50 text-ink-gold"
              : "border-ink-grey/40 text-ink-grey"
          }`}
        >
          {STATUS_LABELS[status] ?? status}
        </span>
        {dirty && (
          <span className="shrink-0 border border-ink-gold/40 bg-ink-gold/10 px-2 py-0.5 text-[11px] tracking-[0.05em] text-ink-gold">
            ● Zmiany czekają na zapis
          </span>
        )}
        {!dirty && !saving && (
          <span className="shrink-0 text-[11px] tracking-[0.05em] text-ink-grey/80">
            ✓ Wszystkie zmiany zapisane
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 border border-ink-white/15 p-1" role="group" aria-label="Podgląd na urządzeniach">
          {(
            [
              { mode: "desktop" as const, icon: "🖥", label: "Komputer" },
              { mode: "tablet" as const, icon: "📋", label: "Tablet" },
              { mode: "mobile" as const, icon: "📱", label: "Telefon" },
            ]
          ).map((d) => (
            <button
              key={d.mode}
              type="button"
              onClick={() => onDeviceChange(d.mode)}
              title={`Podgląd: ${d.label}`}
              aria-pressed={device === d.mode}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] transition-colors ${
                device === d.mode ? "bg-ink-gold/15 text-ink-gold" : "text-ink-grey hover:text-ink-white"
              }`}
            >
              <span aria-hidden>{d.icon}</span>
              <span className="hidden lg:inline">{d.label}</span>
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={onOpenSettings}
          className="border border-ink-white/20 px-4 py-2 text-[12px] tracking-[0.08em] text-ink-white transition-colors hover:border-ink-gold hover:text-ink-gold"
        >
          USTAWIENIA STRONY
        </button>

        <button
          type="button"
          onClick={onSaveDraft}
          disabled={saving}
          className="border border-ink-white/20 px-4 py-2 text-[12px] tracking-[0.08em] text-ink-white transition-colors hover:border-ink-gold hover:text-ink-gold disabled:opacity-50"
        >
          {saving ? "ZAPISYWANIE…" : dirty ? "ZAPISZ ZMIANY" : "ZAPISANO"}
        </button>

        {status === "published" && (
          <button
            type="button"
            onClick={onUnpublish}
            className="border border-ink-white/20 px-4 py-2 text-[12px] tracking-[0.08em] text-ink-grey transition-colors hover:border-red-400/60 hover:text-red-400"
          >
            COFNIJ PUBLIKACJĘ
          </button>
        )}

        <button
          type="button"
          onClick={onPublish}
          disabled={publishing}
          className="border border-ink-gold bg-ink-gold px-5 py-2 text-[12px] font-medium tracking-[0.08em] text-ink-black transition-colors hover:bg-ink-gold-bright disabled:opacity-50"
        >
          {publishing ? "PUBLIKOWANIE…" : "OPUBLIKUJ"}
        </button>
      </div>
    </div>
  );
}
