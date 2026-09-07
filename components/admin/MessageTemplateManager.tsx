"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AppButton from "@/components/ui/AppButton";
import AppModal from "@/components/ui/AppModal";
import type { MessageTemplate } from "@/lib/messageTemplates";

export default function MessageTemplateManager({ initial }: { initial: MessageTemplate[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [templates, setTemplates] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function save() {
    setSaving(true); setMessage("");
    try {
      const response = await fetch("/api/admin/message-templates", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ templates }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error);
      setTemplates(result.templates); setMessage("Szybkie odpowiedzi zostały zapisane."); router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Nie udało się zapisać odpowiedzi."); }
    finally { setSaving(false); }
  }

  return <><AppButton variant="secondary" onClick={() => setOpen(true)}>EDYTUJ SZYBKIE ODPOWIEDZI</AppButton>{open && <AppModal title="Szybkie odpowiedzi" subtitle="Gotowe teksty pojawiają się nad polem wiadomości. Możesz je jeszcze zmienić przed wysłaniem." size="lg" onClose={() => setOpen(false)} footer={<div className="flex items-center justify-between gap-3"><AppButton variant="ghost" disabled={templates.length >= 20} onClick={() => setTemplates((items) => [...items, { id: crypto.randomUUID(), label: "Nowa odpowiedź", body: "" }])}>+ DODAJ</AppButton><div className="flex gap-2"><AppButton variant="ghost" onClick={() => setOpen(false)}>ZAMKNIJ</AppButton><AppButton disabled={saving || templates.some((item) => !item.label.trim() || !item.body.trim())} onClick={save}>{saving ? "ZAPIS…" : "ZAPISZ"}</AppButton></div></div>}><div className="space-y-4">{templates.map((template, index) => <article key={template.id} className="border border-ink-white/15 p-4"><div className="flex items-start gap-3"><div className="min-w-0 flex-1 space-y-3"><label className="block text-xs text-ink-grey">NAZWA<input maxLength={80} value={template.label} onChange={(event) => setTemplates((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, label: event.target.value } : item))} className="mt-2 w-full border border-ink-white/20 bg-transparent p-3 text-sm text-ink-white" /></label><label className="block text-xs text-ink-grey">TREŚĆ<textarea rows={4} maxLength={2000} value={template.body} onChange={(event) => setTemplates((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, body: event.target.value } : item))} className="mt-2 w-full resize-y border border-ink-white/20 bg-transparent p-3 text-sm leading-relaxed text-ink-white" /></label></div><button type="button" aria-label={`Usuń ${template.label}`} onClick={() => setTemplates((items) => items.filter((_, itemIndex) => itemIndex !== index))} className="border border-red-400/30 px-3 py-2 text-xs text-red-200 hover:bg-red-400/10">USUŃ</button></div></article>)}{!templates.length && <p className="border border-dashed border-ink-white/15 p-6 text-center text-sm text-ink-grey">Dodaj pierwszą szybką odpowiedź.</p>}{message && <p role="status" className="text-sm text-ink-gold">{message}</p>}</div></AppModal>}</>;
}
