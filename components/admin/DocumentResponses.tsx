"use client";
import { useEffect, useState } from "react";
import AppModal from "@/components/ui/AppModal";
import type { DocumentField, DocumentAnswers } from "@/lib/documentForms";
import { formatCoolinkDateTime } from "@/lib/dateTime";
type ResponseItem = { id: string; client: string; version: number; acceptedAt: string; fields: DocumentField[]; answers: DocumentAnswers };
export default function DocumentResponses({ id, title, onClose }: { id: string; title: string; onClose: () => void }) {
  const [items, setItems] = useState<ResponseItem[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { let alive = true; void fetch(`/api/admin/documents/${id}/responses`, { cache: "no-store" }).then(async (response) => { if (!response.ok) throw new Error("Nie udało się pobrać odpowiedzi."); const data = await response.json(); if (alive) setItems(data.responses); }).catch((error: Error) => { if (alive) setError(error.message); }); return () => { alive = false; }; }, [id]);
  return <AppModal title={`Odpowiedzi: ${title}`} subtitle="Ostatnie 200 akceptacji · odpowiedzi zgodne z zaakceptowaną wersją" onClose={onClose}><div className="space-y-3">{error && <p role="alert">{error}</p>}{!items && !error && <p>Wczytywanie…</p>}{items?.length === 0 && <p>Brak odpowiedzi.</p>}{items?.map((item) => <article key={item.id} className="rounded border border-ink-white/10 p-3"><h3 className="text-sm">{item.client}</h3><p className="text-xs text-ink-grey">Wersja {item.version} · {formatCoolinkDateTime(item.acceptedAt)}</p><dl className="mt-2 space-y-2">{item.fields.map((field) => <div key={field.id}><dt className="text-xs text-ink-grey">{field.label}</dt><dd className="whitespace-pre-wrap break-words text-sm">{Array.isArray(item.answers[field.id]) ? (item.answers[field.id] as string[]).join(", ") || "—" : item.answers[field.id] || "—"}</dd></div>)}</dl></article>)}</div></AppModal>;
}
