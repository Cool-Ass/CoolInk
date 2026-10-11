"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { shiftStudioDate } from "@/lib/studioWeek";
import { localDateTimeToIso, toCoolinkDateTimeInput } from "@/lib/dateTime";
export default function ContinuationReminder({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false), [date, setDate] = useState(""), [busy, setBusy] = useState(false), [error, setError] = useState("");
  return <div className="px-2 pb-3"><button className="text-xs text-ink-grey underline" type="button" onClick={() => setOpen(!open)} aria-expanded={open}>Zdecyduję później</button>{open && <form className="mt-2 flex flex-wrap items-end gap-2" onSubmit={async event => {
    event.preventDefault(); if (busy || !date) return; setBusy(true); setError("");
    try { const response = await fetch(`/api/admin/projects/${projectId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nextAction: "Kolejna sesja czy zakończenie tatuażu?", nextActionDueAt: localDateTimeToIso(date + "T09:00") }) }); const data = await response.json(); if (!response.ok) throw Error(data.error || "Nie udało się odłożyć decyzji."); setOpen(false); router.refresh(); } catch(e) { setError(e instanceof Error ? e.message : "Błąd połączenia."); } finally { setBusy(false); }
  }}><label className="text-xs">Przypomnij w dniu<input aria-label="Data decyzji o kontynuacji" type="date" min={shiftStudioDate(toCoolinkDateTimeInput(new Date()).slice(0, 10), 1)} required value={date} onChange={event => setDate(event.target.value)} className="mt-1 block rounded border border-ink-white/15 bg-ink-black p-2" /></label><button disabled={busy} className="studio-primary-link">{busy ? "Zapisywanie…" : "Odłóż decyzję"}</button>{error && <p role="alert" className="text-xs text-red-200">{error}</p>}</form>}</div>;
}
