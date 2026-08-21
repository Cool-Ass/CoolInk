"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import ConfirmButton from "@/components/admin/ConfirmButton";
import { useToast } from "@/components/admin/ToastProvider";

interface NavItem {
  id: string;
  label: string;
  href: string;
}

export default function NavItemManager({ initialItems }: { initialItems: NavItem[] }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [items, setItems] = useState(initialItems);
  const [label, setLabel] = useState("");
  const [href, setHref] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (!label || !href) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/nav", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label, href }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Nie udało się dodać linku.");
      setItems((i) => [...i, data.item]);
      setLabel("");
      setHref("");
      showToast("Link dodany.");
      router.refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Nie udało się dodać linku.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/admin/nav/${id}`, { method: "DELETE" });
    if (!res.ok) {
      showToast("Nie udało się usunąć.", "error");
      return;
    }
    setItems((i) => i.filter((item) => item.id !== id));
    showToast("Link usunięty.");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-5">
      {items.length > 0 && (
        <div className="flex flex-col divide-y divide-ink-white/10 border border-ink-white/10">
          {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-4 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-[13px] text-ink-white">{item.label}</p>
                <p className="truncate text-[11px] text-ink-grey">{item.href}</p>
              </div>
              <ConfirmButton
                onConfirm={() => handleDelete(item.id)}
                label="USUŃ"
                confirmText="Usunąć ten link z nawigacji?"
                className="shrink-0 text-[11px] tracking-[0.05em] text-red-400/80 transition-colors hover:text-red-400"
              />
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-3">
        <label className="flex flex-1 min-w-[140px] flex-col gap-2 text-[11px] tracking-[0.1em] text-ink-grey">
          ETYKIETA
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Rezerwacja"
            className="border border-ink-white/20 bg-transparent px-3 py-2.5 text-[13px] text-ink-white outline-none focus:border-ink-gold"
          />
        </label>
        <label className="flex flex-1 min-w-[160px] flex-col gap-2 text-[11px] tracking-[0.1em] text-ink-grey">
          LINK (URL)
          <input
            type="text"
            value={href}
            onChange={(e) => setHref(e.target.value)}
            placeholder="https://... lub /adres-strony"
            className="border border-ink-white/20 bg-transparent px-3 py-2.5 text-[13px] text-ink-white outline-none focus:border-ink-gold"
          />
        </label>
        <button
          type="submit"
          disabled={saving}
          className="border border-ink-gold px-5 py-2.5 text-[12px] font-medium tracking-[0.08em] text-ink-gold transition-colors hover:bg-ink-gold hover:text-ink-black disabled:opacity-50"
        >
          {saving ? "DODAWANIE…" : "DODAJ LINK"}
        </button>
      </form>
    </div>
  );
}
