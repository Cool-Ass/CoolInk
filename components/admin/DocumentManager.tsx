"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { FilePenLine, Trash2 } from "lucide-react";
import RichTextEditor from "@/components/admin/RichTextEditor";
import { useToast } from "@/components/admin/ToastProvider";
import ActionIcon from "@/components/ui/ActionIcon";
import AppButton from "@/components/ui/AppButton";
import AppModal from "@/components/ui/AppModal";
import ConfirmModal from "@/components/ui/ConfirmModal";

const CATEGORY: Record<string, string> = {
  consent: "ZGODA",
  preparation: "PRZYGOTOWANIE",
  aftercare: "PIELĘGNACJA",
  policy: "REGULAMIN",
  other: "INNE",
};

export type ManagedDocument = {
  id: string;
  title: string;
  content: string;
  category: string;
  version: number;
  published: boolean;
  acceptanceCount: number;
};

export default function DocumentManager({ documents }: { documents: ManagedDocument[] }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [editing, setEditing] = useState<ManagedDocument | null>(null);
  const [removing, setRemoving] = useState<ManagedDocument | null>(null);
  const [busy, setBusy] = useState(false);

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!editing) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/admin/documents/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Nie udało się zapisać dokumentu.");
      showToast(body.document.version > editing.version ? `Zapisano jako wersję ${body.document.version}.` : "Dokument zapisany.");
      setEditing(null);
      router.refresh();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Nie udało się zapisać dokumentu.", "error");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!removing) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/admin/documents/${removing.id}`, { method: "DELETE" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Nie udało się usunąć dokumentu.");
      showToast("Dokument usunięty.");
      setRemoving(null);
      router.refresh();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Nie udało się usunąć dokumentu.", "error");
    } finally {
      setBusy(false);
    }
  }

  return <>
    <div className="divide-y divide-ink-white/10 border border-ink-white/10">
      {documents.length === 0 ? <p className="p-10 text-center text-sm text-ink-grey">Nie ma jeszcze dokumentów.</p> : documents.map((document) => <article key={document.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="truncate text-sm text-ink-white">{document.title}</p>
          <p className="mt-1 text-[10px] tracking-[0.08em] text-ink-gold">{CATEGORY[document.category] ?? "DOKUMENT"} · WERSJA {document.version} · {document.acceptanceCount} AKCEPTACJI</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className={`mr-1 text-[10px] tracking-[0.08em] ${document.published ? "text-ink-gold" : "text-ink-grey"}`}>{document.published ? "OPUBLIKOWANY" : "SZKIC"}</span>
          <ActionIcon icon={FilePenLine} label={`Edytuj dokument ${document.title}`} tone="gold" onClick={() => setEditing({ ...document })} />
          <ActionIcon icon={Trash2} label={`Usuń dokument ${document.title}`} tone="destructive" onClick={() => setRemoving(document)} />
        </div>
      </article>)}
    </div>

    {editing && <AppModal title="Edytuj dokument" subtitle={`Aktualna wersja ${editing.version}. Zmiana treści utworzy kolejną wersję i poprosi klientów o ponowną akceptację.`} size="lg" onClose={busy ? () => undefined : () => setEditing(null)} closeOnBackdrop={!busy}>
      <form onSubmit={save} className="grid gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-[10px] tracking-widest text-ink-grey">TYTUŁ<input required value={editing.title} onChange={(event) => setEditing({ ...editing, title: event.target.value })} className="border border-ink-white/20 bg-transparent px-3 py-2.5 text-sm text-ink-white outline-none focus:border-ink-gold" /></label>
          <label className="grid gap-2 text-[10px] tracking-widest text-ink-grey">KATEGORIA<select value={editing.category} onChange={(event) => setEditing({ ...editing, category: event.target.value })} className="border border-ink-white/20 bg-ink-black px-3 py-2.5 text-sm normal-case tracking-normal text-ink-white outline-none focus:border-ink-gold"><option value="consent">Zgoda</option><option value="preparation">Przygotowanie</option><option value="aftercare">Pielęgnacja</option><option value="policy">Regulamin</option><option value="other">Inne</option></select></label>
        </div>
        <RichTextEditor value={editing.content} onChange={(content) => setEditing({ ...editing, content })} label="TREŚĆ DOKUMENTU" />
        <label className="flex items-center gap-3 border-t border-ink-white/10 pt-4 text-sm text-ink-white"><input type="checkbox" checked={editing.published} onChange={(event) => setEditing({ ...editing, published: event.target.checked })} className="h-4 w-4 accent-[#c99a4a]" />Opublikuj dla klientów</label>
        <div className="flex justify-end gap-2"><AppButton type="button" variant="ghost" disabled={busy} onClick={() => setEditing(null)}>ANULUJ</AppButton><AppButton disabled={busy}>{busy ? "ZAPISYWANIE…" : "ZAPISZ DOKUMENT"}</AppButton></div>
      </form>
    </AppModal>}

    {removing && <ConfirmModal pending={busy} pendingLabel="Usuwanie…" onCancel={() => setRemoving(null)} onConfirm={remove} message={`Usunąć dokument „${removing.title}”? Usunięte zostaną również zapisane akceptacje (${removing.acceptanceCount}). Tej operacji nie można cofnąć.`} />}
  </>;
}
