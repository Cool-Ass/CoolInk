"use client";

import { useRouter } from "next/navigation";
import ConfirmButton from "@/components/admin/ConfirmButton";
import { useToast } from "@/components/admin/ToastProvider";

export default function PortfolioRowActions({
  id,
  published,
  isFirst,
  isLast,
}: {
  id: string;
  published: boolean;
  isFirst: boolean;
  isLast: boolean;
}) {
  const router = useRouter();
  const { showToast } = useToast();

  async function move(direction: "up" | "down") {
    const res = await fetch(`/api/admin/portfolio/${id}/move`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ direction }),
    });
    if (!res.ok) {
      showToast("Nie udało się zmienić kolejności.", "error");
      return;
    }
    router.refresh();
  }

  async function togglePublish() {
    const res = await fetch(`/api/admin/portfolio/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ published: !published }),
    });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.error || "Nie udało się zaktualizować.", "error");
      return;
    }
    showToast(published ? "Publikację cofnięto." : "Element opublikowany.");
    router.refresh();
  }

  async function handleDelete() {
    const res = await fetch(`/api/admin/portfolio/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.error || "Nie udało się usunąć.", "error");
      return;
    }
    showToast("Element portfolio usunięty.");
    router.refresh();
  }

  return (
    <div className="flex items-center gap-3 text-[12px]">
      <div className="flex items-center gap-1">
        <button
          onClick={() => move("up")}
          disabled={isFirst}
          aria-label="Przesuń w górę"
          className="flex h-7 w-7 items-center justify-center border border-ink-white/20 text-ink-grey transition-colors hover:border-ink-gold hover:text-ink-gold disabled:opacity-30"
        >
          ↑
        </button>
        <button
          onClick={() => move("down")}
          disabled={isLast}
          aria-label="Przesuń w dół"
          className="flex h-7 w-7 items-center justify-center border border-ink-white/20 text-ink-grey transition-colors hover:border-ink-gold hover:text-ink-gold disabled:opacity-30"
        >
          ↓
        </button>
      </div>
      <button
        onClick={togglePublish}
        className="tracking-[0.05em] text-ink-grey transition-colors hover:text-ink-gold"
      >
        {published ? "COFNIJ PUBLIKACJĘ" : "OPUBLIKUJ"}
      </button>
      <ConfirmButton
        onConfirm={handleDelete}
        label="USUŃ"
        confirmText="Usunąć ten element portfolio na stałe?"
        pendingLabel="USUWANIE…"
        className="tracking-[0.05em] text-red-400/80 transition-colors hover:text-red-400"
      />
    </div>
  );
}
