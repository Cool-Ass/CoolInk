"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/admin/ToastProvider";
import AppButton from "@/components/ui/AppButton";
import ConfirmModal from "@/components/ui/ConfirmModal";

type Client = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  tags: string;
};
const FIELDS = ["firstName", "lastName", "email", "phone", "tags"] as const;

export default function ClientManager({ client }: { client: Client }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [values, setValues] = useState(client);
  const [busy, setBusy] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const save = async () => {
    setBusy(true);
    try {
      const response = await fetch(`/api/admin/clients/${values.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const body = await response.json();
      if (!response.ok) throw Error(body.error);
      showToast("Dane klienta zapisane.");
      router.refresh();
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Błąd zapisu.",
        "error",
      );
    } finally {
      setBusy(false);
    }
  };
  const remove = async () => {
    setBusy(true);
    try {
      const response = await fetch(`/api/admin/clients/${values.id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw Error(body.error || "Nie udało się usunąć konta.");
      }
      showToast("Konto klienta usunięte.");
      router.push("/admin/clients");
      router.refresh();
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Błąd usuwania.",
        "error",
      );
      setBusy(false);
      setConfirmingDelete(false);
    }
  };
  return (
    <section className="border border-ink-white/15 bg-ink-charcoal/20 p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] tracking-widest text-ink-gold">
            DANE KLIENTA
          </p>
          <p className="mt-1 text-sm text-ink-grey">
            Aktualizuj dane kontaktowe i wewnętrzne tagi.
          </p>
        </div>
        <span className="border border-ink-white/15 px-2 py-1 text-[10px] tracking-widest text-ink-grey">
          KONTO KLIENTA
        </span>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {FIELDS.map((field) => (
          <label
            key={field}
            className={field === "tags" ? "sm:col-span-2" : ""}
          >
            <span className="mb-1.5 block text-[10px] tracking-widest text-ink-grey">
              {
                {
                  firstName: "IMIĘ",
                  lastName: "NAZWISKO",
                  email: "E-MAIL",
                  phone: "TELEFON",
                  tags: "TAGI",
                }[field]
              }
            </span>
            <input
              type={field === "email" ? "email" : "text"}
              value={values[field] || ""}
              onChange={(event) =>
                setValues({ ...values, [field]: event.target.value })
              }
              className="w-full border border-ink-white/20 bg-transparent px-3 py-2.5 text-sm outline-none transition-colors focus:border-ink-gold"
            />
          </label>
        ))}
      </div>
      <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-ink-white/10 pt-5">
        <AppButton type="button" disabled={busy} onClick={save}>
          {busy ? "ZAPISYWANIE…" : "ZAPISZ DANE"}
        </AppButton>
        <AppButton
          type="button"
          variant="destructive"
          disabled={busy}
          onClick={() => setConfirmingDelete(true)}
        >
          USUŃ KONTO
        </AppButton>
      </div>
      {confirmingDelete && (
        <ConfirmModal
          message="Usunięcie konta jest nieodwracalne i obejmie dane klienta, projekty oraz wizyty. Czy na pewno chcesz kontynuować?"
          onCancel={() => setConfirmingDelete(false)}
          onConfirm={remove}
          pending={busy}
          pendingLabel="USUWANIE…"
        />
      )}
    </section>
  );
}
