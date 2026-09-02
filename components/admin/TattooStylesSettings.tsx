"use client";

import { useState } from "react";
import AppButton from "@/components/ui/AppButton";
import type { TattooStyle } from "@/lib/tattooStyles";

export default function TattooStylesSettings({ initialStyles }: { initialStyles: TattooStyle[] }) {
  const [styles, setStyles] = useState(initialStyles);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const update = (id: string, patch: Partial<TattooStyle>) => setStyles((items) => items.map((item) => item.id === id ? { ...item, ...patch } : item));
  async function save() { setSaving(true); setNotice(""); try { const response = await fetch("/api/admin/tattoo-styles", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ styles }) }); const result = await response.json(); if (!response.ok) throw new Error(result.error); setStyles(result.styles); setNotice("Style zostały zapisane."); } catch (error) { setNotice(error instanceof Error ? error.message : "Nie udało się zapisać stylów."); } finally { setSaving(false); } }
  return <section className="border border-ink-white/10 bg-ink-charcoal/30 p-5 sm:p-6"><p className="text-[12px] tracking-[0.15em] text-ink-gold">STYLE TATUAŻU</p><p className="mt-2 text-sm text-ink-grey">Aktywne style są widoczne w formularzu klienta. Wyłączenie zachowuje je w historycznych projektach.</p><div className="mt-5 space-y-2">{styles.map((style) => <div key={style.id} className="grid gap-2 border border-ink-white/10 p-3 sm:grid-cols-[1fr_auto_auto]"><input value={style.label} onChange={(event) => update(style.id, { label: event.target.value })} maxLength={60} className="min-w-0 border border-ink-white/20 bg-ink-black px-3 py-2 text-sm text-ink-white" /><button type="button" onClick={() => update(style.id, { active: !style.active })} className={`border px-3 py-2 text-[10px] ${style.active ? "border-emerald-400/50 text-emerald-300" : "border-ink-white/20 text-ink-grey"}`}>{style.active ? "AKTYWNY" : "WYŁĄCZONY"}</button><button type="button" onClick={() => setStyles((items) => items.filter((item) => item.id !== style.id))} className="border border-red-400/40 px-3 py-2 text-[10px] text-red-300">USUŃ</button></div>)}</div><div className="mt-4 flex flex-wrap gap-3"><AppButton type="button" variant="ghost" onClick={() => setStyles((items) => [...items, { id: crypto.randomUUID(), label: "Nowy styl", active: true, order: items.length }])}>+ DODAJ STYL</AppButton><AppButton type="button" onClick={save} disabled={saving}>{saving ? "ZAPISYWANIE…" : "ZAPISZ STYLE"}</AppButton></div>{notice && <p role="status" className="mt-3 text-sm text-ink-grey">{notice}</p>}</section>;
}
