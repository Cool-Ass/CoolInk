"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/admin/ToastProvider";
import RichTextEditor from "@/components/admin/RichTextEditor";
import AppButton from "@/components/ui/AppButton";
import AppModal from "@/components/ui/AppModal";

export default function NewDocumentForm() {
  const router = useRouter();
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [values, setValues] = useState({
    title: "",
    category: "consent",
    content: "",
    published: false,
  });
  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await fetch("/api/admin/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const body = await response.json();
      if (!response.ok) throw Error(body.error);
      showToast("Dokument utworzony.");
      setOpen(false);
      setValues({
        title: "",
        category: "consent",
        content: "",
        published: false,
      });
      router.refresh();
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Nie udało się utworzyć dokumentu.",
        "error",
      );
    } finally {
      setSaving(false);
    }
  }
  return (
    <>
      <AppButton type="button" onClick={() => setOpen(true)}>
        + NOWY DOKUMENT
      </AppButton>
      {open && (
        <AppModal
          title="Nowy dokument"
          subtitle="Przygotuj treść i zdecyduj, czy ma być widoczna dla klientów."
          size="lg"
          onClose={saving ? () => undefined : () => setOpen(false)}
          closeOnBackdrop={!saving}
        >
          <form onSubmit={submit} className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-[10px] tracking-widest text-ink-grey">
                TYTUŁ
                <input
                  required
                  value={values.title}
                  onChange={(event) =>
                    setValues({ ...values, title: event.target.value })
                  }
                  className="border border-ink-white/20 bg-transparent px-3 py-2.5 text-sm text-ink-white outline-none focus:border-ink-gold"
                />
              </label>
              <label className="grid gap-2 text-[10px] tracking-widest text-ink-grey">
                KATEGORIA
                <select
                  value={values.category}
                  onChange={(event) =>
                    setValues({ ...values, category: event.target.value })
                  }
                  className="border border-ink-white/20 bg-ink-black px-3 py-2.5 text-sm normal-case tracking-normal text-ink-white outline-none focus:border-ink-gold"
                >
                  <option value="consent">Zgoda</option>
                  <option value="preparation">Przygotowanie</option>
                  <option value="aftercare">Pielęgnacja</option>
                  <option value="policy">Regulamin</option>
                  <option value="other">Inne</option>
                </select>
              </label>
            </div>
            <RichTextEditor
              value={values.content}
              onChange={(content) => setValues({ ...values, content })}
              label="TREŚĆ DOKUMENTU"
            />
            <label className="flex items-center gap-3 border-t border-ink-white/10 pt-4 text-sm text-ink-white">
              <input
                type="checkbox"
                checked={values.published}
                onChange={(event) =>
                  setValues({ ...values, published: event.target.checked })
                }
                className="h-4 w-4 accent-[#c99a4a]"
              />
              Opublikuj dla klientów
            </label>
            <div className="flex flex-wrap gap-3">
              <AppButton disabled={saving}>
                {saving ? "ZAPISYWANIE…" : "UTWÓRZ DOKUMENT"}
              </AppButton>
              <AppButton
                type="button"
                variant="ghost"
                disabled={saving}
                onClick={() => setOpen(false)}
              >
                ANULUJ
              </AppButton>
            </div>
          </form>
        </AppModal>
      )}
    </>
  );
}
