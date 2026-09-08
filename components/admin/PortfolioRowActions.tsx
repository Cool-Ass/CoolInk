"use client";

import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Eye, EyeOff, Trash2 } from "lucide-react";
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
    <div className="flex items-center justify-between gap-2 text-[11px]">
      <div className="flex items-center gap-1">
        <button
          onClick={() => move("up")}
          disabled={isFirst}
          aria-label="Przesuń w górę"
          title="Przesuń wcześniej"
          className="flex h-8 w-8 items-center justify-center border border-ink-white/15 text-ink-grey transition-colors hover:border-ink-gold hover:text-ink-gold disabled:opacity-30"
        >
          <ArrowUp className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => move("down")}
          disabled={isLast}
          aria-label="Przesuń w dół"
          title="Przesuń później"
          className="flex h-8 w-8 items-center justify-center border border-ink-white/15 text-ink-grey transition-colors hover:border-ink-gold hover:text-ink-gold disabled:opacity-30"
        >
          <ArrowDown className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={togglePublish}
          aria-label={published ? "Cofnij publikację" : "Opublikuj"}
          title={published ? "Cofnij publikację" : "Opublikuj"}
          className="flex h-8 w-8 items-center justify-center border border-ink-white/15 text-ink-grey transition-colors hover:border-ink-gold hover:text-ink-gold"
        >
          {published ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        </button>
        <ConfirmButton
          onConfirm={handleDelete}
          label={<><Trash2 className="h-3.5 w-3.5" /><span className="sr-only">Usuń</span></>}
          confirmText="Usunąć ten element portfolio na stałe?"
          pendingLabel="USUWANIE…"
          className="flex h-8 w-8 items-center justify-center border border-red-400/20 text-red-400/75 transition-colors hover:border-red-400/60 hover:text-red-300"
        />
      </div>
    </div>
  );
}
