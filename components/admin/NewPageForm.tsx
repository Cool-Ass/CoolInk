"use client";

import Link from "next/link";
import AppButton from "@/components/ui/AppButton";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useToast } from "@/components/admin/ToastProvider";

function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function NewPageForm() {
  const router = useRouter();
  const { showToast } = useToast();
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, slug }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Coś poszło nie tak.");
      showToast("Strona utworzona — dodaj teraz moduły.");
      router.push(`/admin/pages/${data.page.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Coś poszło nie tak.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="studio-panel flex max-w-md flex-col gap-4">
      <label className="flex flex-col gap-2 text-[12px] tracking-[0.12em] text-ink-grey">
        TYTUŁ
        <input
          type="text"
          required
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            if (!slugTouched) setSlug(slugify(e.target.value));
          }}
          className="rounded-md border border-ink-white/20 bg-transparent px-3 py-2 text-sm text-ink-white outline-none transition-colors focus:border-ink-gold"
          placeholder="O nas"
        />
      </label>

      <label className="flex flex-col gap-2 text-[12px] tracking-[0.12em] text-ink-grey">
        ADRES URL
        <div className="flex items-center rounded-md border border-ink-white/20 focus-within:border-ink-gold">
          <span className="pl-4 text-[14px] text-ink-grey">/</span>
          <input
            type="text"
            required
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(e.target.value);
            }}
            className="min-w-0 flex-1 bg-transparent px-2 py-2 text-sm text-ink-white outline-none"
            placeholder="o-nas"
          />
        </div>
      </label>

      {error && (
        <p className="border border-red-500/40 bg-red-500/10 px-3 py-2 text-[13px] text-red-400">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <AppButton
          type="submit"
          disabled={saving}
        >
          {saving ? "TWORZENIE…" : "UTWÓRZ I EDYTUJ MODUŁY"}
        </AppButton>
        <Link href="/admin/pages" className="text-[13px] text-ink-grey transition-colors hover:text-ink-white">
          Anuluj
        </Link>
      </div>
    </form>
  );
}
