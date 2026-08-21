"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import ImageUploadField from "@/components/admin/ImageUploadField";
import { useToast } from "@/components/admin/ToastProvider";

export interface PortfolioFormData {
  id?: string;
  title: string;
  description: string;
  imageUrl: string;
  category: string;
  tags: string;
  published: boolean;
}

export default function PortfolioForm({
  initial,
  onSaved,
}: {
  initial?: Partial<PortfolioFormData>;
  onSaved?: () => void;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const isEdit = Boolean(initial?.id);

  const [form, setForm] = useState<PortfolioFormData>({
    title: initial?.title ?? "",
    description: initial?.description ?? "",
    imageUrl: initial?.imageUrl ?? "",
    category: initial?.category ?? "",
    tags: initial?.tags ?? "",
    published: initial?.published ?? true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.imageUrl) {
      setError("Najpierw prześlij obraz.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(
        isEdit ? `/api/admin/portfolio/${initial!.id}` : "/api/admin/portfolio",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Coś poszło nie tak.");
      showToast(isEdit ? "Element portfolio zaktualizowany." : "Element dodany do portfolio.");
      if (onSaved) {
        onSaved();
      } else {
        router.push("/admin/portfolio");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Coś poszło nie tak.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-2xl flex-col gap-6">
      <ImageUploadField
        label="OBRAZ"
        value={form.imageUrl}
        onChange={(url) => setForm((f) => ({ ...f, imageUrl: url }))}
      />

      <label className="flex flex-col gap-2 text-[12px] tracking-[0.12em] text-ink-grey">
        TYTUŁ
        <input
          type="text"
          required
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          className="border border-ink-white/20 bg-transparent px-4 py-3 text-[14px] text-ink-white outline-none transition-colors focus:border-ink-gold"
          placeholder="Ryczący tygrys"
        />
      </label>

      <label className="flex flex-col gap-2 text-[12px] tracking-[0.12em] text-ink-grey">
        OPIS
        <textarea
          rows={3}
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          className="resize-y border border-ink-white/20 bg-transparent px-4 py-3 text-[14px] text-ink-white outline-none transition-colors focus:border-ink-gold"
          placeholder="Kontrastowy portret tygrysa w realizmie."
        />
      </label>

      <div className="grid gap-6 sm:grid-cols-2">
        <label className="flex flex-col gap-2 text-[12px] tracking-[0.12em] text-ink-grey">
          KATEGORIA
          <input
            type="text"
            value={form.category}
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            className="border border-ink-white/20 bg-transparent px-4 py-3 text-[14px] text-ink-white outline-none transition-colors focus:border-ink-gold"
            placeholder="Realizm"
          />
        </label>
        <label className="flex flex-col gap-2 text-[12px] tracking-[0.12em] text-ink-grey">
          TAGI (oddzielone przecinkami)
          <input
            type="text"
            value={form.tags}
            onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
            className="border border-ink-white/20 bg-transparent px-4 py-3 text-[14px] text-ink-white outline-none transition-colors focus:border-ink-gold"
            placeholder="realizm, zwierzęta, czarno-szare"
          />
        </label>
      </div>

      <label className="flex items-center gap-3 text-[13px] text-ink-white">
        <input
          type="checkbox"
          checked={form.published}
          onChange={(e) => setForm((f) => ({ ...f, published: e.target.checked }))}
          className="h-4 w-4 accent-[#c99a4a]"
        />
        Opublikowany (widoczny w publicznym portfolio)
      </label>

      {error && (
        <p className="border border-red-500/40 bg-red-500/10 px-3 py-2 text-[13px] text-red-400">
          {error}
        </p>
      )}

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 border border-ink-gold px-6 py-3.5 text-[13px] font-medium tracking-[0.08em] text-ink-gold transition-colors hover:bg-ink-gold hover:text-ink-black disabled:opacity-50"
        >
          {saving ? "ZAPISYWANIE…" : isEdit ? "ZAPISZ ZMIANY" : "DODAJ DO PORTFOLIO"}
        </button>
        {!onSaved && (
          <a href="/admin/portfolio" className="text-[13px] text-ink-grey transition-colors hover:text-ink-white">
            Anuluj
          </a>
        )}
      </div>
    </form>
  );
}
