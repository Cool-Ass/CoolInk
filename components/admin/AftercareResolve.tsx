"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import ConfirmModal from "@/components/ui/ConfirmModal";
export default function AftercareResolve({ id, requestedAt }: { id: string; requestedAt: string }) {
  const [confirm, setConfirm] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState(""); const router = useRouter();
  async function resolve() { setBusy(true); setError(""); try { const response = await fetch(`/api/admin/aftercare/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ expectedRequestedAt: requestedAt }) }); const result = await response.json(); if (!response.ok) throw Error(result.error); setConfirm(false); router.refresh(); } catch (reason) { setError(reason instanceof Error ? reason.message : "Błąd zapisu."); } finally { setBusy(false); } }
  return <div><button onClick={() => setConfirm(true)} className="studio-primary-link">Oznacz konsultację jako obsłużoną</button><p role="status" className="text-sm text-red-300">{error}</p>{confirm && <ConfirmModal pending={busy} message="Zamknąć zgłoszenie konsultacji po sesji? Historia rozmowy pozostanie zachowana." onConfirm={() => void resolve()} onCancel={() => setConfirm(false)} />}</div>;
}
