"use client";

import { useState } from "react";
import Link from "next/link";
import { FolderKanban, MessageSquare, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import ActionIcon from "@/components/ui/ActionIcon";
import ConfirmModal from "@/components/ui/ConfirmModal";
import AppDrawer from "@/components/ui/AppDrawer";
import { useToast } from "@/components/admin/ToastProvider";

type ClientListItem = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  tags: string;
  projectCount: number;
  stamps: number;
};

export default function AdminClientList({ clients, canDeleteClients }: { clients: ClientListItem[]; canDeleteClients: boolean }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [visibleClients, setVisibleClients] = useState(clients);
  const [clientToDelete, setClientToDelete] = useState<ClientListItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [query, setQuery] = useState("");
  const [onlyProjects, setOnlyProjects] = useState(false);
  const [preview, setPreview] = useState<ClientListItem | null>(null);
  const filteredClients = visibleClients.filter((client) => (!onlyProjects || client.projectCount > 0) && `${client.firstName} ${client.lastName} ${client.email} ${client.phone ?? ""} ${client.tags}`.toLocaleLowerCase("pl-PL").includes(query.trim().toLocaleLowerCase("pl-PL")));

  async function removeClient() {
    if (!clientToDelete) return;
    setDeleting(true);
    try {
      const response = await fetch(`/api/admin/clients/${clientToDelete.id}`, { method: "DELETE" });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Nie udało się usunąć klienta.");
      setVisibleClients((items) => items.filter((item) => item.id !== clientToDelete.id));
      showToast("Konto klienta zostało usunięte.");
      setClientToDelete(null);
      router.refresh();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Nie udało się usunąć klienta.", "error");
    } finally {
      setDeleting(false);
    }
  }

  if (!visibleClients.length) {
    return <div className="studio-panel p-8 text-center text-sm text-ink-grey">Nie ma jeszcze klientów. Dodaj pierwszego klienta, aby rozpocząć pracę z CRM.</div>;
  }

  return <div className="studio-panel overflow-hidden p-0">
    <div className="flex flex-wrap items-center gap-3 border-b border-ink-white/10 p-3">
      <label className="min-w-0 flex-1"><span className="sr-only">Szukaj klienta</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Szukaj po nazwisku, e-mailu, telefonie…" className="w-full border border-ink-white/15 bg-ink-black px-3 py-2 text-sm" /></label>
      <label className="flex items-center gap-2 text-xs text-ink-grey"><input type="checkbox" checked={onlyProjects} onChange={(event) => setOnlyProjects(event.target.checked)} />Z projektami</label>
      <span aria-live="polite" className="text-xs text-ink-grey">{filteredClients.length} wyników</span>
    </div>
    <div className="divide-y divide-ink-white/10">
      {filteredClients.map((client) => {
        const fullName = `${client.firstName} ${client.lastName}`;
        return <article key={client.id} className="flex items-center gap-3 px-3 py-2.5 sm:px-4">
          <button type="button" onClick={() => setPreview(client)} className="min-w-0 flex-1 text-left">
            <span className="text-sm text-ink-white transition-colors hover:text-ink-gold">{fullName}</span>
            <span className="mt-0.5 block truncate text-[11px] text-ink-grey">{client.email}{client.phone ? ` · ${client.phone}` : ""}</span>
            {client.tags && <span className="mt-0.5 block truncate text-[10px] text-ink-gold">{client.tags}</span>}
          </button>
          <div className="max-w-28 shrink-0 text-right"><span className="hidden text-[10px] text-ink-grey sm:block">{client.projectCount} {client.projectCount === 1 ? "projekt" : "projektów"}</span><div role="img" aria-label={`${client.stamps} pieczątek`} title={`${client.stamps} pieczątek`} className="mt-1 flex flex-wrap justify-end gap-1">{Array.from({ length: Math.min(10, client.stamps) }, (_, index) => <span key={index} className="h-2 w-2 rounded-full bg-ink-gold" />)}{client.stamps > 10 && <span className="text-[10px] text-ink-gold">+{client.stamps - 10}</span>}</div></div>
          <div className="flex shrink-0 items-center gap-1.5">
            <ActionIcon icon={FolderKanban} label={`Otwórz projekty klienta ${fullName}`} href={`/admin/clients/${client.id}?view=projects`} />
            <ActionIcon icon={MessageSquare} label={`Wyślij wiadomość do ${fullName}`} tone="gold" href={`/admin/clients/${client.id}?view=messages`} />
            {canDeleteClients && <ActionIcon icon={Trash2} label={`Usuń klienta ${fullName}`} tone="destructive" onClick={() => setClientToDelete(client)} />}
          </div>
        </article>;
      })}
      {!filteredClients.length && <p className="p-6 text-center text-sm text-ink-grey">Brak pasujących klientów. Zmień wyszukiwanie lub filtr.</p>}
    </div>
    {preview && <AppDrawer title={`${preview.firstName} ${preview.lastName}`} subtitle="Szybki podgląd klienta" onClose={() => setPreview(null)}>
      <dl className="space-y-4 text-sm"><div><dt className="text-xs text-ink-grey">E-mail</dt><dd className="mt-1 break-all">{preview.email}</dd></div><div><dt className="text-xs text-ink-grey">Telefon</dt><dd className="mt-1">{preview.phone || "Nie podano"}</dd></div><div><dt className="text-xs text-ink-grey">Projekty</dt><dd className="mt-1">{preview.projectCount}</dd></div>{preview.tags && <div><dt className="text-xs text-ink-grey">Tagi</dt><dd className="mt-1">{preview.tags}</dd></div>}</dl>
      <div className="mt-6 flex flex-wrap gap-2"><Link className="studio-primary-link" href={`/admin/clients/${preview.id}`}>Otwórz kartę klienta →</Link><Link className="rounded-lg border border-ink-white/15 px-3 py-2 text-sm" href={`/admin/clients/${preview.id}?view=messages`}>Wiadomości</Link></div>
    </AppDrawer>}
    {clientToDelete && <ConfirmModal message={`Usunąć konto ${clientToDelete.firstName} ${clientToDelete.lastName}? Operacja trwale usunie również projekty, wizyty i historię klienta.`} onCancel={() => !deleting && setClientToDelete(null)} onConfirm={removeClient} pending={deleting} pendingLabel="USUWANIE…" />}
  </div>;
}
