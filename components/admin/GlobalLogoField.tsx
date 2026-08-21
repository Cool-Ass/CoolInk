"use client";

import { useState } from "react";
import ImageUploadField from "@/components/admin/ImageUploadField";
import { useToast } from "@/components/admin/ToastProvider";

export default function GlobalLogoField({ initialLogoUrl }: { initialLogoUrl: string }) {
  const { showToast } = useToast();
  const [logoUrl, setLogoUrl] = useState(initialLogoUrl);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ "brand.logoUrl": logoUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Nie udało się zapisać.");
      showToast("Logo zaktualizowane wszędzie na stronie.");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Nie udało się zapisać.", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <ImageUploadField label="Logo (nagłówek, stopka, panel logowania)" value={logoUrl} onChange={setLogoUrl} />
      <button
        onClick={handleSave}
        disabled={saving}
        className="inline-flex items-center gap-2 self-start border border-ink-gold px-5 py-2.5 text-[12px] font-medium tracking-[0.08em] text-ink-gold transition-colors hover:bg-ink-gold hover:text-ink-black disabled:opacity-50"
      >
        {saving ? "ZAPISYWANIE…" : "ZAPISZ LOGO"}
      </button>
    </div>
  );
}
