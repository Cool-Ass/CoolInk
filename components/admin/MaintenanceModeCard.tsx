"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, PencilLine } from "lucide-react";
import { useToast } from "@/components/admin/ToastProvider";
import AppButton from "@/components/ui/AppButton";

export default function MaintenanceModeCard({
  initialEnabled,
  homepageId,
}: {
  initialEnabled: boolean;
  homepageId: string;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [enabled, setEnabled] = useState(initialEnabled);
  const [saving, setSaving] = useState(false);

  async function toggleMode() {
    const nextEnabled = !enabled;
    const confirmed = window.confirm(
      nextEnabled
        ? "Włączyć tryb budowy? Odwiedzający zobaczą ekran „Zapraszam wkrótce”, ale Ty nadal zachowasz dostęp do pełnej strony."
        : "Wyłączyć tryb budowy i ponownie pokazać odwiedzającym pełną stronę?"
    );
    if (!confirmed) return;

    setSaving(true);
    try {
      const response = await fetch("/api/admin/maintenance", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: nextEnabled }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Nie udało się zmienić trybu strony.");
      setEnabled(data.enabled);
      showToast(data.enabled ? "Tryb budowy został włączony." : "Pełna strona jest ponownie publiczna.");
      router.refresh();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Nie udało się zmienić trybu strony.", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="border border-ink-white/10 bg-ink-charcoal/40 p-5 sm:p-6" aria-labelledby="maintenance-title">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
        <div className="max-w-2xl">
          <div className="flex flex-wrap items-center gap-3">
            <p id="maintenance-title" className="text-[13px] font-medium tracking-[0.16em] text-ink-gold">
              WIDOCZNOŚĆ STRONY
            </p>
            <span
              className={`inline-flex items-center gap-2 border px-2.5 py-1 text-[11px] tracking-[0.08em] ${
                enabled
                  ? "border-amber-400/50 bg-amber-400/10 text-amber-200"
                  : "border-emerald-400/50 bg-emerald-400/10 text-emerald-200"
              }`}
              aria-live="polite"
            >
              {enabled ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              {enabled ? "TRYB BUDOWY AKTYWNY" : "STRONA PUBLICZNA"}
            </span>
          </div>
          <p className="mt-3 text-[14px] leading-relaxed text-ink-grey">
            {enabled
              ? "Odwiedzający widzą ekran „Zapraszam wkrótce”. Jako zalogowany administrator nadal widzisz pełną stronę i możesz ją edytować."
              : "Odwiedzający widzą pełną stronę. Włącz tryb budowy, gdy chcesz spokojnie przygotować większe zmiany."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/budujemy"
            target="_blank"
            className="inline-flex min-h-11 items-center gap-2 border border-ink-white/20 px-4 py-2.5 text-[12px] tracking-[0.08em] text-ink-grey transition-colors hover:border-ink-white/40 hover:text-ink-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-gold"
          >
            <Eye className="h-4 w-4" />
            PODGLĄD EKRANU BUDOWY
          </Link>
          <Link
            href={`/admin/pages/${homepageId}`}
            className="inline-flex min-h-11 items-center gap-2 border border-ink-white/25 px-4 py-2.5 text-[12px] tracking-[0.08em] text-ink-white transition-colors hover:border-ink-gold hover:text-ink-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-gold"
          >
            <PencilLine className="h-4 w-4" />
            EDYTUJ STRONĘ GŁÓWNĄ
          </Link>
          <AppButton type="button" variant={enabled ? "primary" : "secondary"} onClick={toggleMode} disabled={saving} className="min-h-11">
            {saving ? "ZAPISYWANIE…" : enabled ? "WYŁĄCZ TRYB BUDOWY" : "WŁĄCZ TRYB BUDOWY"}
          </AppButton>
        </div>
      </div>
    </section>
  );
}
