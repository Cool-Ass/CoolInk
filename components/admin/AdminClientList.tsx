"use client";

import { useState } from "react";
import Link from "next/link";
import { FolderKanban, MessageSquare, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import ActionIcon from "@/components/ui/ActionIcon";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { useToast } from "@/components/admin/ToastProvider";

type ClientListItem = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  tags: string;
  projectCount: number;
};

export default function AdminClientList({ clients, canDeleteClients }: { clients: ClientListItem[]; canDeleteClients: boolean }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [visibleClients, setVisibleClients] = useState(clients);
  const [clientToDelete, setClientToDelete] = useState<ClientListItem | null>(null);
  const [deleting, setDeleting] = useState(false);

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
    <div className="divide-y divide-ink-white/10">
      {visibleClients.map((client) => {
        const fullName = `${client.firstName} ${client.lastName}`;
        return <article key={client.id} className="flex items-center gap-3 px-3 py-2.5 sm:px-4">
          <Link href={`/admin/clients/${client.id}`} className="min-w-0 flex-1">
            <span className="text-sm text-ink-white transition-colors hover:text-ink-gold">{fullName}</span>
            <span className="mt-0.5 block truncate text-[11px] text-ink-grey">{client.email}{client.phone ? ` · ${client.phone}` : ""}</span>
            {client.tags && <span className="mt-0.5 block truncate text-[10px] text-ink-gold">{client.tags}</span>}
          </Link>
          <span className="hidden shrink-0 text-[10px] text-ink-grey lg:block">{client.projectCount} {client.projectCount === 1 ? "projekt" : "projektów"}</span>
          <div className="flex shrink-0 items-center gap-1.5">
            <ActionIcon icon={FolderKanban} label={`Otwórz projekty klienta ${fullName}`} href={`/admin/clients/${client.id}?view=projects`} />
            <ActionIcon icon={MessageSquare} label={`Wyślij wiadomość do ${fullName}`} tone="gold" href={`/admin/clients/${client.id}?view=messages`} />
            {canDeleteClients && <ActionIcon icon={Trash2} label={`Usuń klienta ${fullName}`} tone="destructive" onClick={() => setClientToDelete(client)} />}
          </div>
        </article>;
      })}
    </div>
    {clientToDelete && <ConfirmModal message={`Usunąć konto ${clientToDelete.firstName} ${clientToDelete.lastName}? Operacja trwale usunie również projekty, wizyty i historię klienta.`} onCancel={() => !deleting && setClientToDelete(null)} onConfirm={removeClient} pending={deleting} pendingLabel="USUWANIE…" />}
  </div>;
}
