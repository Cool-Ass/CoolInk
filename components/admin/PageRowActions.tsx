"use client";

import { useRouter } from "next/navigation";
import ConfirmButton from "@/components/admin/ConfirmButton";
import { useToast } from "@/components/admin/ToastProvider";

export default function PageRowActions({
  id,
  isHomepage,
}: {
  id: string;
  isHomepage: boolean;
}) {
  const router = useRouter();
  const { showToast } = useToast();

  async function handleDelete() {
    const res = await fetch(`/api/admin/pages/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.error || "Nie udało się usunąć.", "error");
      return;
    }
    showToast("Strona usunięta.");
    router.refresh();
  }

  if (isHomepage) return null;

  return (
    <ConfirmButton
      onConfirm={handleDelete}
      label="USUŃ"
      confirmText="Usunąć tę stronę na stałe? Tej operacji nie można cofnąć."
      pendingLabel="USUWANIE…"
      className="text-[12px] tracking-[0.05em] text-red-400/80 transition-colors hover:text-red-400"
    />
  );
}
