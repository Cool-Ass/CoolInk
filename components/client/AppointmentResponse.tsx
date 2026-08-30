"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ConfirmModal from "@/components/ui/ConfirmModal";
import AppButton from "@/components/ui/AppButton";

export default function AppointmentResponse({ appointmentId }: { appointmentId: string }) {
  const router = useRouter();
  const [saving, setSaving] = useState<"accept" | "reject" | null>(null);
  const [message, setMessage] = useState("");
  const [pendingResponse, setPendingResponse] = useState<"accept" | "reject" | null>(null);

  async function respond(response: "accept" | "reject") {
    setSaving(response); setMessage("");
    try {
      const result = await fetch(`/api/client/appointments/${appointmentId}/response`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ response }) });
      const data = await result.json();
      if (!result.ok) throw new Error(data.error);
      setMessage(response === "accept" ? "Termin został potwierdzony." : "Dzięki za informację. Wrócę z kolejną propozycją.");
      router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Nie udało się zapisać odpowiedzi."); }
    finally { setSaving(null); }
  }

  return <div className="mt-4"><p className="text-xs leading-relaxed text-ink-grey">Czy ten termin Ci pasuje?</p><div className="mt-3 flex flex-wrap gap-3"><AppButton variant="primary" disabled={!!saving} onClick={() => setPendingResponse("accept")}>AKCEPTUJĘ TERMIN</AppButton><AppButton variant="ghost" disabled={!!saving} onClick={() => setPendingResponse("reject")}>TERMIN MI NIE PASUJE</AppButton></div>{message && <p role="status" className="mt-3 text-xs text-ink-gold">{message}</p>}{pendingResponse && <ConfirmModal message={pendingResponse === "accept" ? "Potwierdzić zaproponowany termin?" : "Odrzucić ten termin? Wrócimy z kolejną propozycją."} onCancel={() => setPendingResponse(null)} onConfirm={() => { const responseValue = pendingResponse; setPendingResponse(null); void respond(responseValue); }} pending={!!saving} pendingLabel="ZAPIS…" />}</div>;
}
